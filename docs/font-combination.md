# 字体组合编辑器

> 状态：**暂缓**（2026-10-16）。功能含义以后再讨论，本阶段不做。下文是按「中西文混排」写的草案，仅供讨论时参考；「标题 / 正文搭配」可作为模板之一。依赖 [font-loading.md](font-loading.md)。

## 目标

中文排版常常是西文用 A、中文用 B，标点和数字再单独指定。用户在这里把几个字体按字符范围拼成一个「组合」，实时预览混排效果，调整大小和基线，然后导出给 CSS / Typst 使用。

## 实现原理

浏览器原生支持：多个 `@font-face` 使用同一个 family 名，各自声明 `unicode-range`，浏览器会逐字选择字体。

```css
@font-face { font-family: "combo-1"; src: local("Inter-Regular");  unicode-range: U+0000-024F; size-adjust: 104%; }
@font-face { font-family: "combo-1"; src: local("SourceHanSansSC-Regular"); unicode-range: U+3000-303F, U+4E00-9FFF, U+FF00-FFEF; }
```

- 已安装的字体用 `local(<postscript_name>)`，其他字体用 `url(fontfile://localhost/<id>)`。
- 大小用 `size-adjust`，基线用 `ascent-override` / `descent-override`，Chromium 都支持。
- 不生成新的字体文件。

## 数据

新表 `font_combinations (id, name, slots_json, created_at, updated_at)`。

```
Slot {
  role: "latin" | "cjk" | "digits" | "punct" | "custom",
  unicode_range: string,     // 预设角色有默认值，custom 时由用户填写
  family: string,            // css_font_family
  weight: number | null,     // null = 跟随预览字重
  size_adjust: number,       // 80–120（%）
  baseline_shift: number,    // -20–20（‰ em），换算成 ascent/descent-override
}
```

槽位顺序就是优先级：靠前的槽位覆盖靠后的槽位的重叠范围（例如「数字」放在「西文」前面）。

## 界面

- 路由 `/combination/:id`，与详情页一样以 overlay 打开；Sidebar 增加「组合」组，可以新建、重命名、删除（沿用 Filter 的写操作规则）。
- 左侧是槽位列表：选择字体（下拉框 + 搜索，复用 `useFontNames`）、大小、基线、字重；可以拖动排序。
- 右侧是预览：使用预设模板（标题、正文段落、中英混排、数字和标点），也可以自定义文本；字号和行高滑块；可以叠加基线和 x-height 参考线，用来对齐中西文。
- 详情页增加「加入组合」：把当前字体作为某个槽位，打开编辑器。

## 导出

- **CSS**：复制上面那组 `@font-face` 和 `font-family` 声明。
- **Typst**：`#set text(font: ((name: "Inter", covers: "latin-in-cjk"), "Source Han Sans SC"))`。Typst 不支持 size-adjust，导出时注明。
- 暂不做：合并成一个物理字体文件、写入系统 FontLink。

## 验收

- 混排预览中，每个字符都来自它所属槽位的字体（借助 DevTools 的 Rendered Fonts 核对）。
- 调整「西文」槽位的大小时，中文不动。
- 重启后组合仍在；导出的 CSS 在普通网页中效果一致。
