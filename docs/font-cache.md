# 字体缓存与更新时机

> 状态：**启动、手动刷新、目录监听已完成**；本应用写操作的局部更新、字形检查缓存仍是计划。缓存规则（键、失效条件、错误处理）沿用 [filter-persistence-font-cache-plan.md](filter-persistence-font-cache-plan.md) §3，本文只回答「什么时候更新、怎么通知界面」。

## reconcile（`src-tauri/src/font/cache.rs`）

```
列目录 → 对每个文件 stat（大小、修改时间）
→ 与缓存对比：未变 = 复用；新增 / 变化 / 版本不同 / 记录损坏 = 重新解析；确认不存在 = 删除记录
→ 单个事务写回 → 返回 FontState 与 FontChanges
```

- 缓存键是小写路径；版本号 = `PARSER_SCHEMA_VERSION * 1000 + CLASSIFIER_VERSION`，任一变化都整体重新解析。
- 解析失败的文件写入空结果，文件不变时不再重复解析。
- 读目录失败时保留该目录的缓存，不当作文件已删除。
- 全局唯一的 reconcile 锁（`cache::lock()`）：同一时间只有一次 reconcile，后到的一方能看到先到的一方写入的结果；`reset_database` 也先拿这把锁，旧的 reconcile 不会写进新库。
- 锁内保存数据版本 `FontState.revision`（u32），每次 reconcile 提交后 `wrapping_add(1)`；`load()` 持锁读取，返回当前版本。
- `load()` 只读缓存、不访问目录；没有当前版本的缓存时返回 None。

## 触发时机

| 时机 | 做什么 | 状态 |
| --- | --- | --- |
| 启动 | 有缓存：先返回缓存，后台 reconcile；没有：同步 reconcile 后再返回 | ✅ |
| 目录监听（`notify`，底层 ReadDirectoryChangesW） | 一批事件后等目录静默 `font_watch_delay_secs` 秒（默认 5，设置页可改）再 reconcile | ✅ |
| 手动刷新（侧栏底部刷新按钮） | `refresh_fonts` 增量 reconcile，结果直接载入，不再确认；3 秒通知「已刷新：新增 / 修改 / 删除」或「🎉 字体已是最新！」 | ✅ |
| 重建缓存（设置页 Rebuild） | `scan_fonts` 忽略缓存、全部重新解析；3 秒通知家族数 | ✅ |
| 本应用的写操作（安装、卸载、启用、禁用、增删目录） | 后端只更新受影响的文件，直接返回变化，不重扫 | 计划 |
| 注册表变化（`RegNotifyChangeKeyValue`） | 重新读启用状态，不重新解析文件 | 和启用 / 禁用一起做 |

- 监听在 `setup` 中启动（`src-tauri/src/font_watch.rs`），每次从 `AppState` 取当前服务，重建数据库后不会写到旧库。
- 启动时不存在的目录（例如还没有用户字体目录）不监听，重启应用后才会监听。

## 通知界面

- 后台 reconcile 有变化时发送 `fonts_changed`，载荷是**完整的 `FontState`**（上千个字体约 1–2MB）。
- 前端把它存为 `fontStore.pendingState`，由 `diffFontFiles` 与界面当前的 `fontState` 按文件路径对比，得出新增 / 修改 / 删除数。修改的依据是同一路径的 `file_size` 或 `created_at`（解析时间，文件重新解析后必然改变）不同。
- 右上角（标题栏下方）显示「新增 n，修改 n，删除 n」，Refresh 直接载入 `pendingState`，关闭按钮丢弃它。多次推送时只保留最新一份，计数始终相对界面当前数据，不需要累加。
- 事件与命令返回值的到达顺序没有保证，前端按 `revision` 只前进不后退：`setFontState` 忽略比界面旧的数据，只清掉不比新数据新的 `pendingState`；`setPendingState` 忽略不比界面和已有推送新的数据。
- 版本号按环形比较（`isNewerRevision`，同 RFC 1982）：沿递增方向领先不到半圈即为更新，回绕后的 0 比 4294967295 新。

## 顺带：字形检查缓存

`check_glyphs_in_font` 每张卡片调用一次，每次都重新映射并解析文件。在后端加一个按路径的 LRU，缓存已解析的 cmap（约 20 个），或者改成一次检查多个字体的批量接口。这是 `feature-status.md` 中的第 2 优先级。

## 验收

- 第二次启动，未变化的文件解析次数为 0。
- 应用运行时在资源管理器中安装一个字体，约 5 秒后右上角出现「新增 1」；不点提示再装一个，提示变为「新增 2」；点 Refresh 后两个都出现。
- 修改 `CLASSIFIER_VERSION` 后启动，所有字体都重新分类。
