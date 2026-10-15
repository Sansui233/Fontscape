# Fontscape

[English](./README.md)

基于 Tauri 和 React 构建的现代化 Windows 字体浏览、管理工具。

> 此项目还有一堆东西没有开发完，但是对于日常最需要筛选字体够了所以发上来试试

## 截图

![Main View](./docs/media/main.png)

## 下载

从 [GitHub Releases](https://github.com/Sansui233/Fontscape/releases/latest) 下载最新的 Windows 安装包。

需要 Windows 10/11。

## 为什么做这个

- 能准确按语言筛选字体，基本支持打算完善东亚三国语言。
- 能查看对应的 CSS 变量名

Windows 自带的字体软件对于语言的分类筛选几乎等于不可用。作为中文用户，非常想要一个能真的筛选中文字体的字体浏览器。所以有了这个项目。

另外，网上的字体文件元数据比较混乱，例如部分简体中文字体的 css 字体家族名其实是繁体等等。因此使用浏览器解析的优先级来获取可用的 css font-family name.

## 功能

- **浏览**：网格和列表视图（虚拟滚动），实时预览文字与字号，缺失的字形显示为 □
- **筛选**：按语言、类型（衬线 / 无衬线 / 等宽 / 手写 / 装饰）、名称和标签筛选
- **已存筛选**：把条件保存为命名筛选，可用多级文件夹整理，支持拖动
- **标签**：通过卡片 / 列表右键菜单、多选模式或详情页给字体家族打标签
- **详情页**：家族全部字重、多文字样张、Name 表元数据
- **本地化名称**：按界面语言显示中文 / 日文 / 韩文字体名
- **界面**：English、简体中文、日本語、한국어；浅色 / 深色 / 跟随系统
- **本地存储**：筛选、标签、设置和上次的界面状态保存在本地 SQLite 数据库

## TODO

- [ ] 快速启动（字体解析增量缓存）
- [ ] 拼音搜索中文字体
- [ ] 纸张视图
- [ ] 多选模式下的批量操作
- [ ] 安装/移除/开关 字体
- [ ] 使用开放源下载
- [ ] 导出字体样张

---

## 开发

### 技术栈

#### 前端
- React 19 + TypeScript
- Tailwind CSS 4
- Zustand（状态管理）
- TanStack Virtual（虚拟滚动）
- React Router 7
- Vite

#### 后端
- Tauri 2
- Rust
- ttf-parser（字体解析）
- rusqlite（本地存储）
- Windows API 绑定

### 快速开始

#### 环境要求
- Node.js 18+ 和 pnpm
- Rust 1.70+
- Windows 10/11

#### 安装步骤

1. 克隆仓库：
```bash
git clone https://github.com/Sansui233/Fontscape.git
cd Fontscape
```

2. 安装依赖：
```bash
pnpm install
```

3. 开发模式运行：
```bash
pnpm tauri:dev
```

4. 生产环境构建：
```bash
pnpm tauri:build
```

### 项目结构

```
fontscape/
├── src/                    # React 前端
│   ├── components/         # UI 组件（布局、字体、筛选、标签、设置）
│   ├── pages/              # 网格、列表和字体家族详情页
│   ├── store/              # Zustand 状态管理
│   ├── i18n/               # 界面翻译
│   └── lib/                # 工具函数和 Tauri API 封装
├── src-tauri/              # Rust 后端
│   └── src/
│       ├── font/           # 字体扫描、解析和分类
│       ├── filters/        # 已存筛选和文件夹
│       ├── tags/           # 字体家族标签
│       ├── settings/       # 界面状态和偏好设置
│       ├── persistence/    # SQLite 数据库与结构升级
│       └── commands.rs     # Tauri 命令
└── docs/                   # 设计说明和功能完成度
```

### 开发路线图

- [x] 阶段 1：基础框架搭建
- [x] 阶段 2：字体扫描和解析
- [x] 阶段 3：字体预览
- [x] 阶段 4：搜索功能
- [ ] 阶段 5：字体管理（启用/禁用）
- [x] 阶段 6：分类和过滤
- [x] 阶段 7：字体详情页
- [ ] 阶段 8：性能优化
- [ ] 阶段 9：打磨和发布

### Todo

- [ ] AI Tagging
- [ ] 滚动更新

### 贡献

欢迎贡献代码！请随时提交 Pull Request。

## 许可证

GNU3.0

## 作者

Sansui233
