package com.casa.dashboard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors

class LocationForegroundService : Service() {
  companion object {
    const val ACTION_START = "com.casa.dashboard.location.START"
    const val ACTION_STOP = "com.casa.dashboard.location.STOP"
    private const val CHANNEL_ID = "casa_location"
    private const val NOTIFICATION_ID = 7101
    private const val MIN_INTERVAL_MS = 60_000L
    private const val MIN_DISTANCE_M = 50f
  }

  private val fused by lazy { LocationServices.getFusedLocationProviderClient(this) }
  private val executor = Executors.newSingleThreadExecutor()
  private var lastSentAt = 0L
  private var lastLat: Double? = null
  private var lastLon: Double? = null

  private val callback = object : LocationCallback() {
    override fun onLocationResult(result: LocationResult) {
      val location = result.lastLocation ?: return
      maybeReport(location)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopUpdates()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        return START_NOT_STICKY
      }
      else -> {
        startAsForeground()
        startUpdates()
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    stopUpdates()
    executor.shutdownNow()
    super.onDestroy()
  }

  private fun startAsForeground() {
    createChannel()
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Location sharing",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Reports this device location to Home Assistant"
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(): Notification {
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val pending = PendingIntent.getActivity(
      this,
      0,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Casa is sharing location")
      .setContentText("Home Assistant is receiving GPS updates")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentIntent(pending)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .build()
  }

  private fun startUpdates() {
    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 30_000L)
      .setMinUpdateIntervalMillis(15_000L)
      .setMinUpdateDistanceMeters(25f)
      .setWaitForAccurateLocation(false)
      .build()

    try {
      fused.requestLocationUpdates(request, callback, Looper.getMainLooper())
    } catch (_: SecurityException) {
      stopSelf()
    }
  }

  private fun stopUpdates() {
    fused.removeLocationUpdates(callback)
  }

  private fun maybeReport(location: Location) {
    if (location.accuracy > 500f) return

    val now = System.currentTimeMillis()
    val lat = location.latitude
    val lon = location.longitude
    val moved = if (lastLat != null && lastLon != null) {
      val results = FloatArray(1)
      Location.distanceBetween(lastLat!!, lastLon!!, lat, lon, results)
      results[0]
    } else {
      Float.MAX_VALUE
    }

    val dueByTime = now - lastSentAt >= MIN_INTERVAL_MS
    val dueByDistance = moved >= MIN_DISTANCE_M
    if (!dueByTime && !dueByDistance && lastSentAt != 0L) return

    lastSentAt = now
    lastLat = lat
    lastLon = lon
    executor.execute { postSee(location) }
  }

  private fun postSee(location: Location) {
    val creds = LocationCredentialStore.load(this) ?: return
    val battery = readBatteryPercent()
    val body = JSONObject().apply {
      put("dev_id", creds.deviceId)
      put("gps", JSONArray().put(location.latitude).put(location.longitude))
      put("gps_accuracy", location.accuracy.toInt())
      put("host_name", "Casa Android")
      if (battery != null) put("battery", battery)
    }

    val ok = postService(creds, body.toString())
    if (!ok) {
      val refreshed = refreshToken(creds)
      if (refreshed != null) {
        LocationCredentialStore.updateAccessToken(this, refreshed)
        postService(creds.copy(accessToken = refreshed), body.toString())
      }
    }
  }

  private fun postService(
    creds: LocationCredentialStore.Credentials,
    body: String,
  ): Boolean {
    return try {
      val url = URL("${creds.haUrl}/api/services/device_tracker/see")
      val conn = (url.openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"
        setRequestProperty("Authorization", "Bearer ${creds.accessToken}")
        setRequestProperty("Content-Type", "application/json")
        doOutput = true
        connectTimeout = 15_000
        readTimeout = 15_000
      }
      OutputStreamWriter(conn.outputStream).use { it.write(body) }
      val code = conn.responseCode
      conn.disconnect()
      code in 200..299
    } catch (_: Exception) {
      false
    }
  }

  private fun refreshToken(creds: LocationCredentialStore.Credentials): String? {
    if (creds.refreshToken.isBlank()) return null
    return try {
      val url = URL("${creds.haUrl}/auth/token")
      val form = listOf(
        "grant_type" to "refresh_token",
        "refresh_token" to creds.refreshToken,
        "client_id" to creds.clientId,
      ).joinToString("&") { (k, v) ->
        "${URLEncoder.encode(k, "UTF-8")}=${URLEncoder.encode(v, "UTF-8")}"
      }
      val conn = (url.openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"
        setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
        doOutput = true
        connectTimeout = 15_000
        readTimeout = 15_000
      }
      OutputStreamWriter(conn.outputStream).use { it.write(form) }
      val code = conn.responseCode
      val text = (if (code in 200..299) conn.inputStream else conn.errorStream)
        ?.bufferedReader()
        ?.use { it.readText() }
        .orEmpty()
      conn.disconnect()
      if (code !in 200..299) return null
      JSONObject(text).optString("access_token").takeIf { it.isNotBlank() }
    } catch (_: Exception) {
      null
    }
  }

  private fun readBatteryPercent(): Int? {
    val manager = getSystemService(BatteryManager::class.java) ?: return null
    val level = manager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    return if (level in 0..100) level else null
  }
}
