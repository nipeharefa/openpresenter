use serde::Serialize;

use crate::slides;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LiveItem {
    pub id: i64,
    pub title: String,
    pub text: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LiveView {
    pub loaded: bool,
    pub urutan_id: Option<i64>,
    pub urutan_name: Option<String>,
    pub item_index: usize,
    pub slide_index: usize,
    pub slide_count: usize,
    pub slide_text: String,
    pub black: bool,
    pub items: Vec<LiveItem>,
}

pub struct LiveState {
    pub urutan_id: Option<i64>,
    pub urutan_name: Option<String>,
    pub items: Vec<LiveItem>,
    pub item_index: usize,
    pub slide_index: usize,
    pub black: bool,
    pub projection_open: bool,
}

impl LiveState {
    pub fn new() -> Self {
        Self {
            urutan_id: None,
            urutan_name: None,
            items: Vec::new(),
            item_index: 0,
            slide_index: 0,
            black: false,
            projection_open: false,
        }
    }

    pub fn view(&self) -> LiveView {
        let slide_count = self.slide_count();
        let slide_text = self
            .items
            .get(self.item_index)
            .and_then(|item| {
                let slides = slides::split_slides(&item.text);
                slides.get(self.slide_index).cloned()
            })
            .unwrap_or_default();
        LiveView {
            loaded: self.urutan_id.is_some(),
            urutan_id: self.urutan_id,
            urutan_name: self.urutan_name.clone(),
            item_index: self.item_index,
            slide_index: self.slide_index,
            slide_count,
            slide_text,
            black: self.black,
            items: self.items.clone(),
        }
    }

    pub fn slide_count(&self) -> usize {
        self.items
            .get(self.item_index)
            .map(|item| slides::split_slides(&item.text).len())
            .unwrap_or(0)
    }

    pub fn at_end(&self) -> bool {
        if self.items.is_empty() {
            return true;
        }
        self.item_index + 1 >= self.items.len() && self.slide_index + 1 >= self.slide_count()
    }
}

impl Default for LiveState {
    fn default() -> Self {
        Self::new()
    }
}
