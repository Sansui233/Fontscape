# 字体过滤与本地存储开发计划

> 更新：2026-09-11。主体方案已批准；Category 分类方案及少量交互边界仍待明确。Phase 0/1 的基础代码已实现，review 发现的遗漏见第 5 节。
> 本文区分“最终要做什么”和“目前已经做到哪里”。本次整理只修改文档。

## 1. 最终要做到什么

用户可以按 Language 和 Category 筛选字体，立即看到结果，也可以把条件保存为有名字的 Filter。保存后的 Filter 显示在 Sidebar，重启后仍然存在。

应用也要记住用户的界面设置，并缓存字体解析结果。每次启动检查字体文件是否变化，只重新解析新增或变化的文件，减少重复工作。

这次不做 Tag 管理、字体启用/禁用、云同步、目录实时监听和滚动位置恢复。

## 2. 界面和操作规则

### Toolbar

Grid 的 Font Toolbar 左侧放 Filter 图标，复用项目已有的 `lucide-react`。默认使用 `text-primary`；有筛选条件时使用蓝色。当前主题的 `accent` 是灰色背景，因此新增独立的 `brand` 颜色，保留原有主题颜色的用途。

沿用此前 Plan 的交互：hover 显示圆角背景，click 打开筛选面板。面板依次是 Language 多选、Category 多选和 Save filter。多选支持查找和清除；修改后立即过滤，关闭面板不撤销条件。Escape 或点击外部关闭面板。

Category 表示 Serif、Sans Serif 等字体分类。界面标签统一为 `Category`，Filter 多选字段统一为 `categories`；字体分类数据独立于现有 `font.style`，分类方法仍待确定。

这里不能直接使用现有 `font.style`：它表示 Regular、Bold、Italic 等字形样式。实现前需确定分类选项、分类依据和无法识别时的 Unknown 处理；分类由后端产生并随解析结果缓存，规则变化时更新缓存版本。

原始描述也可能表示 hover 就打开面板，与此前 Plan 的 click 打开不同；此处保留为待明确项，不把两种行为混在一起。

### filter 匹配逻辑

- 一项内多选用 OR：同一项中选多个值，满足任意一个即可。例如 English + Chinese 表示两者之一。
- 多项之间用 AND：Language 与 Category 都设置时，两项都要满足。

### filter 的状态与复用

- Search text 继续和筛选条件一起生效，但不存入命名 Filter。
- Grid 和 List 使用同一个过滤函数，避免切换视图后结果不同。
- 保存成功后，Sidebar 选中新 Filter；只有搜索文字变化，不影响 Filter 的选中状态。
- 应用已有 Filter 后，在 Toolbar 改条件只改变当前筛选，不自动覆盖原 Filter；条件不同后取消原条目的选中标记。此时 Save filter 按新建处理；更新原 Filter 通过 Edit 弹窗完成。
- 编辑正在使用的 Filter，保存成功后同步更新结果；编辑其他 Filter 不切换当前筛选。
- 没有结果时仍显示 Toolbar；多选控件选一项后保持展开，方便连续勾选。选项来自完整字体数据或固定分类，不随当前结果消失。
- 保存请求进行中禁用重复提交；设置保存失败应有提示，避免用户误以为重启后一定能恢复。

Grid 显示的是 family，但条件来自字体数据。仍需明确：Language 与 Category 是否必须由同一个 face 满足，还是可以分别由 family 内不同 face 满足。现有辅助函数使用后者；在接入 Grid/List 前确定规则。

### filter 的新建、修改和删除

| 操作 | 预期行为 |
| --- | --- |
| 保存新 Filter | 点击 Save filter 后输入名称；成功保存到后端后，加入 Sidebar |
| 取消新建 | 不保存名称，但保留当前即时筛选条件 |
| 应用 Filter | 左键点击 Sidebar 条目，立即应用，保留 Search text |
| 修改 Filter | 右键选择 Edit；弹窗包含原名称、Language、Category；Save 直接更新，不再弹命名窗口 |
| 取消修改 | 丢弃弹窗内的修改，原 Filter 和当前筛选结果不变 |
| 删除 Filter | 右键选择 Delete 并确认；后端删除成功后移除条目 |
| 删除正在使用的 Filter | 清除 Language 和 Category，回到 All Fonts |
| 保存失败 | 保留输入内容，显示错误；Sidebar 保持原状 |

