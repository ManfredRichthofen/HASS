use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[cfg(target_os = "android")]
use tauri::Manager;
#[cfg(target_os = "android")]
use tauri::plugin::{Builder, PluginHandle, TauriPlugin};

#[cfg(target_os = "android")]
struct AppUpdateState(PluginHandle<tauri::Wry>);

#[cfg(target_os = "android")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadArgs {
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
}

#[cfg(target_os = "android")]
fn handle(app: &AppHandle) -> Result<tauri::State<'_, AppUpdateState>, String> {
    app.try_state::<AppUpdateState>()
        .ok_or_else(|| "In-app updates are not available (plugin failed to load)".to_string())
}

// Async commands: the Kotlin download blocks until finished and must not hold the main thread.
#[tauri::command]
pub async fn app_update_download(app: AppHandle, url: String) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        handle(&app)?
            .0
            .run_mobile_plugin_async("download", DownloadArgs { url })
            .await
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, url);
        Err("In-app APK updates are only available on Android".into())
    }
}

#[tauri::command]
pub async fn app_update_progress(app: AppHandle) -> Result<DownloadProgress, String> {
    #[cfg(target_os = "android")]
    {
        handle(&app)?
            .0
            .run_mobile_plugin_async("progress", ())
            .await
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err("In-app APK updates are only available on Android".into())
    }
}

#[tauri::command]
pub async fn app_update_install(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        handle(&app)?
            .0
            .run_mobile_plugin_async("install", ())
            .await
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err("In-app APK updates are only available on Android".into())
    }
}

/// Registers the Android Kotlin plugin; failures are logged so the app still launches.
#[cfg(target_os = "android")]
pub fn init() -> TauriPlugin<tauri::Wry> {
    Builder::new("app-update")
        .setup(|app, api| {
            match api.register_android_plugin("com.casa.dashboard", "AppUpdatePlugin") {
                Ok(handle) => {
                    app.manage(AppUpdateState(handle));
                }
                Err(e) => {
                    log::error!("Failed to register AppUpdatePlugin (in-app updates disabled): {e}");
                }
            }
            Ok(())
        })
        .build()
}
