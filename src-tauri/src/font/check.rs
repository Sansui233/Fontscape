use serde::{Deserialize, Serialize};
use ttf_parser::Face;
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlyphCheckResult {
    glyph: char,
    exists: bool,
}

pub fn check_glyphs(path: String, text: String) -> Result<Vec<GlyphCheckResult>, String> {
    // println!("Checking glyphs in text: {} for font: {}", &text, &path);
    
    // 读取字体文件
    let font_data = fs::read(&path).map_err(|e| e.to_string())?;
    // 解析字体
    let face = Face::parse(&font_data, 0).map_err(|e| e.to_string())?;

    let mut results = Vec::new();

    for c in text.chars() {
        // glyph_index 返回 Option<GlyphId>。
        // 绝大多数 TrueType/OpenType 字体中，如果字符不存在，会返回 None 或者 Index 0 (.notdef)
        // 注意：有些字体虽然有 index 0，但逻辑上代表缺失。
        // ttf-parser 的 glyph_index 如果没找到映射通常返回 None。
        results.push(GlyphCheckResult {
            glyph: c,
            exists: face.glyph_index(c).is_some(), 
        });
    }

    Ok(results)
}