/**
 * Re-applies Casa location service after `tauri android init`.
 * Copies Kotlin sources + patches manifest/Gradle deps (idempotent).
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const javaDir = join(
  root,
  'src-tauri/gen/android/app/src/main/java/com/casa/dashboard',
)
const sourceDir = join(root, 'src-tauri/android-location')
const manifestPath = join(
  root,
  'src-tauri/gen/android/app/src/main/AndroidManifest.xml',
)
const gradlePath = join(root, 'src-tauri/gen/android/app/build.gradle.kts')

if (!existsSync(manifestPath)) {
  console.error('Android project not found. Run: npx tauri android init')
  process.exit(1)
}

mkdirSync(javaDir, { recursive: true })
for (const file of [
  'LocationForegroundService.kt',
  'LocationTrackingPlugin.kt',
  'LocationCredentialStore.kt',
]) {
  const from = join(sourceDir, file)
  if (!existsSync(from)) {
    console.error(`Missing source: ${from}`)
    process.exit(1)
  }
  copyFileSync(from, join(javaDir, file))
}

let manifest = readFileSync(manifestPath, 'utf8')
const permissions = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
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
    `<uses-permission android:name="android.permission.INTERNET" />\n    <uses-feature android:name="android.hardware.location.gps" android:required="true" />`,
  )
}

if (!manifest.includes('LocationForegroundService')) {
  manifest = manifest.replace(
    '</activity>',
    `</activity>

        <service
            android:name=".LocationForegroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="location" />`,
  )
}

writeFileSync(manifestPath, manifest)

let gradle = readFileSync(gradlePath, 'utf8')
const deps = [
  'implementation("com.google.android.gms:play-services-location:21.3.0")',
  'implementation("androidx.security:security-crypto:1.1.0-alpha06")',
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

console.log('Patched Android location sources, manifest, and Gradle deps')
