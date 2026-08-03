use serde::Serialize;

use crate::db;
use crate::slides;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LiveItem {
    pub id: i64,
    pub title: String,
    pub text: String,
    pub library_item_id: Option<i64>,
    pub kind: Option<String>,
    pub slides: Vec<db::Slide>,
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
        let slide_text = self.slide_text_at(self.slide_index).unwrap_or_default();
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

    fn item_slides(&self, index: usize) -> Vec<db::Slide> {
        match self.items.get(index) {
            Some(item) if !item.slides.is_empty() => item.slides.clone(),
            Some(item) => slides::split_slides(&item.text)
                .into_iter()
                .map(|text| db::Slide {
                    text,
                    background: None,
                })
                .collect(),
            None => Vec::new(),
        }
    }

    pub fn slide_count(&self) -> usize {
        self.item_slides(self.item_index).len()
    }

    pub fn slide_text_at(&self, index: usize) -> Option<String> {
        self.item_slides(self.item_index)
            .get(index)
            .map(|slide| slide.text.clone())
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
