# Font Manager - 技术架构文档

## 1. 项目概述

### 1.1 项目简介
Windows 平台的现代化字体管理软件，提供极速启动、高性能字体预览、智能搜索和批量管理功能。

### 1.2 核心目标
- **极速性能**：秒开秒关，启动时间 < 1秒
- **现代UI**：黑白圆角扁平风格，支持高DPI
- **完整功能**：字体预览、搜索、分类、批量启用/禁用
- **用户体验**：流畅的动画、响应式布局、直观的操作

---

## 2. 功能需求详细分析

### 2.1 核心功能

#### F1. 字体扫描和读取
**需求描述**：
- 扫描 Windows 系统字体目录（`C:\Windows\Fonts`）
- 读取已安装字体列表（通过注册表）
- 解析字体元数据（字体名称、家族、样式、支持的语言等）

**技术挑战**：
- 系统字体数量可能达到数百个
- 需要解析 TTF/OTF/TTC 等多种格式
- 必须高效，避免启动延迟

#### F2. 字体启用/禁用
**需求描述**：
- 一键禁用单个或多个字体
- 一键启用已禁用的字体
- 记录字体状态（启用/禁用）

**技术挑战**：
- 需要管理员权限修改系统字体
- 需要安全的字体备份机制
- 避免禁用系统关键字体

#### F3. 字体预览
**需求描述**：
- **Grid View**：网格布局展示所有字体卡片
- **Paper View**：纸张式详细预览
- 支持中英文实时预览
- 可调节预览字体大小（滑块控件）
- 点击卡片进入详细页面
- 正确显示语言本地化条件下的名称，如中文环境下，对于中文字体显示中文字体名

**技术挑战**：
- 大量字体的渲染性能、虚拟滚动优化
- 自定义预览文本

#### F4. 字体详细信息
**需求描述**：
- 显示字体元数据（设计师、版本、许可证等）
- 多种预设预览模板（标题、正文、特殊字符等）
- 支持导出字体样本

**技术挑战**：
- 提取完整的字体元数据
- 渲染特殊字符集（符号、emoji等）

#### F6. 字体分类和过滤
**需求描述**：
- 按字体类型分类（衬线、无衬线、手写、等宽等）
- 按语言分类（中文、英文、日文、韩文等）
- 按字体家族分组
- 自定义标签系统

**技术挑战**：
- 自动识别字体类型
- 检测字体支持的语言/字符集
- 持久化分类和标签数据

### 2.2 UI/UX 需求

#### U1. 布局设计
- **顶栏**：搜索框、视图切换、设置按钮
- **侧栏**：分类、标签、收藏夹
- **主区域**：字体网格/列表
- **详情页**：字体详细预览

#### U2. 视觉风格
- 黑白主题（可扩展深色模式）
- 圆角卡片（8-12px border-radius）
- 无衬线字体（Inter、Segoe UI Variable）
- 扁平化图标
- 微交互动画

#### U3. 响应式和高DPI
- 支持 125%、150%、200% 缩放
- 响应式网格布局
- 清晰的矢量图标

---

## 3. 技术栈选型

### 3.1 总体架构：Tauri 2.x + React 18

Tauri 完美平衡性能和开发体验

### 3.2 前端技术栈

#### 核心框架
```
React 18.3+          - UI框架
TypeScript 5.5+      - 类型安全
Vite 5.x             - 快速构建工具
```

#### UI组件库
```
TailwindCSS 3.4+     - 样式框架
Lucide React         - 图标库
```

#### 状态管理
```
Zustand 4.x          - 轻量级状态管理
Immer                - 不可变数据
```

#### 性能优化
```
@tanstack/react-virtual  - 虚拟滚动
react-window             - 备选虚拟滚动方案
```

### 3.3 后端技术栈 (Rust)

