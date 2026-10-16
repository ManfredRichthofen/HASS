package com.casa.dashboard

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin

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

    val intent = Intent(activity, LocationForegroundService::class.java).apply {
      action = LocationForegroundService.ACTION_START
    }
    ContextCompat.startForegroundService(activity, intent)
    invoke.resolve()
  }

  @Command
  fun stop(invoke: Invoke) {
    val intent = Intent(activity, LocationForegroundService::class.java).apply {
      action = LocationForegroundService.ACTION_STOP
    }
    activity.startService(intent)
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
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      permissions.add(Manifest.permission.POST_NOTIFICATIONS)
    }
    ActivityCompat.requestPermissions(
      activity,
      permissions.toTypedArray(),
      PERMISSION_REQUEST,
    )
  }
}
