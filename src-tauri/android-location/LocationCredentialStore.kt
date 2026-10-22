package com.casa.dashboard

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object LocationCredentialStore {
  private const val PREFS = "casa_location_creds"
  private const val KEY_HA_URL = "ha_url"
  private const val KEY_ACCESS = "access_token"
  private const val KEY_REFRESH = "refresh_token"
  private const val KEY_CLIENT = "client_id"
  private const val KEY_DEVICE = "device_id"
  private const val KEY_WEBHOOK = "webhook_id"
  private const val DEFAULT_WEBHOOK = "casa_location"

  data class Credentials(
    val haUrl: String,
    val accessToken: String,
    val refreshToken: String,
    val clientId: String,
    val deviceId: String,
    val webhookId: String,
  )

  private fun prefs(context: Context): SharedPreferences {
    val masterKey = MasterKey.Builder(context)
      .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
      .build()
    return EncryptedSharedPreferences.create(
      context,
      PREFS,
      masterKey,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
  }

  fun save(
    context: Context,
    haUrl: String,
    accessToken: String,
    refreshToken: String,
    clientId: String,
    deviceId: String,
    webhookId: String,
  ) {
    prefs(context).edit()
      .putString(KEY_HA_URL, haUrl.trimEnd('/'))
      .putString(KEY_ACCESS, accessToken)
      .putString(KEY_REFRESH, refreshToken)
      .putString(KEY_CLIENT, clientId)
      .putString(KEY_DEVICE, deviceId)
      .putString(KEY_WEBHOOK, webhookId.ifBlank { DEFAULT_WEBHOOK })
      .apply()
  }

  fun load(context: Context): Credentials? {
    return try {
      val p = prefs(context)
      val haUrl = p.getString(KEY_HA_URL, null) ?: return null
      val access = p.getString(KEY_ACCESS, null) ?: return null
      val refresh = p.getString(KEY_REFRESH, null) ?: return null
      val client = p.getString(KEY_CLIENT, null) ?: return null
      val device = p.getString(KEY_DEVICE, null) ?: return null
      val webhook = p.getString(KEY_WEBHOOK, null)?.ifBlank { null } ?: DEFAULT_WEBHOOK
      Credentials(haUrl, access, refresh, client, device, webhook)
    } catch (_: Exception) {
      null
    }
  }

  fun updateAccessToken(context: Context, accessToken: String) {
    try {
      prefs(context).edit().putString(KEY_ACCESS, accessToken).apply()
    } catch (_: Exception) {
      /* ignore — next start will rewrite credentials */
    }
  }

  fun clear(context: Context) {
    try {
      prefs(context).edit().clear().apply()
    } catch (_: Exception) {
      /* ignore */
    }
  }
}