名称去掉首尾空格后为 1–64 个字符，不允许大小写不同的重复名称；没有任何条件时不能保存。

筛选面板和编辑弹窗共用 `FilterFields`。Dialog、Popover 和 Multi-select 按项目现有 React/Tailwind 方式实现，不引入新的 UI library。

### Sidebar

```text
Filters
├─ All Fonts（清除筛选）
├─ Language
│  └─ English / Chinese / Japanese / Korean / Russian / Arabic / Unknown
└─ Saved
   └─ 用户保存的 Filter

Tags
└─ 暂无内容
```

Language presets 首次建库时写入。用户可以修改或删除，删除后下次启动不会自动补回。修改后的 preset 仍在 Language 组。

## 3. 数据怎么保存、启动时怎么加载

### 本地数据库

使用 Rust 的 `rusqlite`，数据库位于 `<app_data_dir>/fontscape.db`。前端通过 Tauri commands 读写，不直接操作数据库。

| 表 | 保存什么 |
| --- | --- |
| `schema_migrations` | 数据库已执行的结构升级版本 |
| `saved_filters` | Filter ID、名称、分组、条件、顺序、创建和修改时间 |
| `app_settings` | UI state 和用户偏好，按 namespace/key 保存 |
| `font_file_cache` | 每个字体文件的位置、大小、修改时间、解析版本、解析结果和时间 |

目标 Filter 条件存为 `{ languages: [], categories: [] }`。名称另存小写形式的 `name_key`，用于查重；当前做法是 lowercase，并不是完整的 Unicode normalization/case folding。

UI state 保存当前 Filter ID、当前条件、Sidebar 折叠状态、Grid/List 视图。用户偏好保存预览文字、字号、字重、斜体、右侧栏宽度和界面语言。弹窗是否打开、hover、多选选中项、loading/error 等临时状态不保存。

### 写入规则

命名 Filter 的增删改必须按这个顺序：

```text
界面操作 → store action → Tauri command → 后端校验并写入 SQLite
→ 返回成功结果 → 更新前端列表
```

不能先让界面显示“保存成功”，再尝试写数据库。接口需要返回稳定的错误 code 和可读信息，让前端准确区分重名、无效输入、找不到记录和写入失败。

即时筛选和界面偏好则先更新画面，再合并频繁变化后保存。这样拖动字号或连续勾选时不会等待磁盘写入。

### 启动流程

1. Tauri 初始化数据库，执行必要的结构升级；新数据库写入 Language presets。
2. 前端根组件只调用一次 `bootstrap_app`，读取 Filter、设置和字体数据。
3. 后端列出系统和用户字体目录中的 TTF、OTF、TTC 文件，检查大小和修改时间。
4. 未变化的文件读取缓存；新增或变化的文件重新解析；确认已删除的文件移除缓存。
5. 汇总字体 family，返回完整结果，前端恢复设置并显示界面。

需要等这轮检查和必要解析完成后再返回数据。Sidebar 只读取 store，避免当前 App 和 Sidebar 各自触发扫描的问题。

加载期间显示 loading，Filter 和设置恢复完成前不展示可操作的默认列表。保存的 active Filter ID 已不存在时回到 All Fonts；只有未命名的当前条件才独立恢复。加载失败显示原因和重试入口，不静默当作空数据。

### 字体缓存规则

