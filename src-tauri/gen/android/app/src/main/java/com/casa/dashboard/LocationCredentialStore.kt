package com.casa.dashboard

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object LocationCredentialStore {
  private const val PREFS = "casa_location_creds"
  private const val KEY_HA_URL = "ha_url"
  private const val KEY_ACCESS = "access_token"
  private const val KEY_REFRESH = "refresh_token"
  private const val KEY_CLIENT = "client_id"
  private const val KEY_DEVICE = "device_id"

  data class Credentials(
    val haUrl: String,
    val accessToken: String,
    val refreshToken: String,
    val clientId: String,
    val deviceId: String,
  )

  private fun prefs(context: Context) =
    EncryptedSharedPreferences.create(
      context,
      PREFS,
      MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

  fun save(
    context: Context,
    haUrl: String,
    accessToken: String,
    refreshToken: String,
    clientId: String,
    deviceId: String,
  ) {
    prefs(context).edit()
      .putString(KEY_HA_URL, haUrl.trimEnd('/'))
      .putString(KEY_ACCESS, accessToken)
      .putString(KEY_REFRESH, refreshToken)
      .putString(KEY_CLIENT, clientId)
      .putString(KEY_DEVICE, deviceId)
      .apply()
  }

  fun load(context: Context): Credentials? {
    val p = prefs(context)
    val haUrl = p.getString(KEY_HA_URL, null) ?: return null
    val access = p.getString(KEY_ACCESS, null) ?: return null
    val refresh = p.getString(KEY_REFRESH, null) ?: return null
    val client = p.getString(KEY_CLIENT, null) ?: return null
    val device = p.getString(KEY_DEVICE, null) ?: return null
    return Credentials(haUrl, access, refresh, client, device)
  }

  fun updateAccessToken(context: Context, accessToken: String) {
    prefs(context).edit().putString(KEY_ACCESS, accessToken).apply()
  }

  fun clear(context: Context) {
    prefs(context).edit().clear().apply()
  }
}
