# 功能完成度

> 基于 2026-10-16 的代码（含未提交改动）。对照 AGENTS.md 第 2 节需求逐条核对。
> 图例：✅ 完成　⚠️ 部分完成 / 有缺陷　❌ 未开始

## 总览

| 需求 | 状态 | 一句话结论 |
| --- | --- | --- |
| F1 扫描和读取 | ⚠️ | 能扫描、解析；没读注册表、没缓存、没并行 |
| F2 启用/禁用 | ❌ | 后端是空实现，前端却会把状态改掉 |
| F3 预览 | ⚠️ | Grid、List、实时预览可用；Grid 无字号控制，Paper View 未定义 |
| F4 详细信息 | ⚠️ | 元数据和预览模板齐全；没有导出样本 |
| F6 分类和过滤 | ⚠️ | 语言过滤可用；类型分类、标签、Filter 持久化未接通 |
| F7 右键菜单 | ⚠️ | 菜单与多选可用；Grid 的 Info 无效，批量操作没有 |
| U1 布局 | ⚠️ | 三栏 + 详情页完成；Sidebar 有多个占位项，设置按钮无功能 |
| U2 视觉 | ⚠️ | 黑白主题完成；暗色 token 已定义但无切换 |
| U3 响应式 / DPI | ⚠️ | 列数随窗口变化；高 DPI 未验证 |

## F1 字体扫描和读取

- ✅ 扫描 `C:\Windows\Fonts` 和 `%LOCALAPPDATA%\Microsoft\Windows\Fonts`，支持 TTF / OTF / TTC（多 face）。
- ✅ 解析 Name ID 0–20、中文名、CSS family、字重、可变字体、字符集。细节见 [font-parsing.md](font-parsing.md)。
- ❌ **没有读注册表**。只按目录扫描，所以无法区分已安装和仅存在文件的字体，也识别不了「已禁用」。
- ❌ **没有缓存**。每次启动都全量解析；`font_file_cache` 表已建，但还没用上。
- ⚠️ **解析是串行的**。依赖里有 `rayon`，但没有使用。
- ⚠️ **启动时会扫描两次**：`App` 和 `Sidebar` 各调用了一次 `useFonts()`。
- ⚠️ 判断格式时扩展名区分大小写（`Some("ttf")`），所以 `.TTC` 只会解析第一个 face，`.OTF` 会被标成 TrueType。

## F2 字体启用/禁用

- ❌ `commands.rs::toggle_font` 只打印日志，然后返回 `Ok`。
- ⚠️ **假成功**：`FontCard` 收到 Ok 后会调用 `updateFontStatus`，界面显示已禁用，但系统里什么都没变。
- ⚠️ 系统字体保护名单在 `scanner.rs::is_system_font`，内容是 Segoe UI / Microsoft YaHei / SimSun / Tahoma。设计文档里的 Arial 不在名单中。
- ❌ 备份、`WM_FONTCHANGE`、批量操作都没有。设计方案见 [font-enable-disable.md](font-enable-disable.md)。

## F3 字体预览

- ✅ **Grid**：按 family 分组，用虚拟滚动；窗口宽度 <640 / <1024 / ≥1024 时分别显示 1 / 2 / 3 列。卡片上有书角数量、状态点和 V（可变字体）标记。
- ✅ **List**：用虚拟滚动；Toolbar 里有字号、字重和斜体控制。
- ✅ **实时预览**：Topbar 的预览文本输入带 500ms 防抖；字体里没有的字形用 `□` 替代，避免浏览器回退到其他字体。
- ✅ 点击卡片会进入 `/family/:name` 详情页，Grid 和 List 都会恢复滚动位置。
- ⚠️ **字号滑块**：只有 List 和详情页有。Grid 固定为 `text-2xl`，`uiStore.previewSize` 定义了但没人用。
- ⚠️ **Paper View**：需求里有，但还没定义。现在最接近的是 List 视图。
- ⚠️ **本地化名称**：只支持中文（0x0804 / 0x1004 / 0x0404）。`uiStore.language` 写死为 `zh-CN`，没有切换入口。
- ⚠️ **性能隐患**：每张卡片、每一行都会调用一次 `check_glyphs_in_font`，后端每次都要完整读取并解析字体文件。中文字体一般有 10–30MB，预览文本一改，所有可见卡片都会重新读一遍。
- ❌ 字体懒加载没有做。系统字体通过 `local` family 名由 WebView 按需加载，是否需要再做懒加载，等实测后再决定。

## F4 字体详细信息

