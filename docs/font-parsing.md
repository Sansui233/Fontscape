# 字体扫描与解析

代码：`src-tauri/src/font/scanner.rs`、`state.rs`、`check.rs`、`models.rs`。

## 扫描流程

```
FontScanner::scan_all_fonts
  → 遍历 C:\Windows\Fonts、%LOCALAPPDATA%\Microsoft\Windows\Fonts（不递归）
  → 按扩展名筛出 ttf / otf / ttc（不区分大小写）
  → parse_font：读整个文件；TTC 用 fonts_in_collection 得到 face 数
  → 每个 face 生成一个 FontInfo
  → FontState::new 按 css_font_family 聚合
```

- 单个文件解析失败只记录日志，不会中断整个扫描。目录不存在时直接跳过。
- 目前是串行解析，也没有缓存。缓存设计见 `filter-persistence-font-cache-plan.md` §3。

## FontInfo 字段来源

| 字段 | 来源 |
| --- | --- |
| `id` | `md5(path-family-style)` |
| `family` / `full_name` / `postscript_name` | Name ID 1 / 4 / 6。优先取英文（0x0409），否则取第一个 Unicode 记录；都没有时回退到 family，最后是 `"Unknown"` |
| `style` | Name ID 2，默认 `"Regular"`。表示字形样式，**不是分类** |
| `category` | 暂时始终为 `None`（分类未实现） |
| `family_zh` / `full_name_zh` | Name ID 1 / 4，按 0x0804（简体）→ 0x1004（新加坡）→ 0x0404（繁体）的顺序查找 |
| `css_font_family` | Name ID 16 → 1 → 21 → `"Unknown"`，与浏览器匹配 family 的优先级一致 |
| `weight` | 可变字体取 `fvar` 中 `wght` 轴的默认值，否则取 OS/2 `usWeightClass` |
| `is_variable` | `Face::is_variable()` |
| `format` | 由扩展名决定。⚠️ 这里区分大小写，`.TTC` 会被当成单 face 文件。WOFF / WOFF2 枚举已预留，但不会被扫描 |
| `metadata` | Name ID 0–14、16–20 全部提取，规则同上（英文优先） |
| `status` | family 名包含系统字体名单中的名字时为 `SystemFont`，否则为 `Enabled`。从不会是 `Disabled` |
| `created_at` | 扫描时的时间戳，**不是安装时间** |

## 字符集与语言检测

通过检查代表字是否都有字形（`glyph_index`）来判断：

| charset | 代表字 | 推导出的语言 |
| --- | --- | --- |
| Latn | A a | English（仅当没有任何 CJK charset 时） |
| Hans | 觉 天 黄 龙 | Chinese |
| Hant | 獨 聲 壞 | Chinese |
| Jpan | あ 壊 | Japanese |
| Kore | 가 | Korean |
| Cyrl | А я | Russian |
| Arab | ا | Arabic |

- 什么都没检测到时，charset 和语言都记为 `Unknown`。
- `scripts` 和 `charsets` 的内容相同，只是为了兼容保留。
- 这是代表字启发式，不是严格的覆盖率统计。只含少量汉字的符号字体，可能被误判为 Chinese。

## 家族聚合（FontState）

- 按 `css_font_family` 分组，family 名按小写排序。
- 每个 family 的 `default_font_id` 取 `weight` 最接近 400 的那个 face。
- Grid 卡片、Sidebar 计数和当前的过滤逻辑都**只看默认 face**。新的 `font-filter.ts` 会检查 family 中的所有 face。

## 字形检查（check.rs）

`check_glyphs_in_font(path, text)` 逐字符返回该字体是否有这个字形。前端用它把缺失的字符换成 `□`，避免浏览器回退到其他字体，让用户误以为这个字体支持该字。

**已知问题**：

- 每次调用都会重新读取并解析整个文件，而且只解析 face 0，TTC 的其他 face 结果可能不准。
- 每张卡片、每一行都会单独调用一次。

应改为缓存，或提供批量接口。

## 前端显示规则

- 显示名称：`language === "zh-CN"` 且存在 `family_zh` 时显示中文名，否则显示 `family`。
- CSS 中统一写成 `fontFamily: "<css_font_family>", sans-serif`，再配合 `fontWeight: weight` 选中具体的 face。
