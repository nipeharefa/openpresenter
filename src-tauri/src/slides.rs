pub fn split_slides(text: &str) -> Vec<String> {
    text.replace("\r\n", "\n")
        .split("\n\n")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_on_blank_line() {
        let text = "Verse 1\nline two\n\nChorus\nline four";
        let slides = split_slides(text);
        assert_eq!(slides.len(), 2);
        assert_eq!(slides[0], "Verse 1\nline two");
        assert_eq!(slides[1], "Chorus\nline four");
    }

    #[test]
    fn handles_crlf() {
        let text = "A\r\n\r\nB";
        let slides = split_slides(text);
        assert_eq!(slides, vec!["A".to_string(), "B".to_string()]);
    }

    #[test]
    fn collapses_multiple_blank_lines() {
        let text = "A\n\n\n\nB";
        let slides = split_slides(text);
        assert_eq!(slides, vec!["A".to_string(), "B".to_string()]);
    }

    #[test]
    fn trims_and_skips_empty() {
        let text = "\n  \nA  \n\n ";
        let slides = split_slides(text);
        assert_eq!(slides, vec!["A".to_string()]);
    }

    #[test]
    fn empty_text_gives_no_slides() {
        assert!(split_slides("").is_empty());
        assert!(split_slides("\n\n  ").is_empty());
    }
}
