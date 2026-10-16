use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{Builder, PluginHandle, TauriPlugin},
    AppHandle, Manager,
};

#[cfg(target_os = "android")]
struct LocationTrackingState(PluginHandle<tauri::Wry>);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackingCredentials {
    pub ha_url: String,
    pub access_token: String,
    pub refresh_token: String,
    pub client_id: String,
    pub device_id: String,
}

#[tauri::command]
pub fn location_tracking_start(
    app: AppHandle,
    credentials: TrackingCredentials,
) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        let state = app
            .try_state::<LocationTrackingState>()
            .ok_or_else(|| "Location tracking is not available".to_string())?;
        state
            .0
            .run_mobile_plugin("start", credentials)
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, credentials);
        Err("Background location tracking is only available on Android".into())
    }
}

#[tauri::command]
pub fn location_tracking_stop(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        let state = app
            .try_state::<LocationTrackingState>()
            .ok_or_else(|| "Location tracking is not available".to_string())?;
        state
            .0
            .run_mobile_plugin("stop", ())
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err("Background location tracking is only available on Android".into())
    }
}

#[tauri::command]
pub fn location_tracking_update_credentials(
    app: AppHandle,
    credentials: TrackingCredentials,
) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        let state = app
            .try_state::<LocationTrackingState>()
            .ok_or_else(|| "Location tracking is not available".to_string())?;
        state
            .0
            .run_mobile_plugin("updateCredentials", credentials)
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, credentials);
        Err("Background location tracking is only available on Android".into())
    }
}

/// Registers the Android Kotlin plugin and stores its handle for command forwarding.
pub fn init() -> TauriPlugin<tauri::Wry> {
    Builder::new("location-tracking")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                let handle =
                    api.register_android_plugin("com.casa.dashboard", "LocationTrackingPlugin")?;
                app.manage(LocationTrackingState(handle));
            }
            #[cfg(not(target_os = "android"))]
            {
                let _ = (app, api);
            }
            Ok(())
        })
        .build()
}
