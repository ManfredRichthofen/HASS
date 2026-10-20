mod location_tracking;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default().invoke_handler(tauri::generate_handler![
        location_tracking::location_tracking_start,
        location_tracking::location_tracking_stop,
        location_tracking::location_tracking_update_credentials,
    ]);

    // Background HA location sharing — Android Kotlin plugin only.
    #[cfg(target_os = "android")]
    {
        builder = builder.plugin(location_tracking::init());
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        builder = builder.plugin(tauri_plugin_geolocation::init());
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
