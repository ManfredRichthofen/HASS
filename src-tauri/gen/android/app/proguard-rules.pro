# Casa location plugin is registered reflectively from Rust
# (register_android_plugin("com.casa.dashboard", "LocationTrackingPlugin")).
# Without these keeps, R8 strips/renames the class and release builds crash on launch.

-keep @app.tauri.annotation.TauriPlugin class * { *; }
-keep class * extends app.tauri.plugin.Plugin { *; }

-keep class com.casa.dashboard.LocationTrackingPlugin { *; }
-keep class com.casa.dashboard.LocationWorker { *; }
-keep class com.casa.dashboard.LocationUpdateReceiver { *; }
-keep class com.casa.dashboard.LocationCredentialStore { *; }
-keep class com.casa.dashboard.TrackingCredentials { *; }
