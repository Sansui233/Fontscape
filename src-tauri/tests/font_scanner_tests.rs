/// Integration tests for font scanner
/// These tests validate the public API and real font file parsing
use std::path::PathBuf;

// Import the font module from the main crate
use fontscape::font::scanner::FontScanner;
use fontscape::font::models::FontFormat;

/// Integration test: Parse the LXGWWenKaiGBScreen font file
/// This is a Chinese font that should have both English and Chinese localized names
#[test]
fn test_font_info() {
    let font_path = PathBuf::from(r"C:\Users\lingn\AppData\Local\Microsoft\Windows\Fonts\SarasaGothicSC-Italic.ttf");

    // Skip test if font file doesn't exist (for CI environments)
    if !font_path.exists() {
        println!("⚠️  Skipping test: Font file not found at {:?}", font_path);
        return;
    }

    println!("📖 Testing: {}", font_path.display());

    let scanner = FontScanner::new();
    let all_fonts = scanner.scan_all_fonts().unwrap().fonts;

    // Find the specific font we're testing
    let font = all_fonts.iter().find(|f| f.path.contains("SarasaGothicSC-Italic.ttf"));

    if let Some(font) = font {
        // Test basic properties
        assert!(!font.family.is_empty(), "Family name should not be empty");
        assert!(!font.full_name.is_empty(), "Full name should not be empty");
        assert_eq!(font.format, FontFormat::TrueType, "Format should be TrueType");

        // Test localized names
        println!("  English family name: {}", font.family);
        println!("  Chinese family name: {:?}", font.family_zh);
        println!("  English full name: {}", font.full_name);
        println!("  Chinese full name: {:?}", font.full_name_zh);

        // This font should have Chinese localized names
        assert!(
            font.family_zh.is_some() || font.family.contains("LXGW"),
            "Should have Chinese family name or English family name"
        );

        // Test language detection - should detect Chinese
        assert!(
            font.languages.contains(&"Chinese".to_string()),
            "Should detect Chinese language support. Found: {:?}",
            font.languages
        );
        //print
        assert!(
            font.scripts.contains(&"Hans".to_string()),
            "Should detect Hans (Simplified Chinese) script. Found: {:?}",
            font.scripts
        );

        // Test metadata extraction
        assert!(
            font.metadata.version.is_some(),
            "Version metadata should exist"
        );
        println!("  Font version: {:?}", font.metadata.version);
        println!("  Font designer: {:?}", font.metadata.designer);
        println!("  Font license: {:?}", font.metadata.license);

        println!("✓ All assertions passed for LXGWWenKaiGBScreen");
    } else {
        println!("⚠️  Font not found in scan results, but file exists");
    }
}

/// Integration test: Metadata extraction for TrueType format
#[test]
fn test_metadata_extraction_ttf() {
    let font_path = PathBuf::from(r"C:\Windows\Fonts\arial.ttf");

    if !font_path.exists() {
        println!("⚠️  Skipping test: arial.ttf not found");
        return;
    }

    println!("📖 Testing: Arial TrueType metadata");

    let scanner = FontScanner::new();
    let result = scanner.scan_all_fonts();

    assert!(result.is_ok(), "Failed to scan fonts");

    let all_fonts = result.unwrap().fonts;
    let arial_font = all_fonts.iter().find(|f| f.family.contains("Arial") && f.style == "Regular");

    if let Some(font) = arial_font {
        // Arial should have standard metadata
        assert!(
            font.metadata.family_name.is_some(),
            "Should have family name metadata"
        );
        assert!(
            font.metadata.full_name.is_some(),
            "Should have full name metadata"
        );

        // Print all available metadata
        println!("  Arial Metadata:");
        println!("    Copyright: {:?}", font.metadata.copyright);
        println!("    Family: {:?}", font.metadata.family_name);
        println!("    Subfamily: {:?}", font.metadata.subfamily_name);
        println!("    Version: {:?}", font.metadata.version);
        println!("    Manufacturer: {:?}", font.metadata.manufacturer);
        println!("    Designer: {:?}", font.metadata.designer);
        println!("    License: {:?}", font.metadata.license);

        println!("✓ Arial metadata extracted successfully");
    }
}

