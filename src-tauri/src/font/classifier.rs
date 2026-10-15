//! 字体类型（Category）分类。
//!
//! 判定顺序：名称关键词 → post.isFixedPitch → OS/2 PANOSE → OS/2 sFamilyClass → Unknown。
//! 名称关键词放在最前，因为中日文字体的 PANOSE / sFamilyClass 经常缺失或填写错误。

pub const SERIF: &str = "Serif";
pub const SANS_SERIF: &str = "Sans Serif";
pub const MONOSPACE: &str = "Monospace";
pub const HANDWRITING: &str = "Handwriting";
pub const DECORATIVE: &str = "Decorative";
pub const UNKNOWN: &str = "Unknown";

/// 所有可能的分类值，前端选项与后端校验共用这份列表
pub const CATEGORIES: &[&str] = &[SERIF, SANS_SERIF, MONOSPACE, HANDWRITING, DECORATIVE, UNKNOWN];

/// 分类规则版本。规则变化时递增，供字体缓存判断是否需要重新解析。
pub const CLASSIFIER_VERSION: u32 = 1;

const MONOSPACE_KEYWORDS: &[&str] = &["mono", "code", "console", "consola", "courier", "等宽"];
const HANDWRITING_KEYWORDS: &[&str] = &[
    "script", "hand", "brush", "print", "kai", "楷", "行书", "行書", "草书", "草書", "手写", "手寫", "隶", "隸",
];
const DECORATIVE_KEYWORDS: &[&str] = &[
    "decorative", "ornament", "symbol", "dingbat", "emoji", "icons", "assets", "彩云", "琥珀",
];
const SANS_KEYWORDS: &[&str] = &[
    "sans", "gothic", "hei", "黑", "圆", "圓", "ゴシック", "grotesk", "yahei", "segoe", "arial", "helvetica",
    "verdana", "tahoma", "dengxian", "等线", "roboto", "gotham", "poppins", "sf pro",
];
const SERIF_KEYWORDS: &[&str] = &[
    "serif", "song", "宋", "ming", "明", "mincho", "明朝", "fangsong", "仿宋", "roman", "times", "garamond",
    "georgia", "cambria",
];

pub fn classify(face: &ttf_parser::Face, names: &[&str]) -> String {
    classify_by_names(names)
        .or_else(|| face.is_monospaced().then_some(MONOSPACE))
        .or_else(|| os2_table(face).and_then(classify_by_panose))
        .or_else(|| os2_table(face).and_then(classify_by_family_class))
        .unwrap_or(UNKNOWN)
        .to_string()
}

fn classify_by_names(names: &[&str]) -> Option<&'static str> {
    // 去掉会误命中关键词的常见词：Monotype（厂商名）含 mono，Unicode 含 code
    let joined = names
        .join(" ")
        .to_lowercase()
        .replace("monotype", "")
        .replace("unicode", "");
    let has = |keywords: &[&str]| keywords.iter().any(|keyword| joined.contains(keyword));

    // "Sans Serif" 同时包含 sans 和 serif，所以 sans 必须先于 serif 判断
    if has(MONOSPACE_KEYWORDS) {
        Some(MONOSPACE)
    } else if has(HANDWRITING_KEYWORDS) {
        Some(HANDWRITING)
    } else if has(DECORATIVE_KEYWORDS) {
        Some(DECORATIVE)
    } else if joined.contains("slab") {
        // Slab serif 常与无衬线家族同名（Roboto Slab），需先于 sans 判断
        Some(SERIF)
    } else if has(SANS_KEYWORDS) {
        Some(SANS_SERIF)
    } else if has(SERIF_KEYWORDS) {
        Some(SERIF)
    } else {
        None
    }
}

fn os2_table<'a>(face: &ttf_parser::Face<'a>) -> Option<&'a [u8]> {
    face.raw_face().table(ttf_parser::Tag::from_bytes(b"OS/2"))
}

/// PANOSE 位于 OS/2 偏移 32，共 10 字节
fn classify_by_panose(os2: &[u8]) -> Option<&'static str> {
    let panose = os2.get(32..42)?;
    let (family_type, serif_style, proportion) = (panose[0], panose[1], panose[3]);
    match family_type {
        2 if proportion == 9 => Some(MONOSPACE),
        2 => match serif_style {
            2..=10 => Some(SERIF),
            11..=15 => Some(SANS_SERIF),
            _ => None,
        },
        3 => Some(HANDWRITING),
        4 | 5 => Some(DECORATIVE),
        _ => None,
    }
}

/// sFamilyClass 位于 OS/2 偏移 30，高字节为类别
fn classify_by_family_class(os2: &[u8]) -> Option<&'static str> {
    match *os2.get(30)? {
        1..=5 | 7 => Some(SERIF),
        8 => Some(SANS_SERIF),
        9 | 12 => Some(DECORATIVE),
        10 => Some(HANDWRITING),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_common_names() {
        assert_eq!(classify_by_names(&["Noto Sans SC"]), Some(SANS_SERIF));
        assert_eq!(classify_by_names(&["Microsoft Sans Serif"]), Some(SANS_SERIF));
        assert_eq!(classify_by_names(&["Noto Serif CJK"]), Some(SERIF));
        assert_eq!(classify_by_names(&["SimSun", "宋体"]), Some(SERIF));
        assert_eq!(classify_by_names(&["SimHei", "黑体"]), Some(SANS_SERIF));
        assert_eq!(classify_by_names(&["LXGW WenKai"]), Some(HANDWRITING));
        assert_eq!(classify_by_names(&["Cascadia Code"]), Some(MONOSPACE));
        assert_eq!(classify_by_names(&["Segoe UI Emoji"]), Some(DECORATIVE));
        assert_eq!(classify_by_names(&["Bahnschrift"]), None);
        assert_eq!(classify_by_names(&["Arial Unicode MS"]), Some(SANS_SERIF));
        assert_eq!(classify_by_names(&["Monotype Corsiva"]), None);
        assert_eq!(classify_by_names(&["Open Sans SemiCondensed"]), Some(SANS_SERIF));
        assert_eq!(classify_by_names(&["Roboto Slab"]), Some(SERIF));
    }

    #[test]
    fn classifies_by_panose_and_family_class() {
        let mut os2 = vec![0u8; 42];
        os2[32] = 2;
        os2[33] = 11;
        assert_eq!(classify_by_panose(&os2), Some(SANS_SERIF));
        os2[35] = 9;
        assert_eq!(classify_by_panose(&os2), Some(MONOSPACE));
        os2[32] = 0;
        assert_eq!(classify_by_panose(&os2), None);
        os2[30] = 1;
        assert_eq!(classify_by_family_class(&os2), Some(SERIF));
        assert_eq!(classify_by_family_class(&[0u8; 10]), None);
    }
}
