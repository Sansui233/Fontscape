# 字体安装 / 卸载 / 启用 / 禁用

> 状态：**计划**。`toggle_font` 现在返回 `not_implemented`。需求见 AGENTS.md F2、F7。本文取代原来的 font-enable-disable.md，保留了它的决定。

## 原则

- 后端写成功之后，前端才更新状态；批量操作逐项返回结果。
- 启用和禁用都不移动、不删除文件。只有「卸载」处理文件，而且默认移到回收站。
- Windows 自带字体只读：不能禁用，也不能卸载。
- 所有注册表和 GDI 调用都放在 `#[cfg(target_os = "windows")]` 下；其他平台返回 `unsupported`。

## 注册表与目录

| 范围 | 注册表 | 文件目录 | 权限 |
| --- | --- | --- | --- |
| 当前用户 | `HKCU\...\Windows NT\CurrentVersion\Fonts` | `%LOCALAPPDATA%\Microsoft\Windows\Fonts` | 不需要 |
| 所有用户 | `HKLM\...\Windows NT\CurrentVersion\Fonts` | `C:\Windows\Fonts` | 管理员（UAC） |

- 值名如 `"微软雅黑 & Microsoft YaHei UI (TrueType)"`。CFF 轮廓的字体用 `(OpenType)`。值数据是文件名或完整路径。
- 一个文件对应一个条目，TTC 里的多个 face 共用一个条目，所以**操作的最小单位是文件**。界面上要说明：「这个文件还包含 X、Y」。
- 每次变更后调用 `AddFontResourceW` / `RemoveFontResourceW`，再广播 `SendMessageTimeoutW(HWND_BROADCAST, WM_FONTCHANGE)`。

## 四个操作

**安装**（来源：字体库中的字体，或拖进窗口的文件）
1. 解析文件，确认格式有效，取得注册表值名。
2. 复制到用户字体目录；重名时加后缀，内容相同则跳过复制。
3. 写入 HKCU 值（完整路径），调用 `AddFontResourceW`，再广播。
4. 更新缓存，返回新的 FontInfo。

**卸载**
1. 系统字体返回 `system_font_protected`。
2. 调用 `RemoveFontResourceW`，删除注册表值，再广播。
3. 用 `IFileOperation` 把文件移到回收站。文件被占用时，返回 `file_in_use` 并提示「重启后完成」；不做隐式的延迟删除。

**禁用**
1. 把 `{hive, value_name, value_data, path}` 写入新表 `disabled_fonts`。
2. 删除注册表值，调用 `RemoveFontResourceW`，再广播。
3. 文件留在原处，扫描时根据 `disabled_fonts` 标为 `Disabled`，预览用 font-loading.md 的方案。

**启用**：按备份写回注册表值，调用 `AddFontResourceW`，再广播，最后删除备份行。注册表值已经存在（被别的工具恢复了）时直接删除备份，视为成功。

## 系统字体保护

Windows 自带的字体文件属主是 `NT SERVICE\TrustedInstaller`，用 `GetNamedSecurityInfoW` 读取属主来判断，结果随缓存保存。`is_system_font` 名单保留作兜底（Segoe UI、Microsoft YaHei、SimSun、Tahoma，是否加 Arial 待定）。判断只在后端做，前端只读 `status`。

## 分两步交付

1. **只做 HKCU**：用户自己装的字体可以安装、卸载、启用、禁用；HKLM 中的字体显示为只读，菜单项变灰，并说明原因。
2. **HKLM**：同一个可执行文件带 `--font-helper <任务文件>` 参数，通过 `ShellExecuteW("runas")` 启动，一批操作只弹一次 UAC。helper 只接受固定的四种操作，把逐项结果写回任务文件后退出。

## commands

```
install_fonts(paths: Vec<String>) -> Vec<OpResult>
uninstall_fonts(ids: Vec<String>) -> Vec<OpResult>
set_fonts_enabled(ids: Vec<String>, enabled: bool) -> Vec<OpResult>   // 取代 toggle_font
OpResult { id, success, error: Option<CommandError>, font: Option<FontInfo> }
```

部分失败时不回滚已经成功的项。前端按结果逐项更新状态，并用 toast 汇总失败项。

## 界面

- 右键菜单：启用 / 禁用（已有）、安装（`NotInstalled`）、卸载（需要确认，说明会移到回收站）。
- 多选工具条：批量启用、禁用、卸载。
- 把字体文件拖进窗口 → 确认后安装。

## 验收（在虚拟机或备用账户上做）

- 禁用后，记事本的字体列表里看不到该字体；启用后又出现，不需要重启。
- 卸载后文件在回收站里，可以还原。
- 应用中途崩溃后重启：`disabled_fonts` 中的字体仍显示为已禁用，并且可以启用。