- 文件 location 是唯一键，保存规范化路径，同时保留原路径用于显示和打开 Explorer。
- 一个 TTC 文件可能含多个 faces，全部放进这个 location 的缓存记录。
- 文件大小、修改时间或 parser 版本变化时，重新解析。
- 普通 Refresh 使用同一套增量逻辑；保留强制重新解析的后端入口。
- 解析放到后台 blocking task 中，数据库事务只负责写结果，不覆盖整个解析过程。
- 单个缓存结果损坏时重新解析该文件；变化后的文件解析失败时记录错误，不把旧结果当成新结果。
- 目录读取失败不等于文件已删除，不能据此清空缓存。
- 数据库升级失败时保留原数据并报告原因，不自动删库重建。

大小和修改时间完全相同的内容替换可能漏检，强制解析用于恢复。当前 `FontInfo.created_at` 是解析时间，不代表安装时间；本次保留现有字段，不额外实现 Recently Added。

## 4. 代码按什么职责划分

| 位置 | 职责 |
| --- | --- |
| `src/types`、Rust models | 定义前后端传递的数据格式 |
| `src/lib/font-filter.ts` | 共用过滤逻辑，Grid/List 都调用它 |
| `filterStore` | 保存 Filter 列表、当前条件，以及增删改 action |
| `uiStore` / `fontStore` | 分别管理界面设置和字体数据 |
| Filter 组件 / Sidebar | 展示、输入、调用 action |
| `commands.rs` | 接收前端请求、调用后端服务、返回结果 |
| `filters/service.rs` | 校验名称和条件，处理 Filter 业务规则 |
| `filters/repository.rs` | Filter 的 SQL 读写 |
| `persistence` | 数据库连接、结构升级、存储错误 |
| `font/scanner.rs` / 后续 cache 模块 | 分别负责读取解析字体、判断是否复用缓存 |
| `app_state.rs` | 初始化并提供后端服务 |

继续使用现有 React、Zustand、Tauri 和字体解析代码。只为明确的职责增加模块，不建设通用框架。

## 5. 已有改动 review

Review 日期：2026-09-11。依据当前代码和之前的执行记录；本轮没有重新运行 build/tests，也没有修改实现代码。

### 已经做了什么

| 改动 | 当前效果 | 是否符合计划 |
| --- | --- | --- |
| Filter、Settings、Bootstrap 的 Rust/TypeScript 类型 | 定义了大部分数据格式，尚未接通启动接口 | 符合 Phase 0，但统一错误格式遗漏 |
| `fileSize` 改为 `file_size` | 两个字体详情组件与后端字段一致 | 符合 Phase 0，属于实际修复 |
| 新增共用过滤函数和 options 函数 | 已写好 OR/AND；但分类筛选错误地读取 `font.style` | Language 逻辑可复用，Category 需改字段和数据来源，family 匹配边界待明确 |
| 引入 bundled SQLite、建库与版本升级 | Tauri setup 已接入数据库初始化 | 符合 Phase 1 |
| 七个 Language presets | 首次升级写入，删除后不会重建 | 符合 Phase 1 |
| Filter repository/service | Rust 内部可增删改查，支持基础名称和空条件校验 | 符合方向，但还有下述问题 |
| settings/cache 两张表 | 只有存储结构，还没有保存设置或复用字体解析的逻辑 | 符合当前阶段，不代表功能已完成 |
| Tauri commands 和前端 action | Filter CRUD 尚未暴露给前端 | 属于后续阶段，并非已有可用 UI |

准确的进度是：**Phase 0/1 的主要基础已具备，但还不能说 Filter 保存和字体缓存已经可用。**

### 需要补齐的问题

1. **保存结果与返回结果之间有间隔。**  
   `filters/repository.rs` 的 create 先提交事务，再另开连接读取记录；update 也是写完后再读取。如果这次读取失败，调用方会收到失败，但数据其实已保存。后续界面可能提示用户重试，重试又遇到重名。应在同一事务内取得返回记录，再提交；提交成功才返回成功结果。

2. **条件校验只检查数组是否都为空。**  
   `filters/service.rs:validate_criteria` 会接受 `styles: [""]` 或未知 Language。接入 command 前，需要按 Category 定义校验分类值，并拒绝未知 Language，并统一条件值；否则数据库能存入没有意义的 Filter。

