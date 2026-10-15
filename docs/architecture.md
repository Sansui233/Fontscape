# 架构

## 调用链

```
React 组件 → Zustand store → src/lib/tauri-api.ts (invoke)
          → src-tauri/src/commands.rs → font / filters / settings / persistence
          → 文件系统 · SQLite · Windows API
```

## Tauri commands

| command | 前端封装 | 状态 |
| --- | --- | --- |
| `scan_fonts` | `scanFonts` | ✅ 全量扫描，返回 `FontState` |
| `refresh_fonts` | `refreshFonts` | ✅ 目前等同于 `scan_fonts` |
| `toggle_font` | `toggleFont` | ❌ 空实现 |
| `check_glyphs_in_font` | `checkGlyphsInFont` | ✅ 每次都读整个文件，见 font-parsing.md |
| `open_in_explorer` | `openInExplorer` | ✅ 仅 Windows |
| `bootstrap_app` | `bootstrapApp` | ✅ 一次返回字体、Filter、选项、设置 |
| `create_filter` / `update_filter` / `delete_filter` | 同名 | ✅ 失败时返回 `{code, message}` |
| `save_ui_state` / `save_preferences` | 同名 | ✅ 由 `lib/settings-sync.ts` 防抖调用 |
| `get_app_info` / `reset_database` | 同名 | ✅ 设置页使用；重建时先备份原文件 |
| `move_filter` / `create_folder` / `rename_folder` / `move_folder` / `delete_folder` | 同名 | ✅ 文件夹树；`delete_folder` 返回随之删除的筛选 ID |
| `show_snap_layouts` | — | ✅ 仅 Windows，模拟 Win+Z |

`main.rs` 的 setup 阶段创建 `AppState { database_path, services: RwLock<Result<AppServices, String>> }`。数据库打不开时应用照常启动，相关 command 返回 `database_unavailable`。重建数据库后会原地替换 services，不需要重启。

## 前端

**路由**（`src/router.tsx`，React Router 7）

| 路径 | 页面 |
| --- | --- |
| `/` | `HomePage` → `FontGrid` |
| `/list` | `ListView` |
| `/family/:familyName` | `FontFamilyPage`，以 overlay 形式显示，右侧是 `RightSidebar` |

`App` 调用 `useFonts()` 扫描一次，再通过 `Outlet context` 把 `fontState` 和 `isLoading` 传下去。`Sidebar` 又调用了一次 `useFonts()`，所以会重复扫描，需要改为只从 store 读取。

**Store**

| store | 内容 |
| --- | --- |
| `fontStore` | `fontState`、`isLoading`、`updateFontStatus`、`getFontById`、`getFontsByCssFamily` |
| `uiStore` | 视图模式、预览文本和字号、详情预览的字号/字重/斜体、右侧栏宽度、界面语言、侧栏折叠、多选状态、`filters { languages, tags, searchText }` |

计划新增 `filterStore`，用来保存 Filter 列表、当前条件和增删改 action（见 plan 文档 §4）。

**类型**：`src/types/font.ts` 对应 `font/models.rs` 和 `state.rs`；`filter.ts` 对应 `filters/models.rs`；`application.ts` 对应 `settings/models.rs` 和 `bootstrap.rs`。改一边必须同步另一边，字段统一用 snake_case。

## 后端模块

| 模块 | 职责 |
| --- | --- |
| `font/` | 扫描解析（scanner）、模型（models）、family 聚合（state）、字形检查（check） |
| `filters/` | `service` 负责名称（1–64 字符，不区分大小写去重）和条件非空的校验；`repository` 负责 SQL |
| `settings/` | `PersistedUiState`、`UserPreferences` 的类型和默认值。还没有读写代码 |
| `persistence/` | `Database`（每次操作新开一个连接，`busy_timeout` 5s，开启外键）、migrations、`PersistenceError` |
| `bootstrap.rs` | `BootstrapPayload` 结构 |
| `app_state.rs` | `AppServices { database, filters }` |

## SQLite（`<app_data_dir>/fontscape.db`）

| 表 | 用途 | 使用情况 |
| --- | --- | --- |
| `schema_migrations` | 已执行的结构升级版本（当前为 v2） | ✅ |
| `saved_filters` | Filter，`group_name` 为 `language` 或 `saved`，条件存 JSON，`folder_id` 指向文件夹 | ✅ |
| `filter_folders` | 「已存筛选」中的文件夹，`parent_id` 实现嵌套（v3） | ✅ |
| `app_settings` | 按 `namespace`（ui_state / preference）和 `key` 存储 | ❌ 未使用 |
| `font_file_cache` | 按文件路径缓存解析结果 | ❌ 未使用 |

- v1 建表，并写入 7 个 Language preset。
- v2 把旧的 `styles` 条件改为 `categories`；遇到非空的旧值时拒绝升级，不改动原数据。
- 数据库版本比程序支持的版本新时，拒绝启动。

## 启动流程

**现状**：setup 打开数据库 → 前端挂载 → `scan_fonts` 全量解析（Sidebar 会再触发一次）→ 渲染。

**目标**：只调用一次 `bootstrap_app` → 后端做增量扫描，同时读取 Filter 和设置 → 前端恢复状态后再显示可操作的界面。详见 plan 文档 §3。

## 约定

- 组件不直接调用 `invoke`；前端不直接访问数据库。
- 需要持久化的写操作，必须等后端写入成功后才更新前端状态。
- 只在 Windows 上可用的代码要加 `#[cfg(target_os = "windows")]`。
- 不引入新的 UI 组件库。颜色和圆角使用 `src/styles/globals.css` 中的 token。
