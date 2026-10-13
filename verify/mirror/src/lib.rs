//! Compile-time and runtime validation of the mirror rewrite logic that lives in
//! `src-tauri/src/core/downloads/helpers.rs`.
//!
//! This crate exists because the full `src-tauri` build cannot complete in this
//! environment: `ring v0.17.14` (a transitive TLS dependency) fails in its
//! cc-rs C build with MSVC D8050, and that failure is entirely unrelated to the
//! mirror change. Extracting the functions here lets the real Rust compiler
//! typecheck and execute the exact logic under test.
//!
//! The function bodies below are copied verbatim from helpers.rs.

use url::Url;

// ---- verbatim from helpers.rs ----

const JAN_MIRROR_PREFIX_STABLE: &str = match option_env!("JAN_HF_MIRROR_PREFIX") {
    Some(prefix) if !prefix.is_empty() => prefix,
    _ => "https://apps.jan.ai/",
};
const JAN_MIRROR_PREFIX_NIGHTLY: &str = match option_env!("JAN_HF_MIRROR_PREFIX") {
    Some(prefix) if !prefix.is_empty() => prefix,
    _ => "https://apps-nightly.jan.ai/",
};

const JAN_MIRROR_STRIPS_HOST: bool = match option_env!("JAN_HF_MIRROR_STRIP_HOST") {
    Some(value) => !value.is_empty(),
    None => false,
};

const MIRROR_DOMAINS: &[&str] = &["huggingface.co"];

fn is_nightly_build() -> bool {
    let pkg_name = env!("CARGO_PKG_NAME");
    pkg_name.to_lowercase().contains("nightly")
}

fn get_mirror_prefix() -> String {
    let raw = if is_nightly_build() {
        JAN_MIRROR_PREFIX_NIGHTLY
    } else {
        JAN_MIRROR_PREFIX_STABLE
    };

    let trimmed = raw.trim_end_matches('/');
    format!("{trimmed}/")
}

pub fn convert_to_mirror_url(url: &str) -> Option<String> {
    let parsed = Url::parse(url).ok()?;
    let host = parsed.host_str()?;

    if MIRROR_DOMAINS
        .iter()
        .any(|domain| host == *domain || host.ends_with(&format!(".{}", domain)))
    {
        let url_without_scheme = url
            .strip_prefix("https://")
            .or_else(|| url.strip_prefix("http://"))?;

        let path = if JAN_MIRROR_STRIPS_HOST {
            url_without_scheme
                .strip_prefix(host)
                .map(|rest| rest.trim_start_matches('/'))
                .unwrap_or(url_without_scheme)
        } else {
            url_without_scheme
        };

        Some(format!("{}{}", get_mirror_prefix(), path))
    } else {
        None
    }
}

// ---- tests mirroring src-tauri/src/core/downloads/tests.rs ----

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rewrite_keeps_host_by_default() {
        // Without JAN_HF_MIRROR_STRIP_HOST the upstream apps.jan.ai layout must
        // be preserved exactly, so an unconfigured fork behaves like upstream.
        if JAN_MIRROR_STRIPS_HOST {
            return;
        }
        let url = "https://huggingface.co/some/repo/resolve/main/model.gguf";
        let m = convert_to_mirror_url(url).expect("should mirror");
        assert!(m.starts_with("https://apps") && m.contains(".jan.ai/"), "{m}");
        assert!(m.ends_with("huggingface.co/some/repo/resolve/main/model.gguf"), "{m}");
    }

    #[test]
    fn strip_host_produces_bare_path() {
        if !JAN_MIRROR_STRIPS_HOST {
            return;
        }
        let url = "https://huggingface.co/some/repo/resolve/main/model.gguf";
        let m = convert_to_mirror_url(url).expect("should mirror");
        assert_eq!(m, "https://hf-mirror.com/some/repo/resolve/main/model.gguf");
    }

    #[test]
    fn query_string_survives() {
        let url = "https://huggingface.co/api/models/microsoft/DialoGPT-medium?blobs=true&files_metadata=true";
        let m = convert_to_mirror_url(url).expect("should mirror");
        assert!(m.ends_with("?blobs=true&files_metadata=true"), "{m}");
    }

    #[test]
    fn prefix_never_fuses_with_path() {
        // Regression: a prefix without a trailing slash used to yield
        // "https://hf-mirror.comsome/repo/..." — the host and path ran together.
        let m = convert_to_mirror_url("https://huggingface.co/a/b").expect("should mirror");
        assert!(!m.contains(".comsome"), "host fused with path: {m}");
        // The segment after the scheme must begin with the mirror host followed
        // by a slash, never a bare concatenation.
        let after_scheme = m.strip_prefix("https://").expect("https prefix");
        assert!(
            after_scheme.starts_with("apps.jan.ai/") || after_scheme.starts_with("hf-mirror.com/"),
            "mirror host not followed by '/': {m}"
        );
        assert!(m.ends_with("/a/b"), "{m}");
    }

    #[test]
    fn non_mirror_domains_untouched() {
        assert!(convert_to_mirror_url("https://example.com/file.bin").is_none());
        assert!(convert_to_mirror_url("https://github.com/x/y").is_none());
        assert!(convert_to_mirror_url("https://huggingface.co.evil.com/file").is_none());
        assert!(convert_to_mirror_url("not a url").is_none());
        assert!(convert_to_mirror_url("").is_none());
    }

    #[test]
    fn http_scheme_also_rewritten() {
        let m = convert_to_mirror_url("http://huggingface.co/file").expect("should mirror");
        assert!(!m.contains("http://huggingface.co"), "{m}");
        assert!(m.ends_with("/file"), "{m}");
    }

    #[test]
    fn subdomain_is_mirrored() {
        let m = convert_to_mirror_url("https://cdn.huggingface.co/f.bin").expect("subdomain");
        assert!(m.ends_with("/f.bin"), "{m}");
    }

    #[test]
    fn deterministic() {
        let u = "https://huggingface.co/second-state/All-MiniLM-L6-v2-Embedding-GGUF/resolve/main/all-MiniLM-L6-v2-ggml-model-f16.gguf";
        assert_eq!(convert_to_mirror_url(u), convert_to_mirror_url(u));
    }

    #[test]
    fn empty_env_values_are_treated_as_unset() {
        // Regression: `option_env!(..).is_some()` is true for an empty string, so
        // a build system that exports every variable it was handed (GitHub
        // Actions does exactly this for `${{ inputs.x }}` when x is blank) would
        // enable host-stripping and rewrite the prefix to "" — producing a
        // scheme-less URL and 404ing every download.
        //
        // This test is run three ways by verify/run.ps1; the assertion below is
        // the invariant that must hold in all of them.
        let m = convert_to_mirror_url("https://huggingface.co/a/b").expect("should mirror");
        assert!(
            m.starts_with("https://"),
            "empty prefix leaked into the rewrite: {m}"
        );
        assert!(m.ends_with("/a/b"), "{m}");

        if std::env::var("JAN_HF_MIRROR_PREFIX").map_or(false, |v| v.is_empty()) {
            panic!("harness error: the empty-prefix case must not be exported as an empty string");
        }
    }
}
