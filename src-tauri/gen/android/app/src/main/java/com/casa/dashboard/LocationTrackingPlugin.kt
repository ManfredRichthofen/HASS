package com.casa.dashboard

import android.Manifest
import android.app.Activity
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
    private const val WORK_TAG = "casa_location"
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

    val request = PeriodicWorkRequestBuilder<LocationWorker>(15, TimeUnit.MINUTES)
      .addTag(WORK_TAG)
      .setConstraints(
        Constraints.Builder()
          .setRequiredNetworkType(NetworkType.CONNECTED)
          .build()
      )
      .build()

    WorkManager.getInstance(activity.applicationContext)
      .enqueueUniquePeriodicWork(WORK_TAG, ExistingPeriodicWorkPolicy.KEEP, request)

    invoke.resolve()
  }

  @Command
  fun stop(invoke: Invoke) {
    WorkManager.getInstance(activity.applicationContext).cancelAllWorkByTag(WORK_TAG)
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
