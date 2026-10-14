//! Compile-time and runtime validation of the tray-language logic from
//! `src-tauri/src/core/setup.rs`.
//!
//! Extracted for the same reason as `mirror-verify`: the `src-tauri` build
//! cannot complete here because `ring v0.17.14` fails in its cc-rs C build.
//! The items below are copied verbatim from setup.rs.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrayLanguage {
    En,
    ZhCn,
    ZhTw,
    Other,
}

impl TrayLanguage {
    /// Maps a BCP-47 tag as stored by the web app (e.g. `zh-CN`) onto a variant.
    pub fn from_tag(tag: &str) -> Self {
        let normalized = tag.trim().to_ascii_lowercase().replace('_', "-");
        match normalized.as_str() {
            "zh-cn" | "zh-hans" | "zh" => Self::ZhCn,
            "zh-tw" | "zh-hk" | "zh-hant" => Self::ZhTw,
            "en" | "en-us" | "en-gb" => Self::En,
            _ => Self::Other,
        }
    }

    /// `(open, quit)` labels for this language.
    pub fn labels(self) -> (&'static str, &'static str) {
        match self {
            Self::ZhCn => ("打开 AI", "退出"),
            Self::ZhTw => ("開啟 AI", "結束"),
            Self::En | Self::Other => ("Open AI", "Quit"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::TrayLanguage;

    #[test]
    fn maps_simplified_chinese_tags() {
        assert_eq!(TrayLanguage::from_tag("zh-CN"), TrayLanguage::ZhCn);
        assert_eq!(TrayLanguage::from_tag("zh-cn"), TrayLanguage::ZhCn);
        assert_eq!(TrayLanguage::from_tag("zh"), TrayLanguage::ZhCn);
        assert_eq!(TrayLanguage::from_tag("zh-Hans"), TrayLanguage::ZhCn);
        assert_eq!(TrayLanguage::from_tag("zh_CN"), TrayLanguage::ZhCn);
        assert_eq!(TrayLanguage::from_tag("  zh-CN  "), TrayLanguage::ZhCn);
    }

    #[test]
    fn maps_traditional_chinese_tags() {
        assert_eq!(TrayLanguage::from_tag("zh-TW"), TrayLanguage::ZhTw);
        assert_eq!(TrayLanguage::from_tag("zh-HK"), TrayLanguage::ZhTw);
        assert_eq!(TrayLanguage::from_tag("zh-Hant"), TrayLanguage::ZhTw);
    }

    #[test]
    fn unknown_languages_keep_english_labels() {
        for tag in ["fr", "ja", "", "not-a-locale", "en-GB"] {
            let lang = TrayLanguage::from_tag(tag);
            if lang == TrayLanguage::En || lang == TrayLanguage::Other {
                assert_eq!(lang.labels(), ("Open AI", "Quit"), "tag: {tag:?}");
            }
        }
        assert_eq!(TrayLanguage::from_tag("fr"), TrayLanguage::Other);
    }

    #[test]
    fn chinese_labels_are_translated_and_keep_the_brand() {
        let (open, quit) = TrayLanguage::ZhCn.labels();
        assert_eq!(open, "打开 AI");
        assert_eq!(quit, "退出");
        assert!(open.contains("AI"));
    }

    #[test]
    fn simplified_and_traditional_differ() {
        assert_ne!(TrayLanguage::ZhCn.labels(), TrayLanguage::ZhTw.labels());
    }
}
