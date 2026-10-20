package com.casa.dashboard

import android.Manifest
import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import java.util.concurrent.TimeUnit

@InvokeArg
class TrackingCredentials {
  lateinit var haUrl: String
  lateinit var accessToken: String
  lateinit var refreshToken: String
  lateinit var clientId: String
  lateinit var deviceId: String
}

@TauriPlugin
class LocationTrackingPlugin(private val activity: Activity) : Plugin(activity) {
  companion object {
    private const val PERMISSION_REQUEST_FOREGROUND = 4815
    private const val PERMISSION_REQUEST_BACKGROUND = 4816
  }

  @Command
  fun start(invoke: Invoke) {
    val args = try {
      invoke.parseArgs(TrackingCredentials::class.java)
    } catch (e: Exception) {
      invoke.reject("Invalid tracking credentials: ${e.message}")
      return
    }

    try {
      LocationCredentialStore.save(
        activity.applicationContext,
        args.haUrl,
        args.accessToken,
        args.refreshToken,
        args.clientId,
        args.deviceId,
      )
    } catch (e: Exception) {
      invoke.reject("Failed to store credentials: ${e.message}")
      return
    }

    if (!hasForegroundLocationPermission()) {
      requestForegroundLocationPermissions()
      invoke.reject("Location permission required. Grant precise location, then try again.")
      return
    }

    if (!hasBackgroundLocationPermission()) {
      requestBackgroundLocationPermission()
      invoke.reject("Background location required. Set Location to Allow all the time, then try again.")
      return
    }

    try {
      registerLocationUpdates()
      enqueuePeriodic()
      invoke.resolve()
    } catch (e: SecurityException) {
      invoke.reject("Location permission was denied by the system. Check Android settings.")
    } catch (e: Exception) {
      invoke.reject("Failed to start location tracking: ${e.message}")
    }
  }

  @Command
  fun stop(invoke: Invoke) {
    try {
      unregisterLocationUpdates()
      WorkManager.getInstance(activity.applicationContext)
        .cancelAllWorkByTag(LocationWorker.WORK_TAG)
      invoke.resolve()
    } catch (e: Exception) {
      invoke.reject("Failed to stop location tracking: ${e.message}")
    }
  }

  @Command
  fun updateCredentials(invoke: Invoke) {
    val args = try {
      invoke.parseArgs(TrackingCredentials::class.java)
    } catch (e: Exception) {
      invoke.reject("Invalid tracking credentials: ${e.message}")
      return
    }

    try {
      LocationCredentialStore.save(
        activity.applicationContext,
        args.haUrl,
        args.accessToken,
        args.refreshToken,
        args.clientId,
        args.deviceId,
      )
      invoke.resolve()
    } catch (e: Exception) {
      invoke.reject("Failed to update credentials: ${e.message}")
    }
  }

  /** User-visible Android device name (Settings → About → Device name), for HA tracker id. */
  @Command
  fun getDeviceName(invoke: Invoke) {
    try {
      val name = readDeviceName()
      val result = JSObject()
      result.put("name", name)
      invoke.resolve(result)
    } catch (e: Exception) {
      invoke.reject("Failed to read device name: ${e.message}")
    }
  }

  // ---------------------------------------------------------------------------

  private fun readDeviceName(): String {
    val fromSettings = try {
      Settings.Global.getString(activity.contentResolver, Settings.Global.DEVICE_NAME)
    } catch (_: Exception) {
      null
    }
    val candidate = fromSettings?.trim().orEmpty().ifBlank {
      Build.MODEL?.trim().orEmpty()
    }
    return candidate.ifBlank { "Android" }
  }


  private fun buildPendingIntent(): PendingIntent {
    val intent = Intent(activity.applicationContext, LocationUpdateReceiver::class.java)
    return PendingIntent.getBroadcast(
      activity.applicationContext,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
    )
  }

  private fun registerLocationUpdates() {
    val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 60_000L)
      .setMinUpdateIntervalMillis(30_000L)
      .setMinUpdateDistanceMeters(50f)
      .setWaitForAccurateLocation(false)
      .build()
    LocationServices.getFusedLocationProviderClient(activity.applicationContext)
      .requestLocationUpdates(request, buildPendingIntent())
  }

  private fun unregisterLocationUpdates() {
    LocationServices.getFusedLocationProviderClient(activity.applicationContext)
      .removeLocationUpdates(buildPendingIntent())
  }

  private fun enqueuePeriodic() {
    val request = PeriodicWorkRequestBuilder<LocationWorker>(15, TimeUnit.MINUTES)
      .addTag(LocationWorker.WORK_TAG)
      .setConstraints(
        Constraints.Builder()
          .setRequiredNetworkType(NetworkType.CONNECTED)
          .build()
      )
      .build()
    WorkManager.getInstance(activity.applicationContext)
      .enqueueUniquePeriodicWork(
        LocationWorker.WORK_TAG,
        ExistingPeriodicWorkPolicy.KEEP,
        request,
      )
  }

  private fun hasForegroundLocationPermission(): Boolean {
    return ContextCompat.checkSelfPermission(
      activity,
      Manifest.permission.ACCESS_FINE_LOCATION,
    ) == PackageManager.PERMISSION_GRANTED
  }

  private fun hasBackgroundLocationPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true
    return ContextCompat.checkSelfPermission(
      activity,
      Manifest.permission.ACCESS_BACKGROUND_LOCATION,
    ) == PackageManager.PERMISSION_GRANTED
  }

  /** Android Q+: request fine/coarse first; background must be a separate step. */
  private fun requestForegroundLocationPermissions() {
    ActivityCompat.requestPermissions(
      activity,
      arrayOf(
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
      ),
      PERMISSION_REQUEST_FOREGROUND,
    )
  }

  private fun requestBackgroundLocationPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return
    ActivityCompat.requestPermissions(
      activity,
      arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION),
      PERMISSION_REQUEST_BACKGROUND,
    )
  }
}