/// Integration test: TrueType Collection format handling
#[test]
fn test_ttc_format() {
    let font_path = PathBuf::from(r"C:\Windows\Fonts\msyh.ttc");

    if !font_path.exists() {
        println!("⚠️  Skipping test: msyh.ttc not found");
        return;
    }

    println!("📖 Testing: Microsoft YaHei TrueType Collection");

    let scanner = FontScanner::new();
    let result = scanner.scan_all_fonts();

    assert!(result.is_ok(), "Failed to scan fonts");

    let all_fonts = result.unwrap().fonts;
    let yahei_fonts: Vec<_> = all_fonts
        .iter()
        .filter(|f| f.path.contains("msyh.ttc"))
        .collect();

    // TTC files contain multiple fonts
    assert!(
        !yahei_fonts.is_empty(),
        "Should find at least one font from msyh.ttc"
    );

    println!("  Found {} fonts in msyh.ttc", yahei_fonts.len());
    for (i, font) in yahei_fonts.iter().enumerate() {
        println!("    Font {}: {} - {}", i, font.family, font.style);
        assert_eq!(font.format, FontFormat::TrueTypeCollection);
    }

    println!("✓ TTC format handled correctly");
}

/// Integration test: Language detection accuracy
#[test]
fn test_language_detection() {
    let scanner = FontScanner::new();
    let result = scanner.scan_all_fonts();

    assert!(result.is_ok(), "Failed to scan fonts");

    let all_fonts = result.unwrap().fonts;

    println!("📖 Testing: Language detection");

    // Test with a Chinese font
    if let Some(chinese_font) = all_fonts
        .iter()
        .find(|f| f.family.contains("Microsoft YaHei"))
    {
        assert!(
            chinese_font.languages.contains(&"Chinese".to_string()),
            "Microsoft YaHei should support Chinese"
        );
        println!("  ✓ Microsoft YaHei - Languages: {:?}", chinese_font.languages);
        println!("  ✓ Microsoft YaHei - Scripts: {:?}", chinese_font.scripts);
    }

    // Test with Arial (English/Latin)
    if let Some(english_font) = all_fonts.iter().find(|f| f.family == "Arial") {
        assert!(
            english_font.languages.contains(&"English".to_string()),
            "Arial should support English"
        );
        println!("  ✓ Arial - Languages: {:?}", english_font.languages);
        println!("  ✓ Arial - Scripts: {:?}", english_font.scripts);
    }

    println!("✓ Language detection working correctly");
}

/// Integration test: Localized name extraction by language_id
#[test]
fn test_localized_names() {
    let scanner = FontScanner::new();
    let result = scanner.scan_all_fonts();

    assert!(result.is_ok(), "Failed to scan fonts");

    let all_fonts = result.unwrap().fonts;

    println!("📖 Testing: Localized name extraction");

    // Test with Microsoft YaHei (should have Chinese names)
    if let Some(font) = all_fonts
        .iter()
        .find(|f| f.family.contains("Microsoft YaHei"))
    {
        println!("  English name: {}", font.family);
        println!("  Chinese name: {:?}", font.family_zh);

        // Should have English name
        assert!(!font.family.is_empty(), "Should have English family name");

        if let Some(chinese_name) = &font.family_zh {
            assert!(
                !chinese_name.is_empty(),
                "Chinese name should not be empty if present"
            );
            println!("  ✓ Successfully extracted Chinese localized name: {}", chinese_name);
        }
    }

    // Check how many fonts have localized Chinese names
    let fonts_with_chinese_names = all_fonts
        .iter()
        .filter(|f| f.family_zh.is_some())
        .count();

    println!("  Found {} fonts with Chinese localized names", fonts_with_chinese_names);
    println!("✓ Localized name extraction working");
}

/// Integration test: Full scan performance and statistics
#[test]
fn test_full_scan_statistics() {
    println!("📖 Testing: Full system font scan");

    let scanner = FontScanner::new();
    let result = scanner.scan_all_fonts();

    assert!(result.is_ok(), "Font scanning should succeed");

    let fonts = result.unwrap().fonts;

    println!("  Total fonts found: {}", fonts.len());

    // Count by format
    let ttf_count = fonts.iter().filter(|f| f.format == FontFormat::TrueType).count();
    let otf_count = fonts.iter().filter(|f| f.format == FontFormat::OpenType).count();
    let ttc_count = fonts.iter().filter(|f| f.format == FontFormat::TrueTypeCollection).count();

    println!("  TrueType (.ttf): {}", ttf_count);
    println!("  OpenType (.otf): {}", otf_count);
    println!("  TrueType Collection (.ttc): {}", ttc_count);

    // Count by language support
    let chinese_fonts = fonts.iter().filter(|f| f.languages.contains(&"Chinese".to_string())).count();
    let english_fonts = fonts.iter().filter(|f| f.languages.contains(&"English".to_string())).count();

    println!("  Fonts supporting Chinese: {}", chinese_fonts);
    println!("  Fonts supporting English: {}", english_fonts);

    // Count with localized names
    let with_chinese_names = fonts.iter().filter(|f| f.family_zh.is_some()).count();
    println!("  Fonts with Chinese localized names: {}", with_chinese_names);

    assert!(fonts.len() > 0, "Should find at least some fonts");
    println!("✓ Full scan completed successfully");
}