- ✅ `RightSidebar`：显示常用元数据，可以打开文件位置，可拖拽调整宽度（240–600px）。
- ✅ `FontInfoModal`：完整列出 Name ID 0–20，以及格式、大小、语言、脚本等信息。
- ✅ 预览模板：按字符集显示英文、简体、繁体、日文、韩文样张，可直接编辑；有字号、字重、斜体控制。
- ⚠️ 已定义的 `numbers` 模板没有使用；没有符号和 emoji 模板。
- ❌ 导出字体样本没有做。
- ⚠️ `FontInfoModal` 里的「Added」显示的是扫描时间，不是安装时间。

## F6 字体分类和过滤

- ✅ **语言检测**：用代表字判断字符集，再推导出语言。见 [font-parsing.md](font-parsing.md)。
- ✅ **家族分组**：按 `css_font_family` 分组。
- ⚠️ **语言过滤**：
  - Sidebar 只列出 Unknown / Chinese / English / Japanese 四种语言，计数只看 family 的默认 face。
  - Grid 和 List 各自复制了一份过滤代码，多语言之间用 AND，计划里是 OR。
  - 共用的 `src/lib/font-filter.ts` 已经写好，但还没接入。
- ⚠️ **搜索**：对 family、full_name 和中文名做子串匹配，只看默认 face。`fuse.js`、`pinyin-pro` 已安装但没用，所以拼音搜索还没有。
- ❌ **类型分类**：`FontInfo.category` 始终是 `null`，分类算法还没做。
- ❌ **自定义标签**：`uiStore.filters.tags` 只是预留字段。
- ⚠️ **持久化**（未提交的代码）：
  - SQLite、migrations、Filter service/repository 已完成，有测试。
  - 还没有对应的 Tauri command，前端也调不到。
  - settings 只有类型定义，没有读写。
  - `BootstrapPayload` 只有结构，没有 `bootstrap_app` command。
  - 进度和遗留问题见 [filter-persistence-font-cache-plan.md](filter-persistence-font-cache-plan.md)。

## F7 右键菜单

- ✅ `ContextMenu` 通过 portal 渲染到 body，会自动避开窗口边缘，按 Esc 或点击外部可以关闭。
- ⚠️ **Info**：Grid 没有给 `FontCard` 传 `onShowInfo`，点了没反应；详情页的 Info 正常。
- ✅ **Multi-select**：能进入多选模式并选中当前卡片，卡片上显示复选框，点击可切换选中。
- ⚠️ **多选工具栏**：只显示数量和 Cancel。需求里的「完成」按钮，以及批量启用、禁用、删除都没有。
- ⚠️ **Disable/Enable**：菜单文字会随状态变化，系统字体项是灰的；但它调用的是 F2 的空实现。
- ❌ List 视图没有右键菜单。

## UI / 布局

- **Topbar**：
  - ✅ 搜索（300ms 防抖，回车立即生效）、预览文本、Grid/List 切换、后退。
  - ⚠️ 前进按钮永远是禁用的；设置按钮没有功能。
- **Sidebar**：
  - ✅ 可折叠，折叠后悬停会展开。
  - ⚠️ Recently Added、Favorites、Enabled、Disabled 四项都是占位：没有点击行为，或计数固定为 0。
- **详情页**：✅ 以 overlay 形式覆盖主区域，用 React Router 路由。
- **主题**：⚠️ `.dark` 的 token 已经写好，但没有切换入口。

## 测试与质量

- ✅ `cargo test`：18 个测试全部通过，其中 12 个单元测试、6 个集成测试。集成测试依赖本机已安装的字体（如 LXGW WenKai），换一台机器可能失败。
- ✅ `tsc --noEmit` 通过。前端没有测试，按约定由用户手动验证。
- ⚠️ `FontCard` 在 early return 之后才调用 hooks，违反了 React 的 Rules of Hooks。另外 `font` 用 `useState` 冻结了初值，store 更新后不会跟着变。
- ⚠️ 有几个依赖装了但没用：`immer`、`fuse.js`、`pinyin-pro`、`@radix-ui/*`、`rayon`、`dashmap`。

## 建议优先级

1. **修正 F2 假成功**：在真正实现之前，`toggle_font` 应返回错误，或者先把菜单项禁用。
2. **去掉 Sidebar 的重复扫描**，Grid 和 List 统一改用 `font-filter.ts`（计划里的 Phase 3）。
3. **glyph 检查做缓存**：在后端缓存已解析的 face 或 cmap，或改成批量接口。
4. **补齐 Filter 持久化**：Phase 2–6，见 plan 文档。
5. **注册表读取 + 启用/禁用**（F1 + F2）。
6. **类型分类、标签、拼音搜索、导出样本。**