#### 核心依赖
```toml
[dependencies]
tauri = "2.0"                    # Tauri框架
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }

# Windows API
windows = { version = "0.58", features = [
    "Win32_Graphics_Gdi",
    "Win32_Graphics_DirectWrite",
    "Win32_System_Registry",
    "Win32_Storage_FileSystem",
]}

# 字体解析
ttf-parser = "0.24"              # TTF/OTF解析
font-kit = "0.14"                # 跨平台字体API
owned_ttf_parser = "0.24"        # 字体元数据

# 性能优化
rayon = "1.10"                   # 并行处理
dashmap = "6"                    # 并发HashMap
```

---

## 4. 架构设计

### 4.1 项目结构

### 4.2 数据流架构

```
┌─────────────────────────────────────────────────────────┐
│                     React 前端                           │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│  │   UI     │───▶│  Store   │◀───│  Hooks   │         │
│  │Component │    │ (Zustand)│    │          │         │
│  └──────────┘    └─────┬────┘    └────┬─────┘         │
│                        │              │                 │
│                        └──────┬───────┘                 │
│                               ▼                          │
│                     ┌──────────────────┐                │
│                     │  Tauri Commands  │                │
│                     │   (invoke API)   │                │
└─────────────────────┴────────┬─────────┴────────────────┘
                               │
                               │ IPC
                               │
┌──────────────────────────────▼──────────────────────────┐
│                     Rust 后端                            │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │   Commands   │───▶│FontScanner   │                  │
│  │   Handler    │    │              │                  │
│  └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                           │
│         ▼                   ▼                           │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │FontManager   │    │  FontParser  │                  │
│  │              │    │              │                  │
│  └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                           │
│         └───────┬───────────┘                           │
│                 ▼                                        │
│          ┌─────────────┐                                │
│          │Windows API  │                                │
│          │  + 文件系统  │                                │
│          └─────────────┘                                │
└──────────────────────────────────────────────────────────┘
```

### 4.3 核心数据模型

确保前端 type.d.ts 中 FontInfo 和 后端 FontInfo 的类型一致。


## 5. 功能实现详细方案

### 5.1 字体扫描和解析

#### 5.1.1 后端实现 (Rust)

**文件**: `src-tauri/src/font/scanner.rs`

#### 5.1.2 前端调用

**文件**: `src/lib/tauri-api.ts`

- `invoke('scan_fonts')`
- `invoke('refresh_fonts')`

被 **文件**: `src/hooks/useFonts.ts` 使用


### 5.2 字体启用/禁用

#### 5.2.1 实现方案

**Windows字体禁用机制**：
- 不能直接删除系统字体文件（需要保护）
- 方案1：移动到备份目录（需要管理员权限）
- 方案2：修改注册表隐藏字体（推荐）

**注册表路径**：
```
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts
HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts
```

#### 5.2.2 后端实现

**文件**: `src-tauri/src/font/manager.rs`

```rust
use windows::Win32::System::Registry::*;

pub struct FontManager {
    backup_dir: PathBuf,
}

impl FontManager {
    /// 禁用字体
    pub fn disable_font(&self, font_id: &str) -> Result<()> {
        // 1. 检查是否为系统关键字体
        if self.is_system_critical(font_id) {
            return Err(Error::SystemFontProtected);
        }

        // 2. 备份原始注册表值
        self.backup_registry_entry(font_id)?;

        // 3. 从注册表移除（或移动到禁用键）
        self.remove_from_registry(font_id)?;

        // 4. 通知系统刷新字体缓存
        self.refresh_font_cache()?;

        Ok(())
    }

    /// 启用字体
    pub fn enable_font(&self, font_id: &str) -> Result<()> {
        // 1. 恢复注册表值
        self.restore_registry_entry(font_id)?;

        // 2. 刷新字体缓存
        self.refresh_font_cache()?;

        Ok(())
    }

    /// 批量操作
    pub fn toggle_fonts(&self, font_ids: Vec<String>, enable: bool) -> Result<Vec<ToggleResult>> {
        font_ids.into_iter()
            .map(|id| {
                let result = if enable {
                    self.enable_font(&id)
                } else {
                    self.disable_font(&id)
                };

                ToggleResult { id, success: result.is_ok() }
            })
            .collect()
    }

    /// 检查是否为系统关键字体
    fn is_system_critical(&self, font_id: &str) -> bool {
        const CRITICAL_FONTS: &[&str] = &[
            "Segoe UI",
            "Microsoft YaHei",
            "SimSun",
            "Arial",
            "Tahoma",
        ];

        CRITICAL_FONTS.iter().any(|&name| font_id.contains(name))
    }

    /// 刷新字体缓存
    fn refresh_font_cache(&self) -> Result<()> {
        // 调用 Windows API: SendMessage(HWND_BROADCAST, WM_FONTCHANGE, 0, 0)
    }
}
```

