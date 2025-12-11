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

**技术挑战**：
- 大量字体的渲染性能
- 虚拟滚动优化
- 自定义预览文本

#### F4. 字体详细信息
**需求描述**：
- 显示字体元数据（设计师、版本、许可证等）
- 多种预设预览模板（标题、正文、特殊字符等）
- 支持导出字体样本

**技术挑战**：
- 提取完整的字体元数据
- 渲染特殊字符集（符号、emoji等）

#### F5. 智能搜索
**需求描述**：
- 实时搜索字体名称
- 支持拼音搜索中文字体（如输入 "song" 找到 "宋体"）
- 支持模糊匹配
- 搜索结果高亮

**技术挑战**：
- 中文拼音转换和索引
- 高性能搜索算法
- 搜索结果排序优化

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

#### 选型理由
| 需求 | Tauri | Electron | 原生C++/C# |
|------|-------|----------|-----------|
| **启动速度** | ⭐⭐⭐⭐⭐ (~500ms) | ⭐⭐ (~2-3s) | ⭐⭐⭐⭐⭐ |
| **包体积** | ⭐⭐⭐⭐⭐ (3-5MB) | ⭐ (100MB+) | ⭐⭐⭐⭐ |
| **前端开发体验** | ⭐⭐⭐⭐⭐ (React) | ⭐⭐⭐⭐⭐ (React) | ⭐⭐ (需WPF/WinUI) |
| **性能** | ⭐⭐⭐⭐⭐ (原生) | ⭐⭐⭐ (V8) | ⭐⭐⭐⭐⭐ |
| **学习曲线** | ⭐⭐⭐⭐ (需学Rust) | ⭐⭐⭐⭐⭐ (纯JS) | ⭐⭐ (复杂) |

**结论**：Tauri 完美平衡性能和开发体验

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
shadcn/ui            - 现代组件库（符合设计要求）
Radix UI             - 无样式组件基础（headless UI）
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
use-debounce             - 防抖优化
```

#### 搜索功能
```
pinyin-pro           - 中文拼音转换
fuse.js              - 模糊搜索引擎
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

```
font-manager/
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs               # 入口
│   │   ├── lib.rs                # 库入口
│   │   │
│   │   ├── font/                 # 字体管理模块
│   │   │   ├── mod.rs
│   │   │   ├── scanner.rs        # 字体扫描
│   │   │   ├── parser.rs         # 字体解析
│   │   │   ├── manager.rs        # 字体启用/禁用
│   │   │   └── models.rs         # 数据模型
│   │   │
│   │   ├── commands/             # Tauri命令
│   │   │   ├── mod.rs
│   │   │   ├── font_commands.rs  # 字体相关命令
│   │   │   └── system_commands.rs # 系统命令
│   │   │
│   │   ├── utils/                # 工具函数
│   │   │   ├── mod.rs
│   │   │   ├── registry.rs       # 注册表操作
│   │   │   └── cache.rs          # 缓存管理
│   │   │
│   │   └── error.rs              # 错误处理
│   │
│   ├── Cargo.toml
│   ├── tauri.conf.json           # Tauri配置
│   └── build.rs
│
├── src/                          # React 前端
│   ├── main.tsx                  # 入口
│   ├── App.tsx                   # 根组件
│   │
│   ├── components/               # UI组件
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx     # 整体布局
│   │   │   ├── Topbar.tsx        # 顶栏
│   │   │   └── Sidebar.tsx       # 侧栏
│   │   │
│   │   ├── font/
│   │   │   ├── FontGrid.tsx      # 字体网格
│   │   │   ├── FontCard.tsx      # 字体卡片
│   │   │   ├── FontDetail.tsx    # 字体详情
│   │   │   ├── FontPreview.tsx   # 字体预览
│   │   │   └── PreviewControls.tsx # 预览控制
│   │   │
│   │   ├── search/
│   │   │   ├── SearchBar.tsx     # 搜索框
│   │   │   └── SearchResults.tsx # 搜索结果
│   │   │
│   │   └── ui/                   # shadcn/ui组件
│   │       ├── button.tsx
│   │       ├── slider.tsx
│   │       ├── card.tsx
│   │       └── ...
│   │
│   ├── hooks/                    # 自定义Hooks
│   │   ├── useFonts.ts           # 字体数据管理
│   │   ├── useSearch.ts          # 搜索功能
│   │   ├── useVirtualization.ts  # 虚拟滚动
│   │   └── useTauri.ts           # Tauri命令封装
│   │
│   ├── store/                    # 状态管理
│   │   ├── fontStore.ts          # 字体状态
│   │   ├── uiStore.ts            # UI状态
│   │   └── settingsStore.ts      # 设置
│   │
│   ├── types/                    # TypeScript类型
│   │   ├── font.ts               # 字体类型
│   │   └── api.ts                # API类型
│   │
│   ├── lib/                      # 工具库
│   │   ├── tauri-api.ts          # Tauri API封装
│   │   ├── search-engine.ts     # 搜索引擎
│   │   └── utils.ts              # 工具函数
│   │
│   └── styles/
│       ├── globals.css           # 全局样式
│       └── fonts.css             # 字体样式
│
├── public/                       # 静态资源
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── claude.md                     # 本文档
```

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

