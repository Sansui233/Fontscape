# 字体缓存与更新时机

> 状态：**启动与手动刷新已完成**；焦点触发、写操作更新、字形检查缓存仍是计划。缓存规则（键、失效条件、错误处理）沿用 [filter-persistence-font-cache-plan.md](filter-persistence-font-cache-plan.md) §3，本文不重复，只回答「什么时候更新」。

## 现状

实现在 `src-tauri/src/font/cache.rs`（`FontCache`）：

- `load()`：只读缓存，返回当前版本的全部字体；没有时返回 None。
- `reconcile(force)`：列目录 → 对比 → 并行解析新增 / 变化的文件 → 一个事务写回，返回 `FontState` 和 `FontChanges`。解析失败的文件写入空结果，文件不变时不再重复解析。
- 缓存键是小写路径；版本号 = `PARSER_SCHEMA_VERSION * 1000 + CLASSIFIER_VERSION`。

启动时**先显示缓存，再在后台对比**（用户决定，取代下文「同步执行」的设想）：有变化时发送 `fonts_changed`，右上角标题栏下方显示「新增 n，修改 n，删除 n」，带 Refresh 和关闭按钮。没有可用缓存时同步解析。

## 核心：一次增量对比（reconcile）

```
列目录 → 对每个文件 stat（大小、修改时间）
→ 与缓存对比：未变 = 复用；新增 / 变化 / 版本不同 = 重新解析；确认不存在 = 删除记录
→ 单个事务写回 → 返回新的 FontState
```

- 版本号 = `PARSER_SCHEMA_VERSION` 与 `CLASSIFIER_VERSION` 组合，任何一个变了都整体重新解析。
- stat 上千个文件只需几十毫秒，所以**启动时同步执行**即可，不必先显示旧数据再后台校正。第一次启动没有缓存时显示进度。
- 读目录失败时保留该目录的缓存，不当作文件已删除。

## 触发时机

| 时机 | 做什么 | 版本 |
| --- | --- | --- |
| 启动 | 返回缓存，后台 reconcile，有变化时提示（已完成） | 第一版 |
| 本应用的写操作（安装、卸载、启用、禁用、增删目录） | 后端只更新受影响的文件，直接返回变化，不重扫 | 第一版 |
| 手动刷新 | reconcile（已完成）；强制解析入口是 `scan_fonts`，界面还没有 | 第一版 |
| 窗口重新获得焦点 | reconcile，最多每 30 秒一次，用于发现外部安装的字体 | 第一版 |
| 目录监听（`notify` 库，底层 ReadDirectoryChangesW） | 防抖 1–2 秒后对该目录做 reconcile | 按需：焦点触发不够时再加 |
| 注册表变化（`RegNotifyChangeKeyValue`） | 重新读启用状态，不重新解析文件 | 和启用 / 禁用一起做 |

运行中产生的变化通过事件 `fonts_changed` 推给前端，载荷是完整的 `FontState`，fontStore 整体替换。上千个字体约 1–2MB，可以接受；以后有需要再改成增量。

## 顺带：字形检查缓存

`check_glyphs_in_font` 每张卡片调用一次，每次都重新映射并解析文件。在后端加一个按路径的 LRU，缓存已解析的 cmap（约 20 个），或者改成一次检查多个字体的批量接口。这是 `feature-status.md` 中的第 2 优先级，和缓存一起做。

## 改动点

- `font/cache.rs`（新）：reconcile、读写 `font_file_cache`。
- `scanner.rs`：拆出「解析单个文件」，供 cache 调用。
- `commands.rs`：`bootstrap_app`、`refresh_fonts(force)` 改走 cache；新增 `fonts_changed` 事件。
- 前端：监听事件；在窗口获得焦点时调用刷新。

## 验收

- 第二次启动，未变化的文件解析次数为 0（加计数日志验证）。
- 在资源管理器中安装一个字体，切回应用后能看到它。
- 修改 `CLASSIFIER_VERSION` 后启动，所有字体都重新分类。
