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
    pub is_section: bool,
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
    pub next_item_title: Option<String>,
    pub next_slide_text: String,
    pub next_background: Option<db::SlideBackground>,
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
        let (next_item_title, next_slide_text, next_background) = self.next_slide_info();
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
            next_item_title,
            next_slide_text,
            next_background,
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

    pub fn next_playable_index(&self, from: usize) -> Option<usize> {
        (from + 1..self.items.len()).find(|&i| !self.items[i].is_section)
    }

    pub fn prev_playable_index(&self, from: usize) -> Option<usize> {
        (0..from).rev().find(|&i| !self.items[i].is_section)
    }

    pub fn skip_sections_forward(&mut self) {
        while let Some(item) = self.items.get(self.item_index) {
            if item.is_section {
                self.item_index += 1;
                self.slide_index = 0;
            } else {
                break;
            }
        }
    }

    fn next_slide_info(&self) -> (Option<String>, String, Option<db::SlideBackground>) {
        let slides = self.item_slides(self.item_index);
        if self.slide_index + 1 < slides.len() {
            let next = &slides[self.slide_index + 1];
            let title = self.items.get(self.item_index).map(|i| i.title.clone());
            return (title, next.text.clone(), next.background.clone());
        }
        if let Some(ni) = self.next_playable_index(self.item_index) {
            let next_slides = self.item_slides(ni);
            let title = self.items.get(ni).map(|i| i.title.clone());
            let first = next_slides.first().cloned();
            return (
                title,
                first.as_ref().map(|s| s.text.clone()).unwrap_or_default(),
                first.and_then(|s| s.background),
            );
        }
        (None, String::new(), None)
    }

    pub fn at_end(&self) -> bool {
        if self.items.is_empty() {
            return true;
        }
        self.next_playable_index(self.item_index).is_none()
            && self.slide_index + 1 >= self.slide_count()
    }
}

impl Default for LiveState {
    fn default() -> Self {
        Self::new()
    }
}
