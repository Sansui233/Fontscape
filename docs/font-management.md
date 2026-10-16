# 字体安装 / 卸载 / 启用 / 禁用

> 状态：**计划**。`toggle_font` 现在返回 `not_implemented`。需求见 AGENTS.md F2、F7。本文取代原来的 font-enable-disable.md，保留了它的决定。

## 原则

- 后端写成功之后，前端才更新状态；批量操作逐项返回结果。
- 启用和禁用都不移动、不删除文件。只有「卸载」处理文件，文件移到系统回收站。
- **已安装 = 注册表里有条目**（已链接）。文件可以在 Windows 字体目录里，也可以在字体库目录里（原地注册）。
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
- **扫描范围要包含注册表**：除了按目录扫描，还要读 HKCU / HKLM 中所有值指向的文件。原地注册的字体、其他工具用完整路径注册的字体，都可能不在任何已扫描的目录里。

## 四个操作

**安装**：两种来源，做法不同。

| 来源 | 文件 | 注册表值数据 |
| --- | --- | --- |
| 字体库目录中扫描到的字体（`NotInstalled`） | **原地注册**，不复制 | 文件的完整路径 |
| 拖进窗口的字体文件 | **复制**到用户字体目录；重名时加后缀，内容相同则跳过复制 | 复制后的完整路径 |

1. 解析文件，确认格式有效，取得注册表值名。
2. 按上表决定是否复制，然后写入 HKCU 值，调用 `AddFontResourceW`，再广播。
3. 更新缓存，返回新的 FontInfo。

原地注册的风险：字体库目录离线（拔掉移动硬盘）时，这些字体在系统里会失效。启动时如果发现原地注册的文件不可访问，在界面上标出来；**不自动删除注册表条目**，目录恢复后就能继续使用。

**卸载**：与 Windows 自己卸载字体的做法一致，取消链接并删除文件。
1. 系统字体返回 `system_font_protected`。
2. 确认框必须写明：**卸载后无法在本应用中撤销**；文件会进入系统回收站，但从回收站还原文件**不会**重新安装这个字体。TTC 要列出同一文件中的其他 face。
3. 调用 `RemoveFontResourceW`，删除注册表值，再广播。
4. 用 `IFileOperation`（带 `FOFX_RECYCLEONDELETE`）把文件移到回收站。文件被占用时，返回 `file_in_use`，提示关闭正在使用它的程序后重试；不做隐式的延迟删除。
5. 原地注册的字体库文件也按同样方式处理：卸载就是删除。如果只想让字体不再生效，应该用「禁用」，菜单里在「卸载」旁边说明这一点。

**禁用**
1. 把 `{hive, value_name, value_data, path}` 写入新表 `disabled_fonts`。
2. 删除注册表值，调用 `RemoveFontResourceW`，再广播。
3. 文件留在原处，扫描时根据 `disabled_fonts` 标为 `Disabled`，预览用 font-loading.md 的方案。

**启用**：按备份写回注册表值，调用 `AddFontResourceW`，再广播，最后删除备份行。注册表值已经存在（被别的工具恢复了）时直接删除备份，视为成功。

## 系统字体保护

Windows 自带的字体文件属主是 `NT SERVICE\TrustedInstaller`，用 `GetNamedSecurityInfoW` 读取属主来判断，结果随缓存保存。`is_system_font` 名单保留作兜底（Segoe UI、Microsoft YaHei、SimSun、Tahoma，是否加 Arial 待定）。判断只在后端做，前端只读 `status`。

## 分两步交付

1. **只做 HKCU**（已确认）：用户自己装的字体可以安装、卸载、启用、禁用；HKLM 中的字体只读，菜单项变灰，并说明原因（「为所有用户安装，需要管理员权限」）。
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
- 卸载后文件在回收站里；确认框写明了无法撤销。
- 从字体库原地安装后，Windows 字体目录里没有多出副本，注册表值指向字体库中的文件。
- 拖入文件安装后，用户字体目录里有一份副本。
- 应用中途崩溃后重启：`disabled_fonts` 中的字体仍显示为已禁用，并且可以启用。
