package com.casa.dashboard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.google.android.gms.location.LocationResult

class LocationUpdateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (!LocationResult.hasResult(intent)) return
        val location = LocationResult.extractResult(intent)?.lastLocation ?: return
        if (location.accuracy > 500f) return

        val data = workDataOf(
            LocationWorker.KEY_LAT to location.latitude,
            LocationWorker.KEY_LON to location.longitude,
            LocationWorker.KEY_ACCURACY to location.accuracy,
        )
        WorkManager.getInstance(context).enqueue(
            OneTimeWorkRequestBuilder<LocationWorker>()
                .setInputData(data)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()
        )
    }
}