#### 5.2.3 前端实现

**文件**: `src/components/font/FontCard.tsx`

```typescript
import { Button } from '@/components/ui/button';
import { useFontStore } from '@/store/fontStore';
import { toggleFont } from '@/lib/tauri-api';

export function FontCard({ font }: { font: FontInfo }) {
  const updateFontStatus = useFontStore(state => state.updateFontStatus);
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggle() {
    setIsToggling(true);
    try {
      const newStatus = font.status === 'Enabled' ? 'Disabled' : 'Enabled';
      await toggleFont(font.id, newStatus === 'Enabled');
      updateFontStatus(font.id, newStatus);
    } catch (error) {
      console.error('Failed to toggle font:', error);
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <div className="font-card">
      <div style={{ fontFamily: font.family }}>
        {font.fullName}
      </div>
      <Button
        onClick={handleToggle}
        disabled={isToggling || font.status === 'SystemFont'}
      >
        {font.status === 'Enabled' ? 'Disable' : 'Enable'}
      </Button>
    </div>
  );
}
```

### 5.3 字体预览和虚拟滚动

#### 5.3.1 性能优化策略

**挑战**：
- 300+ 字体同时渲染会导致性能问题
- 每个字体卡片需要使用自定义字体渲染

**解决方案**：
1. **虚拟滚动**：只渲染可见区域的字体
2. **字体懒加载**：延迟加载字体文件
3. **Canvas渲染**：使用Canvas预渲染字体样本
4. **Web Workers**：后台处理字体数据

#### 5.3.2 虚拟滚动实现

**文件**: `src/components/font/FontGrid.tsx`

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { FontCard } from './FontCard';

