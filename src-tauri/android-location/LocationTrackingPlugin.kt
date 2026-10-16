package com.casa.dashboard

import android.Manifest
import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
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
    private const val PERMISSION_REQUEST = 4815
  }

  @Command
  fun start(invoke: Invoke) {
    val args = invoke.parseArgs(TrackingCredentials::class.java)
    LocationCredentialStore.save(
      activity.applicationContext,
      args.haUrl,
      args.accessToken,
      args.refreshToken,
      args.clientId,
      args.deviceId,
    )

    if (!hasLocationPermission()) {
      requestLocationPermissions()
      invoke.reject("Location permission required. Grant Allow all the time, then try again.")
      return
    }

    registerLocationUpdates()
    enqueuePeriodic()
    invoke.resolve()
  }

  @Command
  fun stop(invoke: Invoke) {
    unregisterLocationUpdates()
    WorkManager.getInstance(activity.applicationContext)
      .cancelAllWorkByTag(LocationWorker.WORK_TAG)
    invoke.resolve()
  }

  @Command
  fun updateCredentials(invoke: Invoke) {
    val args = invoke.parseArgs(TrackingCredentials::class.java)
    LocationCredentialStore.save(
      activity.applicationContext,
      args.haUrl,
      args.accessToken,
      args.refreshToken,
      args.clientId,
      args.deviceId,
    )
    invoke.resolve()
  }

  // ---------------------------------------------------------------------------

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
    try {
      LocationServices.getFusedLocationProviderClient(activity.applicationContext)
        .requestLocationUpdates(request, buildPendingIntent())
    } catch (_: SecurityException) { }
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

  private fun hasLocationPermission(): Boolean {
    val fine = ContextCompat.checkSelfPermission(
      activity,
      Manifest.permission.ACCESS_FINE_LOCATION,
    ) == PackageManager.PERMISSION_GRANTED
    if (!fine) return false
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ContextCompat.checkSelfPermission(
        activity,
        Manifest.permission.ACCESS_BACKGROUND_LOCATION,
      ) == PackageManager.PERMISSION_GRANTED
    } else {
      true
    }
  }

  private fun requestLocationPermissions() {
    val permissions = mutableListOf(
      Manifest.permission.ACCESS_FINE_LOCATION,
      Manifest.permission.ACCESS_COARSE_LOCATION,
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      permissions.add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
    }
    ActivityCompat.requestPermissions(
      activity,
      permissions.toTypedArray(),
      PERMISSION_REQUEST,
    )
  }
}