#### Rust 端数据模型
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FontInfo {
    pub id: String,                    // 唯一标识
    pub family: String,                // 字体家族
    pub full_name: String,             // 完整名称
    pub postscript_name: String,       // PostScript名称
    pub style: String,                 // 样式（Regular, Bold等）
    pub path: PathBuf,                 // 文件路径
    pub file_size: u64,                // 文件大小
    pub format: FontFormat,            // 格式（TTF/OTF/TTC）
    pub is_variable: bool,             // 是否可变字体
    pub languages: Vec<String>,        // 支持的语言
    pub scripts: Vec<String>,          // 支持的文字系统
    pub metadata: FontMetadata,        // 元数据
    pub status: FontStatus,            // 状态
    pub created_at: i64,               // 添加时间
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FontFormat {
    TrueType,      // .ttf
    OpenType,      // .otf
    TrueTypeCollection,  // .ttc
    Woff,
    Woff2,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FontStatus {
    Enabled,       // 已启用
    Disabled,      // 已禁用
    SystemFont,    // 系统字体（不可禁用）
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FontMetadata {
    pub version: Option<String>,
    pub designer: Option<String>,
    pub manufacturer: Option<String>,
    pub license: Option<String>,
    pub copyright: Option<String>,
    pub description: Option<String>,
}
```

#### TypeScript 端数据模型
```typescript
export interface FontInfo {
  id: string;
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  path: string;
  fileSize: number;
  format: FontFormat;
  isVariable: boolean;
  languages: string[];
  scripts: string[];
  metadata: FontMetadata;
  status: FontStatus;
  createdAt: number;
}

export type FontFormat = 'TrueType' | 'OpenType' | 'TrueTypeCollection' | 'Woff' | 'Woff2';
export type FontStatus = 'Enabled' | 'Disabled' | 'SystemFont';

export interface FontMetadata {
  version?: string;
  designer?: string;
  manufacturer?: string;
  license?: string;
  copyright?: string;
  description?: string;
}
```

---

## 5. 功能实现详细方案

### 5.1 字体扫描和解析

#### 5.1.1 后端实现 (Rust)

**文件**: `src-tauri/src/font/scanner.rs`

```rust
use std::path::PathBuf;
use windows::Win32::System::Registry::*;
use rayon::prelude::*;

pub struct FontScanner {
    font_dirs: Vec<PathBuf>,
}

impl FontScanner {
    pub fn new() -> Self {
        Self {
            font_dirs: vec![
                PathBuf::from("C:\\Windows\\Fonts"),
                PathBuf::from(std::env::var("LOCALAPPDATA").unwrap() + "\\Microsoft\\Windows\\Fonts"),
            ],
        }
    }

    /// 扫描所有字体
    pub async fn scan_all_fonts(&self) -> Result<Vec<FontInfo>> {
        // 1. 读取注册表获取字体列表
        let registry_fonts = self.scan_registry()?;

        // 2. 扫描字体目录
        let file_fonts = self.scan_directories()?;

        // 3. 合并并去重
        let all_fonts = self.merge_fonts(registry_fonts, file_fonts);

        // 4. 并行解析字体元数据
        let parsed_fonts = all_fonts
            .par_iter()
            .filter_map(|path| self.parse_font(path).ok())
            .collect();

        Ok(parsed_fonts)
    }

    /// 读取注册表
    fn scan_registry(&self) -> Result<Vec<PathBuf>> {
        // 打开注册表键：HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts
        // 遍历所有值，获取字体文件路径
    }

    /// 扫描目录
    fn scan_directories(&self) -> Result<Vec<PathBuf>> {
        // 遍历字体目录，查找 .ttf, .otf, .ttc 文件
    }

    /// 解析单个字体文件
    fn parse_font(&self, path: &PathBuf) -> Result<FontInfo> {
        // 使用 ttf-parser 解析字体文件
        // 提取元数据
    }
}
```

**文件**: `src-tauri/src/font/parser.rs`

```rust
use ttf_parser::{Face, Name};

pub struct FontParser;

impl FontParser {
    /// 解析字体文件
    pub fn parse(data: &[u8]) -> Result<FontInfo> {
        let face = Face::parse(data, 0)?;

        Ok(FontInfo {
            family: Self::extract_name(&face, Name::Family)?,
            full_name: Self::extract_name(&face, Name::FullName)?,
            postscript_name: Self::extract_name(&face, Name::PostScriptName)?,
            style: Self::extract_name(&face, Name::Subfamily)?,
            metadata: Self::extract_metadata(&face)?,
            languages: Self::detect_languages(&face)?,
            scripts: Self::detect_scripts(&face)?,
            // ...
        })
    }

    /// 提取字体名称
    fn extract_name(face: &Face, name_id: Name) -> Result<String> {
        // 优先读取英文名称，fallback到其他语言
    }

    /// 检测支持的语言
    fn detect_languages(face: &Face) -> Result<Vec<String>> {
        // 分析字符集覆盖范围
        // Unicode范围：
        // - U+4E00-9FFF: CJK统一汉字 → 中文
        // - U+AC00-D7AF: 韩文 → 韩文
        // - U+3040-309F: 平假名 → 日文
    }

    /// 检测支持的文字系统
    fn detect_scripts(face: &Face) -> Result<Vec<String>> {
        // 读取 OS/2 表的 ulUnicodeRange 字段
    }
}
```

#### 5.1.2 前端调用

**文件**: `src/lib/tauri-api.ts`

```typescript
import { invoke } from '@tauri-apps/api/core';

export async function scanFonts(): Promise<FontInfo[]> {
  return await invoke('scan_fonts');
}

export async function refreshFonts(): Promise<FontInfo[]> {
  return await invoke('refresh_fonts');
}
```

**文件**: `src/hooks/useFonts.ts`

```typescript
import { useEffect } from 'react';
import { useFontStore } from '@/store/fontStore';
import { scanFonts } from '@/lib/tauri-api';

export function useFonts() {
  const { fonts, setFonts, isLoading, setIsLoading } = useFontStore();

  useEffect(() => {
    loadFonts();
  }, []);

  async function loadFonts() {
    setIsLoading(true);
    try {
      const fontList = await scanFonts();
      setFonts(fontList);
    } catch (error) {
      console.error('Failed to load fonts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return { fonts, isLoading, refreshFonts: loadFonts };
}
```

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

### 5.4 智能搜索

#### 5.4.1 搜索引擎设计

**功能要求**：
1. 实时搜索（输入时即时响应）
2. 拼音搜索（"song" → "宋体"）
3. 模糊匹配（容错）
4. 结果排序（相关性优先）

**技术方案**：
- **拼音转换**：使用 `pinyin-pro`
- **模糊搜索**：使用 `fuse.js`
- **防抖优化**：使用 `use-debounce`

#### 5.4.2 实现

**文件**: `src/lib/search-engine.ts`

```typescript
import Fuse from 'fuse.js';
import { pinyin } from 'pinyin-pro';

export class FontSearchEngine {
  private fuse: Fuse<FontInfo>;
  private pinyinIndex: Map<string, FontInfo[]>;

  constructor(fonts: FontInfo[]) {
    // 初始化 Fuse.js
    this.fuse = new Fuse(fonts, {
      keys: [
        { name: 'family', weight: 2 },
        { name: 'fullName', weight: 2 },
        { name: 'postscriptName', weight: 1 },
        { name: 'style', weight: 0.5 },
      ],
      threshold: 0.3, // 模糊度
      includeScore: true,
    });

    // 构建拼音索引
    this.pinyinIndex = this.buildPinyinIndex(fonts);
  }

  search(query: string): FontInfo[] {
    if (!query.trim()) return [];

    // 1. 直接搜索
    const directResults = this.fuse.search(query);

    // 2. 拼音搜索（仅针对中文字体）
    const pinyinResults = this.searchByPinyin(query);

    // 3. 合并结果并去重
    const combined = this.mergeResults(directResults, pinyinResults);

    // 4. 按相关性排序
    return combined.slice(0, 50); // 限制50个结果
  }

  private buildPinyinIndex(fonts: FontInfo[]): Map<string, FontInfo[]> {
    const index = new Map<string, FontInfo[]>();

    fonts.forEach(font => {
      // 为中文字体名生成拼音
      if (this.hasChinese(font.family)) {
        const pinyinStr = pinyin(font.family, {
          toneType: 'none',
          type: 'array'
        }).join('');

        if (!index.has(pinyinStr)) {
          index.set(pinyinStr, []);
        }
        index.get(pinyinStr)!.push(font);
      }
    });

    return index;
  }

  private searchByPinyin(query: string): FontInfo[] {
    const results: FontInfo[] = [];

    this.pinyinIndex.forEach((fonts, pinyin) => {
      if (pinyin.includes(query.toLowerCase())) {
        results.push(...fonts);
      }
    });

    return results;
  }

  private hasChinese(text: string): boolean {
    return /[\u4e00-\u9fa5]/.test(text);
  }
}
```

**文件**: `src/hooks/useSearch.ts`

```typescript
import { useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { FontSearchEngine } from '@/lib/search-engine';
import { useFontStore } from '@/store/fontStore';

export function useSearch() {
  const fonts = useFontStore(state => state.fonts);
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300); // 300ms防抖

  const searchEngine = useMemo(
    () => new FontSearchEngine(fonts),
    [fonts]
  );

  const results = useMemo(
    () => searchEngine.search(debouncedQuery),
    [searchEngine, debouncedQuery]
  );

  return { query, setQuery, results };
}
```

**文件**: `src/components/search/SearchBar.tsx`

```typescript
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearch } from '@/hooks/useSearch';

export function SearchBar() {
  const { query, setQuery } = useSearch();

  return (
    <div className="search-bar">
      <Search className="search-icon" />
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search fonts... (支持拼音搜索)"
        className="search-input"
      />
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
3. **防抖/节流**：搜索、滚动事件优化
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

```tsx
<div className="app-layout">
  {/* 顶栏 - 固定高度 */}
  <header className="h-16 border-b">
    {/* ... */}
  </header>

  <div className="flex h-[calc(100vh-4rem)]">
    {/* 侧栏 - 固定宽度 */}
    <aside className="w-64 border-r overflow-y-auto">
      {/* ... */}
    </aside>

    {/* 主内容 - 自适应 */}
    <main className="flex-1 overflow-y-auto p-6">
      {/* ... */}
    </main>
  </div>
</div>
```

---

## 8. 开发路线图

### Phase 1: 基础框架 (Week 1-2)
- [x] 初始化Tauri项目
- [x] 配置React + TypeScript + TailwindCSS
- [x] 集成shadcn/ui组件库
- [ ] 实现基础布局（顶栏+侧栏+主区域）
- [ ] 创建数据模型和Store

### Phase 2: 字体扫描 (Week 2-3)
- [ ] 实现Rust字体扫描器
- [ ] 集成ttf-parser解析字体
- [ ] 实现缓存机制
- [ ] 前端调用字体列表API
- [ ] 显示基本字体列表

### Phase 3: 字体预览 (Week 3-4)
- [ ] 实现字体网格布局
- [ ] 集成虚拟滚动
- [ ] 实现字体卡片组件
- [ ] 添加预览控制（字体大小、预览文本）
- [ ] 字体懒加载优化

### Phase 4: 搜索功能 (Week 4-5)
- [ ] 实现搜索引擎
- [ ] 集成拼音搜索
- [ ] 实现搜索UI
- [ ] 搜索结果高亮
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

## 11. 总结

这个项目完美结合了你的React技能和Windows原生性能需求。通过Tauri，你可以：

1. **利用现有技能**：80%的开发时间在熟悉的React领域
2. **学习新技术**：逐步掌握Rust和Windows开发
3. **达成性能目标**：极速启动、流畅交互
4. **构建现代UI**：使用最新的设计系统

项目架构清晰、可扩展性强，适合长期维护和迭代。

---

**文档版本**: 1.0
**最后更新**: 2025-12-11
**作者**: Claude Code