3. **错误格式尚未完成。**  
   目前只有 Rust 内部 error，没有双方约定的可序列化 code/message。且 `map_write_error` 把所有数据库约束错误都当成“名称重复”，可能误报原因。只应把名称唯一性冲突映射为重名，其余错误保留实际原因。

4. **启动失败的提示还不符合最终规划。**  
   setup 失败会沿 `run(...).expect(...)` 结束启动，尚无可读的恢复界面，也没有统一附带数据库路径的错误说明。这不影响正常建库，但之前文档承诺的失败提示还没实现。

5. **类型和验证记录需更准确。**  
   Rust 的 `view_mode` 是任意 String，TypeScript 限定为 grid/list，接入设置写入前应对齐。已有 Bootstrap 测试只反序列化 Rust fixture，不能证明完整的跨端类型一致。

以上是 review 发现，尚未修复。优先在后端接口接入前补齐前三项。

### Category / style 修正结果（2026-09-11）

本轮已将 FilterCriteria、默认值、后端校验和测试统一为 `categories`；过滤函数读取独立的 `font.category`，选项函数改为 `getAvailableCategories`。原有 `font.style` 和斜体预览逻辑保留。

FontInfo 新增可空的 `category` 字段；当前 scanner 返回 null，表示尚未分类。分类算法仍待实施，不能把本次字段修正视为分类功能完成。

数据库增加 v2 migration：把空的旧 `styles` 转为 `categories`，保留 v1 历史升级代码。遇到非空旧样式条件时回滚本次升级并明确报错，保留原数据，需要显式修正这些旧条件后重试；不会把 Regular/Italic 自动解释为类别。目前尚无 settings 写入功能，本轮迁移针对已存在的 saved_filters。

验证：`pnpm build` 通过，Rust library tests 12/12 通过（含旧条件迁移与拒绝错误转换测试）。本节以下表格保留为修正前的 review 记录，其他后端 review 问题尚未处理。

### Category / style 命名检查（修正前记录）

已确认命名：界面用 **Category**，筛选条件用 `categories`；现有 `font.style` 保留，表示 Regular、Bold、Italic。不能将所有 style 字段整体重命名。

检查包含 staged、unstaged 和未跟踪的新文件；相关新代码大多尚未跟踪，普通 `git diff` 不会显示它们。

| 位置 | 发现 | 后续处理 |
| --- | --- | --- |
| `src/types/filter.ts`、`filters/models.rs` | FilterCriteria 使用 `styles` | 改为 `categories`，同步空条件默认值 |
| `src/lib/font-filter.ts` | 直接对比 `font.style`，options 也来自这个字段 | 这是实际语义混淆；改读后端分类数据，options 函数改名为 `getAvailableCategories` |
| `filters/service.rs` | 校验读取 `criteria.styles`，测试使用 Regular/Italic | 同步分类字段，测试使用分类值 |
| `persistence/migrations.rs`、`bootstrap.rs` | preset 和测试 JSON 使用 `styles` | 同步为 `categories`，并处理已创建数据库中的旧 JSON |
| 现有 FontInfo、scanner、字体详情与斜体预览 | `style` 用于解析/显示 subfamily、判断 Italic | 用途正确，保留 |

目前新过滤函数尚未接入 Grid/List，因此这次混淆尚未改变现有界面的筛选行为；但新建数据库的 preset JSON 已会使用旧字段。

后续修改不只是改名：还需产生分类数据。若数据库已初始化，应通过 migration 转换旧条件；旧 `styles` 中的 Regular/Italic 不能直接复制到 `categories` 当成分类。非空旧条件需要明确的兼容处理，不静默改变含义或删库。本轮仅记录问题，未改代码。

### 哪些差异合理，哪些原文写得不准确

