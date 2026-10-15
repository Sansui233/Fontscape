# 字体启用 / 禁用设计

> 状态：**未实现**。`toggle_font` 现在是空函数。本文是实现前的设计，需求见 AGENTS.md 中的 F2 和 F7。

## 原则

- 不删除、不移动字体文件。
- 禁用通过移除注册表条目实现。禁用前把原值备份，启用时恢复。
- 关键系统字体不能禁用。
- 后端写成功之后，前端才更新状态。

## 注册表

```
HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts   # 所有用户，需要管理员权限
HKCU\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts   # 当前用户安装的字体
```

- 值名形如 `"微软雅黑 & Microsoft YaHei UI (TrueType)"`，值数据是文件名或完整路径。
- 一个条目对应一个文件。一个 TTC 文件里的多个 face 只有一个条目，所以**禁用的最小单位是文件**，不是 face。界面上需要说明这一点。
- 要修改 HKLM，需要提权（UAC）。这一点待决定，可选方案有：
  1. 只支持 HKCU（用户安装的字体），系统字体只读；
  2. 通过单独的提权 helper 进程修改 HKLM。

## 流程

**禁用**

1. 检查是否在保护名单中，在名单中就返回 `SystemFontProtected`。
2. 把 `{hive, value_name, value_data, path}` 写入备份。建议存放在 SQLite 的 `disabled_fonts` 表中。
3. 删除注册表里的值。
4. 调用 `RemoveFontResourceW(path)`，然后广播 `SendMessageTimeout(HWND_BROADCAST, WM_FONTCHANGE)`。

**启用**：按备份恢复注册表的值，调用 `AddFontResourceW`，再广播 `WM_FONTCHANGE`，最后删除备份。

**批量**：逐个执行，每项返回 `{ id, success, error }`。部分失败时不回滚已经成功的项，前端逐项给出反馈。

## 与扫描的关系

现在的扫描只遍历目录。为了显示「已禁用」，扫描需要：

- 读取 HKLM / HKCU 的注册表条目，确定哪些文件是已安装的；
- 在目录中、但出现在 `disabled_fonts` 备份里的文件，标记为 `Disabled`；
- 不在注册表中、也不在备份里的文件，作为「未安装」处理。是否显示这类文件，待定。

## 保护名单

现在的名单在 `scanner.rs::is_system_font`：Segoe UI、Microsoft YaHei、SimSun、Tahoma。原设计里还有 Arial，需要决定是否加回去。保护名单应只放在后端一处，前端只读取 `status`。

## 平台

所有注册表和 GDI 调用都要放在 `#[cfg(target_os = "windows")]` 下。在非 Windows 平台上，command 返回「不支持」。

## 需要实现的接口

```
toggle_fonts(ids: Vec<String>, enable: bool) -> Vec<ToggleResult>
```

前端的单个切换也用这个接口（传一个元素的数组）。
