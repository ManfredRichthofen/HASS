package com.casa.dashboard

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

@InvokeArg
class DownloadArgs {
  lateinit var url: String
}

/** Downloads a release APK into the app cache and hands it to the system package installer. */
@TauriPlugin
class AppUpdatePlugin(private val activity: Activity) : Plugin(activity) {
  companion object {
    private const val ALLOWED_PREFIX = "https://github.com/"
  }

  @Volatile private var downloaded = 0L
  @Volatile private var total = 0L
  @Volatile private var running = false

  private fun apkFile() = File(File(activity.cacheDir, "updates"), "casa-update.apk")

  @Command
  fun download(invoke: Invoke) {
    val args = try {
      invoke.parseArgs(DownloadArgs::class.java)
    } catch (e: Exception) {
      invoke.reject("Invalid update URL: ${e.message}")
      return
    }
    if (!args.url.startsWith(ALLOWED_PREFIX)) {
      invoke.reject("Refusing to download updates from outside GitHub")
      return
    }
    if (running) {
      invoke.reject("A download is already in progress")
      return
    }

    running = true
    downloaded = 0
    total = 0
    Thread {
      try {
        val target = apkFile()
        target.parentFile?.mkdirs()
        val part = File(target.parentFile, "casa-update.apk.part")
        val conn = URL(args.url).openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000
        conn.readTimeout = 30_000
        conn.instanceFollowRedirects = true
        try {
          if (conn.responseCode !in 200..299) {
            invoke.reject("Download failed (HTTP ${conn.responseCode})")
            return@Thread
          }
          total = conn.contentLengthLong
          conn.inputStream.use { input ->
            part.outputStream().use { out ->
              val buf = ByteArray(64 * 1024)
              while (true) {
                val n = input.read(buf)
                if (n < 0) break
                out.write(buf, 0, n)
                downloaded += n
              }
            }
          }
        } finally {
          conn.disconnect()
        }
        if (total > 0 && part.length() != total) {
          part.delete()
          invoke.reject("Download was incomplete")
          return@Thread
        }
        target.delete()
        if (!part.renameTo(target)) {
          invoke.reject("Could not store the downloaded update")
          return@Thread
        }
        invoke.resolve()
      } catch (e: Exception) {
        invoke.reject("Download failed: ${e.message}")
      } finally {
        running = false
      }
    }.start()
  }

  @Command
  fun progress(invoke: Invoke) {
    val ret = JSObject()
    ret.put("downloaded", downloaded)
    ret.put("total", total)
    invoke.resolve(ret)
  }

  @Command
  fun install(invoke: Invoke) {
    val file = apkFile()
    if (!file.exists()) {
      invoke.reject("No downloaded update found")
      return
    }

    if (!activity.packageManager.canRequestPackageInstalls()) {
      // Android requires a one-time per-app opt-in for installing APKs.
      val settings = Intent(
        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
        Uri.parse("package:${activity.packageName}"),
      )
      activity.startActivity(settings)
      invoke.reject("Allow Casa to install apps in the settings screen that just opened, then tap Install again.")
      return
    }

    try {
      val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", file)
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, "application/vnd.android.package-archive")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      activity.startActivity(intent)
      invoke.resolve()
    } catch (e: Exception) {
      invoke.reject("Could not start installer: ${e.message}")
    }
  }
}