增加 `service.rs` 用于输入校验，`repository.rs` 专注 SQL，职责清楚，符合原方案。新增 `name_key` 查重也合理，但原文“Unicode normalization”用词过大，现已改正。

原文重复保留了“待确认”、第三方 UI/test library 的旧方案，以及“需要 frontend 自动测试”的步骤，与用户后续决定冲突；现已统一为项目自有 UI，frontend 由用户测试。

原文一边把 Phase 0 全部打勾，一边遗漏 typed error；一边说 cache 未实现，一边容易让人误以为建表就是缓存完成。这次已分开写清。之前还把后续日期的决策和实施标成 9 月 9 日，本版不再沿用不可靠的完成日期。

当前 `commands.rs` 和 `font/check.rs` 仅剩新增文件末尾换行的无关改动，无行为变化。工作区还存在 `.gitignore`、`claude.md` 的改动；它们不在此前本功能的编辑记录里，不归入本次实现评价，也不修改。

### 验证到了什么程度

此前记录：`pnpm build`、`cargo check --offline` 通过，Rust library tests 11/11 通过。其中新增测试覆盖建库、重复执行 migration、拒绝较新 schema、基本 CRUD、基础输入校验、删除 preset 后重新打开数据库。

尚无真实 App 完整重启的验收记录；测试也未覆盖上述写后读失败等情况。编译成功和这些测试通过，不能等同于全部产品需求完成。

## 6. 后续验收标准

- Filter 增删改成功后重启仍在；失败时前端保留原状态。
- Grid/List 对相同条件给出相同 family 集合。
- 修改弹窗取消后，原 Filter 不变。
- 没有匹配字体时 Toolbar 仍可用，可以清除条件。
- 第二次启动，未变化字体的解析次数为 0；新增、变化、删除文件得到对应更新。
- UI state 和偏好恢复，临时选中状态不恢复。
- 不新增 frontend test dependencies；开发侧做必要编译和 Rust 验证，界面由用户手动测试。

## 7. 简版开发步骤

| 阶段 | 做什么 | 当前状态 |
| --- | --- | --- |
| Phase 0 | 统一数据格式，修正文件大小字段，准备共用过滤函数 | 基础完成，统一错误格式待补 |
| Phase 1 | 建立 SQLite、结构升级、语言预设和后端读写 | 基础完成，review 问题待补 |
| Phase 2 | 确定并加入 Category 分类，实现增量字体缓存和单一启动接口 | 分类、`bootstrap_app` 已完成；**增量缓存未做** |
| Phase 3 | Grid/List 接入共同的 Filter store 和过滤函数 | 完成 |
| Phase 4 | 做 Toolbar Filter 面板，接通 create command/action 和命名保存 | 完成 |
| Phase 5 | 做 Sidebar 分组，接通 update/delete command/action 和编辑删除 | 完成 |
| Phase 6 | 保存界面偏好、补齐失败提示并完成验收 | 代码完成，待用户手动验收 |

2026-10-16 实施说明：
- 第 5 节 review 的前三项已修复：在同一事务内写入并读回；条件只接受已知值，并去重排序；只有 `name_key` 冲突才报重名，其余错误统一返回 `{code, message}`。
- 第 4 项已修复：数据库初始化失败时应用仍能启动，bootstrap 会显示原因和数据库路径，并提供重试按钮。
- 第 5 项已修复：`view_mode` 改为枚举，与 TS 类型一致。
- 2026-10-16 UI 调整：原 Toolbar 合并进单行标题栏，已选条件改为内容区顶部的 chip 行（ContentBar）。下文中的「Toolbar」都指标题栏里的 Filter 按钮。
- 已决定的待定项：
  - 面板点击才打开（不是 hover）；
  - Language 与 Category 必须由同一个 face 满足；
  - 分类规则见 `font/classifier.rs`，版本号 `CLASSIFIER_VERSION` 预留给缓存使用。

继续开发时先补齐第 5 节的后端问题，再进入 Phase 2。每阶段报告实际完成的行为和验证结果。
