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
    private const val USER_AGENT = "Casa-Updater/1.0 (Android)"
    private const val MAX_REDIRECTS = 8
  }

  @Volatile private var downloaded = 0L
  @Volatile private var total = 0L
  @Volatile private var running = false

  private fun apkFile() = File(File(activity.cacheDir, "updates"), "casa-update.apk")

  private fun isAllowedDownloadUrl(url: String): Boolean {
    if (!url.startsWith("https://")) return false
    return url.startsWith("https://github.com/") ||
      url.startsWith("https://objects.githubusercontent.com/") ||
      url.startsWith("https://release-assets.githubusercontent.com/") ||
      url.startsWith("https://github-releases.githubusercontent.com/")
  }

  private fun openDownload(url: String): HttpURLConnection {
    var current = url
    var redirects = 0
    while (redirects <= MAX_REDIRECTS) {
      if (!isAllowedDownloadUrl(current)) {
        throw IllegalArgumentException("Refusing to download updates from $current")
      }
      val conn = URL(current).openConnection() as HttpURLConnection
      conn.instanceFollowRedirects = false
      conn.connectTimeout = 15_000
      conn.readTimeout = 60_000
      conn.setRequestProperty("User-Agent", USER_AGENT)
      conn.setRequestProperty("Accept", "application/octet-stream,*/*")
      conn.connect()
      val code = conn.responseCode
      if (code in 300..399) {
        val next = conn.getHeaderField("Location")
        conn.disconnect()
        if (next.isNullOrBlank()) {
          throw IllegalStateException("Redirect without Location ($code)")
        }
        current = if (next.startsWith("http")) next else URL(URL(current), next).toString()
        redirects += 1
        continue
      }
      if (code !in 200..299) {
        conn.disconnect()
        throw IllegalStateException("Download failed (HTTP $code)")
      }
      return conn
    }
    throw IllegalStateException("Too many redirects while downloading update")
  }

  @Command
  fun download(invoke: Invoke) {
    val args = try {
      invoke.parseArgs(DownloadArgs::class.java)
    } catch (e: Exception) {
      invoke.reject("Invalid update URL: ${e.message}")
      return
    }
    if (!isAllowedDownloadUrl(args.url)) {
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
      var conn: HttpURLConnection? = null
      try {
        val target = apkFile()
        target.parentFile?.mkdirs()
        val part = File(target.parentFile, "casa-update.apk.part")
        conn = openDownload(args.url)
        total = conn.contentLengthLong.coerceAtLeast(0L)
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
        if (total > 0 && part.length() != total) {
          part.delete()
          invoke.reject("Download was incomplete")
          return@Thread
        }
        // APK/ZIP local file header magic — reject HTML error pages GitHub sometimes returns.
        part.inputStream().use { input ->
          val magic = ByteArray(2)
          if (input.read(magic) != 2 || magic[0] != 'P'.code.toByte() || magic[1] != 'K'.code.toByte()) {
            part.delete()
            invoke.reject("Downloaded file is not a valid APK")
            return@Thread
          }
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
        try {
          conn?.disconnect()
        } catch (_: Exception) {
        }
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
