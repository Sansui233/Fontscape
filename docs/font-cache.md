# 字体缓存与更新时机

> 状态：**计划**。缓存规则（键、失效条件、错误处理）沿用 [filter-persistence-font-cache-plan.md](filter-persistence-font-cache-plan.md) §3，本文不重复，只回答「什么时候更新」。

## 现状

`bootstrap_app` 每次启动都并行全量解析（`scan_all_fonts`）。`font_file_cache` 表已建，但没用上。`refresh_fonts` 等同于全量扫描。

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
| 启动 | 对所有目录做 reconcile | 第一版 |
| 本应用的写操作（安装、卸载、启用、禁用、增删目录） | 后端只更新受影响的文件，直接返回变化，不重扫 | 第一版 |
| 手动刷新 | reconcile；按住 Shift 时强制全部重新解析 | 第一版 |
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
