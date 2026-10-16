package com.casa.dashboard

import android.content.Context
import android.location.Location
import android.os.BatteryManager
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONArray
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
        if (!postSee(creds, finalLat, finalLon, finalAccuracy, battery)) {
            val refreshed = refreshToken(creds) ?: return Result.retry()
            LocationCredentialStore.updateAccessToken(applicationContext, refreshed)
            if (!postSee(creds.copy(accessToken = refreshed), finalLat, finalLon, finalAccuracy, battery)) {
                return Result.retry()
            }
        }
        return Result.success()
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

    private fun postSee(
        creds: LocationCredentialStore.Credentials,
        lat: Double,
        lon: Double,
        accuracy: Float?,
        battery: Int?,
    ): Boolean {
        val body = JSONObject().apply {
            put("dev_id", creds.deviceId)
            put("gps", JSONArray().put(lat).put(lon))
            if (accuracy != null) put("gps_accuracy", accuracy.toInt())
            put("host_name", "Casa Android")
            if (battery != null) put("battery", battery)
        }
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
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }
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
        val mgr = applicationContext.getSystemService(BatteryManager::class.java) ?: return null
        val level = mgr.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return if (level in 0..100) level else null
    }
}
