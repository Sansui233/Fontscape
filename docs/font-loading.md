# 按文件加载字体（共用基础）

> 状态：**计划**。被 font-directories / font-management / font-combination 依赖。

## 问题

预览按 family 名引用系统字体，只对「已安装且已启用」的字体有效。另外，两个不同文件声明同一个 family 名时，浏览器只会选其中一个，详情页可能显示错字体。

## 方案

**后端：自定义 URI 协议**

- 用 Tauri 的 `register_asynchronous_uri_scheme_protocol` 注册 `fontfile://`。前端请求 `fontfile://localhost/<font_id>`。
- 后端在当前 `FontState` 中按 id 查文件路径，只返回已知字体，不接受任意路径。所以不需要开放 asset protocol 的目录范围。
- 返回 `font/ttf` 或 `font/otf`，加 `Cache-Control: max-age`，让 WebView 自己缓存。
- **TTC**：Chromium 不能选择集合里的第 n 个 face。后端把该 face 抽成独立的 sfnt 再返回：复制它的 offset table 和引用到的表，重写偏移即可，不需要子集化。结果按 id 缓存在内存（LRU）。

**前端：`useFontFace(font)`**

- 已安装、已启用、family 名在库里唯一：照旧用 family 名，零开销。
- 其他情况：注册 `new FontFace("fs-<id>", "url(fontfile://localhost/<id>)")`，返回 `"fs-<id>"` 作为 CSS family。
- 引用计数：卡片离开虚拟列表时减一；计数为 0 的放进 LRU（上限约 40 个），超出时调用 `document.fonts.delete` 释放。中文字体单个就有 10–30MB，必须控制数量。
- 加载期间显示占位，不先用回退字体渲染。

## 改动点

| 位置 | 内容 |
| --- | --- |
| `font/serve.rs`（新） | 协议处理、TTC 抽取、内存 LRU |
| `main.rs` | 注册协议 |
| `src/lib/font-face.ts`（新） | 注册 / 引用计数 / LRU |
| FontCard、ListRow、详情页 | 改用 `useFontFace` 返回的 family |

`checkGlyphsInFont` 继续按路径工作，不受影响。

## 验收

- 禁用一个字体（或用一个未安装的文件）后，预览仍是这个字体本身。
- 快速滚动 Grid 时内存稳定，不会无限增长。
- TTC 第 2 个 face（如 `msyh.ttc` 里的 Microsoft YaHei UI）预览正确。
