# 自定义字体目录（字体库）

> 状态：**计划**。依赖 [font-loading.md](font-loading.md)（未安装的字体要能预览）和 [font-cache.md](font-cache.md)。

## 目标

用户添加自己的字体文件夹（如 `D:\Fonts`），里面的字体不需要安装就能浏览、搜索、筛选、预览，需要时再一键安装。

## 数据

新 migration 增加表：

```
font_directories (id, path, recursive, enabled, added_at)
```

系统目录和用户字体目录是内置项，不存进表，也不能删除。

FontInfo 增加 `source`：`system` | `user` | `library:<directory_id>`。状态模型变成：

| 状态 | 含义 |
| --- | --- |
| `SystemFont` | Windows 自带，只读 |
| `Enabled` | 已安装、已启用 |
| `Disabled` | 已安装、被本应用禁用（见 font-management.md） |
| `NotInstalled`（新） | 只在字体库目录中 |

Rust 和 TS 的类型同步修改；`valueLabel` 和四种语言的词典补上新状态。

## 扫描

- 字体库目录默认递归扫描；跳过隐藏和系统文件夹；不跟随符号链接，避免循环。
- 和系统目录走同一套 reconcile 与缓存（以路径为键）。
- 目录不可用（拔掉的移动硬盘、断开的网络盘）：保留缓存，并把该目录标为「离线」，其中的字体变灰，不当作已删除。
- 大目录（几千个文件，或者在 HDD、网络盘上）放到后台扫描，先显示其他字体，扫完通过 `fonts_changed` 推送。

## 重复

同一个字体既在字体库里又已安装时（按 postscript_name + 版本 + 文件大小判断），合并到同一个 family，默认 face 取已安装的那份；详情页列出所有来源。待确认，见总览第 4 节。

## 界面

- **设置 → 扫描目录**：已经能列出目录。加上「添加文件夹」「移除」「是否递归」。移除只删除列表和缓存，**不碰文件**。
- 把文件夹拖进窗口 = 添加目录。
- **Sidebar** 增加「来源」组：全部 / 已安装 / 每个字体库目录；FilterCriteria 增加 `sources`，可保存为命名 Filter。
- 卡片：`NotInstalled` 的字体在右键菜单显示「安装」（见 font-management.md）。

## commands

```
list_font_directories() -> Vec<FontDirectory>
add_font_directory(path, recursive) -> FontDirectory   // 后端成功后返回，并触发扫描
remove_font_directory(id) -> ()
set_font_directory(id, { recursive?, enabled? }) -> FontDirectory
```

## 验收

- 添加一个包含子文件夹的目录后，里面的字体都能预览，而且确实是该字体本身。
- 拔掉移动硬盘再启动：该目录的字体变灰，重新插入后恢复，期间缓存没有丢。
- 移除目录后文件仍在磁盘上。
