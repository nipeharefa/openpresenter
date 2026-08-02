use serde::Serialize;
use tauri::window::Monitor;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub name: Option<String>,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub scale_factor: f64,
    pub is_primary: bool,
}

impl MonitorInfo {
    pub fn from_monitor(monitor: &Monitor, primary: Option<&Monitor>) -> Self {
        let is_primary = match primary {
            Some(p) => p.position() == monitor.position() && p.size() == monitor.size(),
            None => false,
        };
        Self {
            name: monitor.name().cloned(),
            width: monitor.size().width,
            height: monitor.size().height,
            x: monitor.position().x,
            y: monitor.position().y,
            scale_factor: monitor.scale_factor(),
            is_primary,
        }
    }
}

pub fn pick_target_monitor(preferred: Option<&str>, monitors: &[MonitorInfo]) -> Option<usize> {
    if monitors.is_empty() {
        return None;
    }
    if let Some(name) = preferred {
        if let Some(index) = monitors
            .iter()
            .position(|m| m.name.as_deref() == Some(name))
        {
            return Some(index);
        }
    }
    monitors.iter().position(|m| !m.is_primary).or(Some(0))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn monitor(name: Option<&str>, primary: bool) -> MonitorInfo {
        MonitorInfo {
            name: name.map(|s| s.to_string()),
            width: 1920,
            height: 1080,
            x: if primary { 0 } else { 1920 },
            y: 0,
            scale_factor: 1.0,
            is_primary: primary,
        }
    }

    #[test]
    fn empty_list_returns_none() {
        assert_eq!(pick_target_monitor(None, &[]), None);
    }

    #[test]
    fn preferred_monitor_matches() {
        let monitors = vec![monitor(Some("A"), true), monitor(Some("B"), false)];
        assert_eq!(pick_target_monitor(Some("B"), &monitors), Some(1));
        assert_eq!(pick_target_monitor(Some("A"), &monitors), Some(0));
    }

    #[test]
    fn missing_preferred_falls_back_to_non_primary() {
        let monitors = vec![monitor(Some("A"), true), monitor(Some("B"), false)];
        assert_eq!(pick_target_monitor(Some("C"), &monitors), Some(1));
        assert_eq!(pick_target_monitor(None, &monitors), Some(1));
    }

    #[test]
    fn single_monitor_uses_primary() {
        let monitors = vec![monitor(Some("A"), true)];
        assert_eq!(pick_target_monitor(None, &monitors), Some(0));
        assert_eq!(pick_target_monitor(Some("missing"), &monitors), Some(0));
    }
}