export function FontGrid({ fonts }: { fonts: FontInfo[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(fonts.length / 3), // 每行3个
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // 预估卡片高度
    overscan: 5, // 额外渲染5行
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * 3;
          const rowFonts = fonts.slice(startIdx, startIdx + 3);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-3 gap-4">
                {rowFonts.map(font => (
                  <FontCard key={font.id} font={font} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### 5.3.3 字体预览控制

**文件**: `src/components/font/PreviewControls.tsx`

```typescript
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/store/uiStore';

export function PreviewControls() {
  const { previewSize, previewText, setPreviewSize, setPreviewText } = useUIStore();

  return (
    <div className="preview-controls">
      {/* 字体大小滑块 */}
      <div className="control-group">
        <label>Font Size: {previewSize}px</label>
        <Slider
          value={[previewSize]}
          onValueChange={([size]) => setPreviewSize(size)}
          min={12}
          max={96}
          step={1}
        />
      </div>

      {/* 自定义预览文本 */}
      <div className="control-group">
        <label>Preview Text:</label>
        <Input
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="The quick brown fox..."
        />
      </div>
    </div>
  );
}
```


### 5.5 字体分类和过滤

#### 5.5.1 自动分类算法

**分类维度**：
1. **按语言**：Unknown, 中文、英文、日文、韩文、多语言
2. **按类型**：衬线、无衬线、手写、等宽、装饰
3. **按家族**：按字体家族分组

**实现**：

**文件**: `src-tauri/src/font/classifier.rs`

```rust
pub struct FontClassifier;

impl FontClassifier {
    /// 分类字体
    pub fn classify(font: &FontInfo) -> FontCategory {
        FontCategory {
            languages: Self::detect_languages(font),
            font_type: Self::detect_type(font),
            family_group: font.family.clone(),
        }
    }

    /// 检测语言
    fn detect_languages(font: &FontInfo) -> Vec<String> {
        let mut languages = Vec::new();

        // 基于Unicode范围判断
        if font.scripts.contains(&"Hans".to_string()) {
            languages.push("Chinese".to_string());
        }
        if font.scripts.contains(&"Latn".to_string()) {
            languages.push("English".to_string());
        }
        // ... 其他语言

        languages
    }

    /// 检测字体类型
    fn detect_type(font: &FontInfo) -> FontType {
        // 基于字体名称关键词判断
        let name_lower = font.family.to_lowercase();

        if name_lower.contains("mono") || name_lower.contains("code") {
            return FontType::Monospace;
        }
        if name_lower.contains("sans") {
            return FontType::SansSerif;
        }
        if name_lower.contains("serif") {
            return FontType::Serif;
        }
        if name_lower.contains("script") || name_lower.contains("hand") {
            return FontType::Handwriting;
        }

        // 默认分类
        FontType::SansSerif
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FontType {
    Serif,        // 衬线
    SansSerif,    // 无衬线
    Monospace,    // 等宽
    Handwriting,  // 手写
    Decorative,   // 装饰
}
```

#### 5.5.2 前端过滤器

**文件**: `src/components/layout/Sidebar.tsx`

```typescript
import { useFilterStore } from '@/store/filterStore';

export function Sidebar() {
  const { activeFilters, toggleFilter } = useFilterStore();

  return (
    <aside className="sidebar">
      {/* 语言过滤 */}
      <FilterSection title="Language">
        <FilterOption label="中文" value="Chinese" />
        <FilterOption label="English" value="English" />
        <FilterOption label="日本語" value="Japanese" />
        <FilterOption label="한국어" value="Korean" />
      </FilterSection>

      {/* 类型过滤 */}
      <FilterSection title="Type">
        <FilterOption label="Serif" value="Serif" />
        <FilterOption label="Sans Serif" value="SansSerif" />
        <FilterOption label="Monospace" value="Monospace" />
        <FilterOption label="Handwriting" value="Handwriting" />
      </FilterSection>

      {/* 状态过滤 */}
      <FilterSection title="Status">
        <FilterOption label="Enabled" value="Enabled" />
        <FilterOption label="Disabled" value="Disabled" />
      </FilterSection>
    </aside>
  );
}
```

### 5.6 字体详情页面

**文件**: `src/components/font/FontDetail.tsx`

```typescript
export function FontDetail({ fontId }: { fontId: string }) {
  const font = useFontStore(state =>
    state.fonts.find(f => f.id === fontId)
  );

  if (!font) return null;

  return (
    <div className="font-detail">
      {/* 字体信息 */}
      <section className="info-section">
        <h1 style={{ fontFamily: font.family }}>{font.fullName}</h1>
        <dl>
          <dt>Family:</dt>
          <dd>{font.family}</dd>

          <dt>Style:</dt>
          <dd>{font.style}</dd>

          <dt>Format:</dt>
          <dd>{font.format}</dd>

          <dt>Languages:</dt>
          <dd>{font.languages.join(', ')}</dd>

          {font.metadata.designer && (
            <>
              <dt>Designer:</dt>
              <dd>{font.metadata.designer}</dd>
            </>
          )}
        </dl>
      </section>

      {/* 预览模板 */}
      <section className="preview-section">
        <PreviewTemplate
          font={font}
          template="heading"
          text="The Quick Brown Fox Jumps Over The Lazy Dog"
        />
        <PreviewTemplate
          font={font}
          template="paragraph"
          text="Lorem ipsum dolor sit amet..."
        />
        <PreviewTemplate
          font={font}
          template="glyphs"
          text="ABCDabcd1234!@#$"
        />
      </section>
    </div>
  );
}
```

### 5.7 右键菜单（Context Menu）

#### 5.7.1 设计目标

为字体卡片提供右键菜单，支持快速操作：
- **Info**：查看字体详细信息
- **Multi-select**：进入多选模式，批量操作字体
- **Disable/Enable**：启用或禁用字体

#### 5.7.2 交互设计

**触发方式**：
- 右键点击字体卡片
- 菜单显示在鼠标位置附近
- 点击菜单外部或按 ESC 关闭菜单

**菜单选项**：

1. **Info（信息）**
   - 图标：ℹ️ 信息图标
   - 功能：打开字体详情页面/模态框
   - 显示字体的完整元数据、预览模板

2. **Multi-select（多选）**
   - 图标：☑️ 多选图标
   - 功能：
     - 进入多选模式
     - 在卡片上显示复选框
     - 允许批量选择多个字体
     - 显示批量操作工具栏（批量启用/禁用/删除）
   - 退出：点击工具栏的"完成"按钮

3. **Disable/Enable（禁用/启用）**
   - 图标：🚫 禁用图标 / ✅ 启用图标
   - 功能：切换字体的启用状态
   - 动态文本：
     - 如果字体已启用 → 显示"Disable"
     - 如果字体已禁用 → 显示"Enable"
   - 系统字体：禁用此选项（灰色，不可点击）

#### 5.7.3 实现架构

**组件结构**：

```
FontCard
├── [右键事件处理]
└── ContextMenu
    ├── MenuItem (Info)
    ├── MenuItem (Multi-select)
    └── MenuItem (Disable/Enable)
```

**状态管理**：

```typescript
// Store: uiStore.ts
interface UIStore {
  // ... 现有状态
  multiSelectMode: boolean;          // 是否处于多选模式
  selectedFontIds: Set<string>;      // 已选中的字体ID列表
  setMultiSelectMode: (mode: boolean) => void;
  toggleFontSelection: (fontId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
}
```

#### 5.7.4 前端实现

**文件**: `src/components/ui/ContextMenu.tsx`

**文件**: `src/components/font/FontCard.tsx` (更新)

**文件**: `src/store/uiStore.ts` (更新)

#### 5.7.5 多选模式工具栏

当进入多选模式时，在顶部显示工具栏：

**文件**: `src/components/font/MultiSelectToolbar.tsx`

```typescript
import { X, Trash2, Check, Ban } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useFontStore } from "@/store/fontStore";

export function MultiSelectToolbar() {
  const { selectedFontIds, setMultiSelectMode, clearSelection } = useUIStore();
  const fonts = useFontStore((state) => state.fonts);

  const selectedCount = selectedFontIds.size;

  function handleExit() {
    setMultiSelectMode(false);
    clearSelection();
  }

  function handleEnableAll() {
    // TODO: 批量启用字体
    console.log("Enable fonts:", Array.from(selectedFontIds));
  }

  function handleDisableAll() {
    // TODO: 批量禁用字体
    console.log("Disable fonts:", Array.from(selectedFontIds));
  }

  return (
    <div className="sticky top-0 z-10 bg-primary text-primary-foreground px-6 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-4">
        <button
          onClick={handleExit}
          className="p-2 hover:bg-primary-foreground/20 rounded-lg transition-colors"
          title="Exit multi-select"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="font-medium">
          {selectedCount} {selectedCount === 1 ? 'font' : 'fonts'} selected
        </span>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleEnableAll}
            className="px-4 py-2 bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Check className="w-4 h-4" />
            Enable
          </button>
          <button
            onClick={handleDisableAll}
            className="px-4 py-2 bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Ban className="w-4 h-4" />
            Disable
          </button>
        </div>
      )}
    </div>
  );
}
```

#### 5.7.6 侧边栏更新 - 添加 Unknown 语言

**文件**: `src/components/layout/Sidebar.tsx` (更新)

#### 5.7.7 技术细节

**右键菜单定位算法**：
**性能优化**：
- 使用 `React.memo` 优化 ContextMenu 组件
- 多选模式下使用 Set 存储选中ID（O(1)查找）
- 批量操作使用 Promise.all 并行处理

**键盘快捷键**（未来扩展）：
- `Ctrl + A`: 全选
- `Escape`: 退出多选模式
- `Delete`: 删除选中字体

---

## 6. 性能优化策略

### 6.1 启动优化

**目标**：< 1秒启动时间

**策略**：
1. **延迟字体扫描**：首次启动时后台扫描，使用缓存数据
2. **增量扫描**：只扫描新增/修改的字体
3. **预编译Rust**：优化编译参数
4. **减少依赖**：前端打包优化

**Cargo.toml 优化**：
```toml
[profile.release]
opt-level = "z"          # 优化体积
lto = true               # Link Time Optimization
codegen-units = 1        # 单元编译优化
strip = true             # 去除调试符号
panic = "abort"          # 减少panic处理代码
```

**缓存机制**：
```rust
// 首次启动：扫描所有字体并缓存
// 后续启动：读取缓存，后台增量扫描
pub async fn load_fonts_with_cache() -> Result<Vec<FontInfo>> {
    // 1. 尝试读取缓存
    if let Ok(cached) = Self::load_cache() {
        // 2. 后台异步刷新
        tokio::spawn(async {
            let _ = Self::scan_and_update_cache().await;
        });
        return Ok(cached);
    }

    // 3. 无缓存时同步扫描
    Self::scan_and_update_cache().await
}
```

### 6.2 渲染优化

**策略**：
1. **虚拟滚动**：只渲染可见区域
2. **字体懒加载**：延迟加载字体文件
3. **防抖/节流**：过滤、滚动事件优化
4. **Web Workers**：后台处理数据

**字体懒加载**：
```typescript
// 使用 Intersection Observer 实现懒加载
export function useLazyFont(fontFamily: string) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loaded) {
          // 加载字体
          const font = new FontFace(fontFamily, `local(${fontFamily})`);
          font.load().then(() => {
            document.fonts.add(font);
            setLoaded(true);
          });
        }
      },
      { rootMargin: '200px' } // 提前200px加载
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [fontFamily, loaded]);

  return { ref, loaded };
}
```

### 6.3 内存优化

**策略**：
1. **数据分页**：不一次性加载所有字体到内存
2. **对象池**：复用React组件
3. **及时清理**：卸载不可见组件

---

## 7. UI设计规范

### 7.1 设计系统

**颜色方案**：
```css
:root {
  /* 主色调 */
  --color-background: #FFFFFF;
  --color-foreground: #0A0A0A;

  /* 灰度 */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;

  /* 强调色 */
  --color-primary: #3B82F6;
  --color-primary-hover: #2563EB;

  /* 状态色 */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
}

/* 暗色模式 (可选) */
[data-theme="dark"] {
  --color-background: #0A0A0A;
  --color-foreground: #FAFAFA;
  /* ... */
}
```

**字体**：
```css
:root {
  --font-sans: "Inter", "Segoe UI Variable", "Microsoft YaHei UI", system-ui, sans-serif;
  --font-mono: "Cascadia Code", "Fira Code", "Consolas", monospace;
}
```

**圆角**：
```css
:root {
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

**间距**：
```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

### 7.2 组件样式示例

**字体卡片**：
```tsx
<div className="
  group
  relative
  overflow-hidden
  rounded-lg
  border border-gray-200
  bg-white
  p-6
  transition-all
  hover:shadow-lg
  hover:border-primary
">
  <div
    className="text-2xl mb-2"
    style={{ fontFamily: font.family }}
  >
    {font.fullName}
  </div>
  <div className="text-sm text-gray-500">
    {font.style} • {font.format}
  </div>
</div>
```

### 7.3 响应式布局

---

## 8. 开发路线图

### Phase 1: 基础框架 (Week 1-2)
- [x] 初始化Tauri项目
- [x] 配置React + TypeScript + TailwindCSS
- [x] 实现基础布局（顶栏+侧栏+主区域）
- [x] 创建数据模型和Store

### Phase 2: 字体扫描 (Week 2-3)
- [x] 实现Rust字体扫描器
- [x] 集成ttf-parser解析字体
- [ ] 实现缓存机制
- [x] 前端调用字体列表API
- [x] 显示基本字体列表

### Phase 3: 字体预览 (Week 3-4)
- [x] 实现字体网格布局
- [ ] 集成虚拟滚动
- [x] 实现字体卡片组件
- [ ] 添加预览控制（字体大小、预览文本）
- [ ] 字体懒加载优化

### Phase 4: 搜索功能 (Week 4-5)
- [x] 实现搜索引擎
- [ ] 集成拼音搜索
- [x] 实现搜索UI
- [ ] 搜索性能优化

### Phase 5: 字体管理 (Week 5-6)
- [ ] 实现字体启用/禁用功能
- [ ] 批量操作UI
- [ ] 安全保护机制
- [ ] 操作反馈和错误处理

### Phase 6: 分类和过滤 (Week 6-7)
- [ ] 实现字体分类算法
- [ ] 侧栏过滤器UI
- [ ] 多条件过滤逻辑
- [ ] 自定义标签系统

### Phase 7: 字体详情 (Week 7-8)
- [ ] 实现详情页布局
- [ ] 字体元数据展示
- [ ] 多种预览模板
- [ ] 详情页路由

### Phase 8: 优化和测试 (Week 8-9)
- [ ] 性能优化
- [ ] 启动速度优化
- [ ] 内存优化
- [ ] 单元测试
- [ ] E2E测试

### Phase 9: 打磨和发布 (Week 9-10)
- [ ] UI细节打磨
- [ ] 动画和交互优化
- [ ] 打包配置
- [ ] 文档编写
- [ ] 发布v1.0

---

## 9. 技术风险和缓解

### 风险1: Windows API调用复杂
**缓解**：
- 使用 `windows-rs` crate（官方Rust绑定）
- 参考开源项目（如VSCode的字体管理）
- 分阶段实现，先只读后读写

### 风险2: 字体解析性能
**缓解**：
- 使用成熟的 `ttf-parser` 库
- 并行处理（rayon）
- 缓存机制

### 风险3: Rust学习曲线
**缓解**：
- 前端先行开发（使用Mock数据）
- Rust部分逐步实现
- 参考Tauri官方示例

### 风险4: 字体渲染性能
**缓解**：
- 虚拟滚动必须实现
- 懒加载策略
- Canvas渲染备选方案

---

## 10. 参考资源

### 文档
- [Tauri 官方文档](https://tauri.app/)
- [windows-rs 文档](https://microsoft.github.io/windows-docs-rs/)
- [ttf-parser 文档](https://docs.rs/ttf-parser/)
- [shadcn/ui 文档](https://ui.shadcn.com/)

### 开源项目参考
- [FontBase](https://fontba.se/) - 字体管理器
- [Tauri Examples](https://github.com/tauri-apps/tauri/tree/dev/examples)
- [VSCode Font Management](https://github.com/microsoft/vscode)

### 工具
- [Font Awesome](https://fontawesome.com/) - 图标
- [Google Fonts](https://fonts.google.com/) - 测试字体
- [Font Squirrel](https://www.fontsquirrel.com/) - 字体资源


---

**文档版本**: 1.0
**最后更新**: 2025-12-11
**作者**: Claude Code
