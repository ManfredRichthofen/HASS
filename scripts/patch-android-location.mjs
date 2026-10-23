/**
 * Re-applies Casa location tracking after `tauri android init`.
 * Copies Kotlin sources + patches manifest/Gradle/ProGuard (idempotent).
 *
 * Uses FusedLocation PendingIntent + WorkManager (no foreground service).
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const javaDir = join(root, 'src-tauri/gen/android/app/src/main/java/com/casa/dashboard')
const sourceDir = join(root, 'src-tauri/android-location')
const manifestPath = join(root, 'src-tauri/gen/android/app/src/main/AndroidManifest.xml')
const gradlePath = join(root, 'src-tauri/gen/android/app/build.gradle.kts')
const proguardPath = join(root, 'src-tauri/gen/android/app/proguard-rules.pro')

if (!existsSync(manifestPath)) {
  console.error('Android project not found. Run: npx tauri android init')
  process.exit(1)
}

mkdirSync(javaDir, { recursive: true })

const kotlinSources = [
  'MainActivity.kt',
  'LocationTrackingPlugin.kt',
  'LocationCredentialStore.kt',
  'LocationWorker.kt',
  'LocationUpdateReceiver.kt',
  'AppUpdatePlugin.kt',
]

for (const file of kotlinSources) {
  const from = join(sourceDir, file)
  if (!existsSync(from)) {
    console.error(`Missing source: ${from}`)
    process.exit(1)
  }
  copyFileSync(from, join(javaDir, file))
}

// Remove obsolete FGS stub left over from the previous location implementation.
for (const dir of [javaDir, sourceDir]) {
  const stale = join(dir, 'LocationForegroundService.kt')
  if (existsSync(stale)) unlinkSync(stale)
}

let manifest = readFileSync(manifestPath, 'utf8')
const permissions = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.REQUEST_INSTALL_PACKAGES',
]

for (const perm of permissions) {
  if (!manifest.includes(perm)) {
    manifest = manifest.replace(
      '<uses-permission android:name="android.permission.INTERNET" />',
      `<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="${perm}" />`,
    )
  }
}

if (!manifest.includes('android.hardware.location.gps')) {
  manifest = manifest.replace(
    '<uses-permission android:name="android.permission.INTERNET" />',
    `<uses-permission android:name="android.permission.INTERNET" />\n    <uses-feature android:name="android.hardware.location.gps" android:required="false" />`,
  )
}

// Drop obsolete foreground-service declaration if present.
manifest = manifest.replace(
  /\s*<service[\s\S]*?android:name="\.LocationForegroundService"[\s\S]*?\/>/g,
  '',
)
for (const perm of [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
]) {
  manifest = manifest.replace(
    new RegExp(`\\s*<uses-permission android:name="${perm.replace(/\./g, '\\.')}" />`, 'g'),
    '',
  )
}

if (!manifest.includes('LocationUpdateReceiver')) {
  manifest = manifest.replace(
    '</activity>',
    `</activity>

        <receiver
            android:name=".LocationUpdateReceiver"
            android:enabled="true"
            android:exported="false" />`,
  )
}

writeFileSync(manifestPath, manifest)

let gradle = readFileSync(gradlePath, 'utf8')
const deps = [
  'implementation("com.google.android.gms:play-services-location:21.3.0")',
  'implementation("androidx.security:security-crypto:1.1.0-alpha06")',
  'implementation("androidx.work:work-runtime-ktx:2.10.0")',
]
for (const dep of deps) {
  if (!gradle.includes(dep)) {
    gradle = gradle.replace(
      'implementation("androidx.lifecycle:lifecycle-process:2.10.0")',
      `implementation("androidx.lifecycle:lifecycle-process:2.10.0")\n    ${dep}`,
    )
  }
}
writeFileSync(gradlePath, gradle)

const proguardRules = `# Casa location plugin is registered reflectively from Rust
# (register_android_plugin("com.casa.dashboard", "LocationTrackingPlugin")).
# Without these keeps, R8 strips/renames the class and release builds crash on launch.

-keep @app.tauri.annotation.TauriPlugin class * { *; }
-keep class * extends app.tauri.plugin.Plugin { *; }

-keep class com.casa.dashboard.LocationTrackingPlugin { *; }
-keep class com.casa.dashboard.LocationWorker { *; }
-keep class com.casa.dashboard.LocationUpdateReceiver { *; }
-keep class com.casa.dashboard.AppUpdatePlugin { *; }
-keep class com.casa.dashboard.DownloadArgs { *; }
-keep class com.casa.dashboard.LocationCredentialStore { *; }
-keep class com.casa.dashboard.TrackingCredentials { *; }

# WorkManager's Room database is instantiated reflectively; R8 strips its constructor otherwise
# (crash in androidx.startup.InitializationProvider before any UI).
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class androidx.work.impl.WorkDatabase_Impl { *; }
-keep class * extends androidx.work.Worker { <init>(...); }
-keep class * extends androidx.work.CoroutineWorker { <init>(...); }
-keep class * extends androidx.startup.Initializer { <init>(); }
`

if (!existsSync(proguardPath) || !readFileSync(proguardPath, 'utf8').includes('AppUpdatePlugin')) {
  writeFileSync(proguardPath, proguardRules)
}

console.log('Patched Android location sources, manifest, Gradle deps, and ProGuard keeps')
