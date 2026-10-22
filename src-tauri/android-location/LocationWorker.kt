package com.casa.dashboard

import android.content.Context
import android.location.Location
import android.os.BatteryManager
import android.os.Build
import android.provider.Settings
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import kotlin.coroutines.resume

class LocationWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {

    companion object {
        const val KEY_LAT = "lat"
        const val KEY_LON = "lon"
        const val KEY_ACCURACY = "accuracy"
        const val WORK_TAG = "casa_location"
    }

    override suspend fun doWork(): Result {
        val creds = LocationCredentialStore.load(applicationContext) ?: return Result.success()

        val lat = inputData.getDouble(KEY_LAT, Double.NaN)
        val lon = inputData.getDouble(KEY_LON, Double.NaN)
        val accuracy = inputData.getFloat(KEY_ACCURACY, -1f)

        val (finalLat, finalLon, finalAccuracy) = if (!lat.isNaN() && !lon.isNaN()) {
            // Coordinates supplied by LocationUpdateReceiver — no GPS fetch needed.
            Triple(lat, lon, if (accuracy >= 0f) accuracy else null)
        } else {
            // Periodic heartbeat — fetch a fresh fix.
            val location = getLocation() ?: return Result.success()
            if (location.accuracy > 500f) return Result.success()
            Triple(location.latitude, location.longitude, location.accuracy as Float?)
        }

        val battery = readBatteryPercent()
        return if (postWebhook(creds, finalLat, finalLon, finalAccuracy, battery)) {
            Result.success()
        } else {
            Result.retry()
        }
    }

    private suspend fun getLocation(): Location? {
        val fused = LocationServices.getFusedLocationProviderClient(applicationContext)
        return withTimeoutOrNull(20_000) {
            suspendCancellableCoroutine { cont ->
                try {
                    fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                        .addOnSuccessListener { loc -> cont.resume(loc) }
                        .addOnFailureListener { cont.resume(null) }
                } catch (_: SecurityException) {
                    cont.resume(null)
                }
            }
        }
    }

    /**
     * POST GPS to a trigger-based Template device_tracker webhook
     * (Home Assistant's replacement for deprecated device_tracker.see).
     */
    private fun postWebhook(
        creds: LocationCredentialStore.Credentials,
        lat: Double,
        lon: Double,
        accuracy: Float?,
        battery: Int?,
    ): Boolean {
        val deviceName = readDeviceName()
        val body = JSONObject().apply {
            put("latitude", lat)
            put("longitude", lon)
            if (accuracy != null) put("gps_accuracy", accuracy.toInt())
            put("host_name", deviceName)
            put("device_id", creds.deviceId)
            if (battery != null) put("battery", battery)
        }
        return try {
            val webhookId = URLEncoder.encode(creds.webhookId, "UTF-8")
            val url = URL("${creds.haUrl}/api/webhook/$webhookId")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 15_000
                readTimeout = 15_000
            }
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }
            val code = conn.responseCode
            conn.disconnect()
            code in 200..299
        } catch (_: Exception) {
            false
        }
    }

    private fun readBatteryPercent(): Int? {
        val mgr = applicationContext.getSystemService(BatteryManager::class.java) ?: return null
        val level = mgr.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return if (level in 0..100) level else null
    }

    private fun readDeviceName(): String {
        val fromSettings = try {
            Settings.Global.getString(applicationContext.contentResolver, Settings.Global.DEVICE_NAME)
        } catch (_: Exception) {
            null
        }
        val candidate = fromSettings?.trim().orEmpty().ifBlank {
            Build.MODEL?.trim().orEmpty()
        }
        return candidate.ifBlank { "Android" }
    }
}
