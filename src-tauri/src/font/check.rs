use super::scanner::map_font_file;
use serde::{Deserialize, Serialize};
use std::path::Path;
use ttf_parser::Face;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlyphCheckResult {
    glyph: char,
    exists: bool,
}

/// 逐字符检查字体是否有对应字形；前端用 □ 替换缺失的字，避免浏览器回退到其他字体造成误解
pub fn check_glyphs(path: String, text: String) -> Result<Vec<GlyphCheckResult>, String> {
    // 只需查 cmap，映射文件即可，无需整文件读入
    let font_data = map_font_file(Path::new(&path))?;
    let face = Face::parse(&font_data[..], 0).map_err(|e| e.to_string())?;

    Ok(text
        .chars()
        .map(|glyph| GlyphCheckResult {
            glyph,
            exists: face.glyph_index(glyph).is_some(),
        })
        .collect())
}
