# AGENTS.md · Club OS 工作区指南

南昌航空大学科技学院计算机科技小组官网（前端 + 后端一体仓库）。前端 React 19 + Vite 7 + TypeScript（**pnpm**），后端 FastAPI + MySQL，位于 `backend/OS_club`。

## 当前状态（2026-10）

- 入口页（`#/home`）已按「纯白 + 墨黑 + 唯一红 `#e8442a`」改版完成：首屏在 `hero-poster.css`，02–06 六节与统一页脚共用 `poster-sections.css` 的原子件。旧的装饰层（网格 / 斜带 / 水印 / 十字标 / 假仪表 / 巨型英文轮廓字 / 刊物印记）已全部删除，`src/data/mock.ts` 的四篇博客文案也已去过 AI 味。
- 工具页（`#/tools`）与业务页仍是旧视觉（暖色纸底 + 海军蓝 `#073f73` + 深浅主题开关）。**改版只覆盖入口页**，动工具页前先问清楚范围。
- 工程基建已就位：ESLint / Prettier / Vitest / Playwright / Tailwind 骨架；`src/App.tsx` 已从 528KB 拆到 281KB，拆出 `components/home/ExpandedHomePage.tsx`、`components/admin/AdminPage.tsx`、`lib/app-shared.tsx`。

## 常用命令

```bash
pnpm install           # 安装依赖
pnpm dev               # 前端开发服务器 http://127.0.0.1:5173（/api、/uploads 已代理到 8000）
pnpm build             # tsc -b && vite build（多 chunk，常规交付）
pnpm build:static      # build + 产出可双击打开的静态包（scripts/prepare-static.mjs）
pnpm build:standalone  # 单文件 nchu-cs-club-standalone.html（自动走 vite build --mode standalone）
pnpm verify:standalone # 用系统 Edge 以 file:// 打开单文件版，校验应用真的挂载出来
pnpm preview           # 预览构建产物
pnpm format            # prettier --write .（只覆盖新文件，见「已知债务」）
pnpm lint:fix          # eslint . --fix
pnpm test:watch        # vitest（监听模式）
```

质量门禁（提交前跑这四个）：

```bash
pnpm typecheck   # tsc -b
pnpm lint        # eslint .（基线 0 error / 13 warning）
pnpm test        # vitest run（src/**/*.test.tsx）
pnpm e2e         # playwright test（系统 Edge；复用 5173 上已运行的 dev server）
```

`e2e/` 的两个 spec 跑在 5173 的 dev server 上（`reuseExistingServer: true`，没起它会自己拉起一个）。`e2e/.artifacts/` 是 Playwright 的 outputDir，**每次运行都会清空**，别往里放常驻脚本。

后端与数据库（一键，幂等）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev-up.ps1
```

- 后端：`backend/OS_club/.venv/Scripts/python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000`，健康检查 `/api/health`。
- 数据库：`D:\_tools\mysql-8.4.9-winx64`（便携版，非服务），`root / 123456`，库 `club_os`。建表用 `backend/OS_club/init_db.py`。
- 后端测试：`cd backend/OS_club && .venv/Scripts/python.exe -m pytest`。

## 目录地图

| 位置                                                                                             | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/App.tsx`                                                                                    | 路由分派（`App()`）、顶部导航、各业务页面与弹窗。**单文件不得超过 500KB**，见下方约束。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/components/home/`                                                                           | 入口页（宣传页）全部组件与样式：`ExpandedHomePage.tsx`（滚动编排与 Lenis）、`HomeLanding.tsx`、`SiteHeader.tsx`、`About/Offer/Picks/Blog/JoinSection.tsx` + 同名 `.css`。视觉规范在 `hero-poster.css`（首屏）与 `poster-sections.css`（02–06 共用原子件，由 `ExpandedHomePage.tsx` 导入），两者都在 `home-redesign.css` 之后加载，见下方约束 7 与 8。                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/components/admin/AdminPage.tsx`                                                             | 管理后台（从 App.tsx 拆分出的独立模块）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/lib/app-shared.tsx`                                                                         | App 级共享小工具：`Theme`/`BackgroundPreference` 类型、`Tag`/`Avatar`、`safeLink`/`safeImageSource`、`roleLabels`、成员排序合并辅助。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/components/admin-modals.tsx`、`prompt-modals.tsx`、`interviews.tsx`、`turnstile-widget.tsx` | 各业务域弹窗组件。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/services/`                                                                                  | 数据边界层：`*.service.ts`（HTTP 调用）、`*.context.tsx`（React Context）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/styles.css` + `src/components/**/*.css`                                                     | 全局 token 与页面样式。深色档由 `html[data-theme='dark']` 驱动，但**只覆盖工具页与业务页**：`src/components/home/**` 里 `data-theme='dark'`、`prefers-color-scheme` 零命中，入口页永远是纯白纸底（见约束 10）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/main.tsx` + `src/tailwind.css`                                                              | 挂载入口与 Tailwind 骨架。Tailwind 4 由 `@tailwindcss/vite` 接入，`tailwind.css` **只导 `theme` + `utilities` 两个 layer、不导 preflight**（`styles.css` 自带 reset，preflight 会打乱旧页面；未分层 CSS 优先于 `@layer`）；`@theme inline` 把既有 token 映射成 Tailwind token，**不要映射 `--radius-*` / `--shadow-*`**（会变成自引用循环）。                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/components/home/about-groups.ts`                                                            | 入口页 02 的项目组 / 算法组数据（`ABOUT_GROUPS`、`ABOUT_GROUP_ORDER`）。注意 `preview` 与 `keywords` 两个字段目前没有任何渲染点。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/types.ts`、`src/data/mock.ts`                                                               | 领域模型类型；本地演示数据（`VITE_CONTENT_SOURCE=mock` 时使用）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `backend/OS_club/`                                                                               | FastAPI 应用：`routers/`、`crud/`、`models/`、`schemas/`、`utils/`、`migrations/`、`tests/`。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `docs/`                                                                                          | 契约与设计文档，接口以 `docs/api-contract-v1.md` 为准。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `scripts/`                                                                                       | 构建与本地脚本。常用：`dev-up.ps1` / `dev-up.cmd`（一键起 MySQL + FastAPI）、`prepare-static.mjs`、`create-standalone.mjs`、`verify-standalone.mjs`。改版后用得到的探针：`node scripts/snap-poster.mjs <标签> <宽x高>` 截首屏、`node scripts/snap-sections.mjs [宽x高]` 逐节截 `viz/section-*.png`（含页脚）并打印每节 bg/文字色、`node scripts/poster-recolor.mjs [--check]` 把区段 CSS 的非中性色机械换成白 / 墨黑、`node scripts/strip-dead-css.mjs <css> <选择器…> [--check]` 按选择器令牌精确删死规则（选择器列表死活混排时只剔死的那半）。其余 `snap-blog / snap-join / snap-join-mobile / snap-offer-plain / snap-picks / snap-precise / snap-interlude-stages / screenshot-hero / inspect-about / update-story-css / archive-and-trim-home` 都是改版前针对旧类名写的，多数已取不到元素。 |
| `e2e/`、`playwright.config.ts`                                                                   | Playwright 用例（`home.spec.ts` 含「标题不单字折行」的防回归断言、`standalone.spec.ts`），跑系统 Edge（`channel: 'msedge'`），不需要下载浏览器。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/test/setup.ts`、`vitest.config.ts`                                                          | jsdom 单测环境（`afterEach` 自动 cleanup），单测放 `src/**/*.test.tsx`，现有 `src/lib/app-shared.test.tsx`。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `eslint.config.js`、`.prettierrc.json`、`.prettierignore`                                        | lint / 格式化的唯一真源；`scripts/**/*.mjs` 同时给了 node + browser 两套 globals（脚本里 `page.evaluate(() => document…)` 要用到）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `backups/`                                                                                       | 手工存档（`.bak`），**只读参考，不参与构建**。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `.agents/skills/`                                                                                | 项目级技能（frontend-design、prototype、tdd、code-review 等），随仓库走。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## 硬约束（踩过坑，别回退）

1. **禁止运行时动态分包**：不要用 `React.lazy` / `import()`。`scripts/prepare-static.mjs` 把入口脚本改成 classic `<script defer>` 以便 `file://` 双击打开；单文件版必须由 `pnpm build:standalone`（= `vite build --mode standalone`，关掉 manualChunks 并 `inlineDynamicImports`）产出**不含顶层 import/export 的整包**，`scripts/create-standalone.mjs` 会因此拒绝直接拿 `pnpm build` 的多 chunk 产物打包。动态 chunk 会同时破坏「解压双击」与单文件版。拆分代码请用**静态 import 的新模块**。
2. **单文件交付物专用模式**：`nchu-cs-club-standalone.html` 走 `.env.standalone`（`VITE_CONTENT_SOURCE=mock`），因为 `file://` 下没有后端，用 api 源会满屏 CORS 报错。改动交付链后请跑 `pnpm build:standalone && pnpm verify:standalone`。
3. **单文件尺寸 ≤ 500KB**：Babel 对超过 500KB 的文件会打印 `[BABEL] Note: the code generator has deoptimised the styling of ...` 并显著拖慢构建。`src/App.tsx` 已经通过拆出 `components/home/ExpandedHomePage.tsx`、`components/admin/AdminPage.tsx`、`lib/app-shared.tsx` 降到 300KB 以内，新增代码请继续按业务域拆分。
4. **端口固定 5173 / 4173**：Windows 防火墙为 WireGuard 网段（`10.114.114.0/24`、`fd42:42:42::/64`）钉死了这两个端口，`strictPort: true` 不要关。
5. **保留 `watch.ignored` 里的临时文件规则**：编辑器原子写产生的 `.<name>.<pid>.<uuid>.tmpdir` 目录会让文件监视器抛 `EBUSY` 并杀死 dev server，`**/*.tmpdir/**`、`**/*.tmp` 必须留下。
6. **路由是 hash 路由**：没有 react-router，`routeFromHash()` / `navigate()` 在 `src/App.tsx` 内实现（`#/home`、`#/tools`、`#/admin`…）。新增页面请沿用这套机制。
7. **入口页首屏的样式分层**：`src/components/home/hero-poster.css` 在 `home-redesign.css` 之后加载，**同等特异性下它一定胜出**（包括旧文件里那些 `@media` 断点）。所以：
   - 凡在 `hero-poster.css` 里改过的属性，响应式值必须在**它自己的媒体查询**里重给一遍，不能指望 `home-redesign.css` 的断点；
   - `--poster-*` 调色板变量定义在 `.home-story-scroll` 上（首屏与顶部导航是兄弟节点，只定义在 `.home-hero-viewport` 里导航会取不到值、回落到 `styles.css` 给根节点的暖棕 `#3b2c24`）；
   - `.home-story-scroll` 自己的暖色纸底与光斑是给下面几个区段用的，不要动。
8. **入口页 02–06 的视觉语言**：纯白 `#ffffff` 纸底 + 墨黑 `#111111` + 唯一红 `#e8442a`（`--poster-accent`，仅用于 `.poster-eyebrow` 红杠与复制失败的提示）。
   - 共用的排版原子件只有 `poster-sections.css` 里的 `.poster-eyebrow` / `.poster-eyebrow--plain` / `.poster-section-title` / `.poster-next`，各区段 CSS 不要再重复定义它们；新加的眉标必须带 `white-space: nowrap`（窄列折行会顶乱左对齐线）。
   - 区段里**不要再出现海军蓝 `#073f73`、暖纸 `#faf8f2`、浅青 `rgba(159,209,222,·)` 等旧色**（它们已被 `poster-recolor.mjs` 批量替换过）；补规则时用 `--poster-*` 变量，颜色写错会让整节与首屏脱节。
   - 装饰性元素（网格/斜带/水印/十字标/假仪表/巨型英文轮廓字/刊物印记）一律不加：海报感靠留白与字号层级，不靠装饰。
   - 改完区段样式必须跑 `node scripts/snap-sections.mjs 1440x900`（`errors: none`）并肉眼复核 `viz/section-*.png`；`.poster-eyebrow` 的红杠、行条目 hover、复制按钮三态是最容易被 CSS 解析错误整条吞掉的地方（曾因注释被咬成 `//*` 导致 `position: relative` 整条失效）。
9. **Tailwind 只做骨架，不做第二套设计系统**：不导 preflight，也不要回头把旧页面的语义类名（`hero-*`、`about-*`、`story-*`…）改成 Tailwind 工具类 —— 那些类名是 `styles.css` 与各区段 CSS 的契约。新组件可以用工具类，但先确认不与既有类名冲突（已实测无碰撞：全仓 1420 个类名 token 与 Tailwind 单字工具类交集为 0）。
10. **入口页没有深色主题**：切主题的入口只存在于工具页 / 业务页。`src/components/home/**` 的 CSS 里 `data-theme='dark'` 零命中，入口页按纯白纸底设计（见约束 7、8）；想给它加深色规则先确认产品要求。
11. **入口页的设计改动必须走《设计工作流》**：新视觉方向 / 新页面 / 整节改版属于「全套档」，动代码前先出 token 表与一张待确认的 `visualize` 卡片；文案、间距、错字、bug 修属于「小修档」，只跑验收闸门。两档都必须用真浏览器实测验收（`node scripts/snap-sections.mjs 1440x900` 的 `errors: none` + 肉眼复核 `viz/section-*.png`），不允许只读 CSS 就下结论。

## 设计工作流（入口页）

适用范围：入口页 `#/home`（首屏 + 02–06 + 页脚）。工具页 `#/tools` 与业务页仍是旧视觉语言（暖纸 + 海军蓝体系），**不在本流程内** —— 要动它们先确认范围。

### 触发分级

| 档位 | 什么算这一档                 | 必须做什么                                                                                                                                                                                                 |
| ---- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 全套 | 新视觉方向、新页面、整节改版 | 加载 `frontend-design` + `prototype` + `visualize`；动代码前先出 token 表（4–6 个命名色值、2+ 角色字体、布局线框、一个 signature 元素）和一张待确认的 `visualize` 卡片；完成后把 1440 截图交给 YG 目视验收 |
| 小修 | 文案、间距、错字、断点、bug  | 直接改，只跑下面的验收闸门                                                                                                                                                                                 |

### 技能

| 技能              | 何时用                                                   | 读哪一份                                            |
| ----------------- | -------------------------------------------------------- | --------------------------------------------------- |
| `frontend-design` | 全套档必用：定方向、排版、避开「一眼 AI 生成」的默认观感 | `.agents/skills/frontend-design/SKILL.md`           |
| `prototype`       | 全套档必用：用一次性原型回答一个设计问题（不碰 `src/`）  | `.agents/skills/prototype/SKILL.md`                 |
| `visualize`       | 全套档必用：把候选方向做成可点选的卡片交 YG 定夺         | 插件内置（`@nagi-ovo/dsh-visualize`，无项目级副本） |
| `research`        | 按需：需要外部事实（字体授权、浏览器行为、库 API）       | `.agents/skills/research/SKILL.md`                  |
| `domain-modeling` | 按需：入口页出现新术语，或要写领域文档                   | `.agents/skills/domain-modeling/SKILL.md`           |

同名技能按来源 rank 决胜：项目级 `.agents/skills/`（200）压过插件 bundle（600），**以仓库里这份为准**。新增或替换技能时在 `skills-lock.json` 登记 `source` / `sourceType` / `skillPath`；`computedHash` 的上游算法尚未复现，留空好过写假指纹。

### 工具

- 生成式图像（`generate_image` / `edit_image` / `find_inspiration` / 画布）**只做情绪板与概念图，不进站点素材**；页面素材一律用 `public/assets/*` 里的真实资产。
- 验证必须走真实渲染：`browser_*`（截图 / 无障碍树）或探针脚本。不允许只读 CSS 就断定视觉结果 —— `.poster-eyebrow` 的红杠曾被注释咬坏、整条规则被浏览器丢弃，只有实测才发现。
- 探针：`node scripts/snap-sections.mjs 1440x900` 逐节截图（含页脚）并打印每节背景 / 文字色；`node scripts/snap-poster.mjs <标签> <宽x高>` 截首屏与滚动态。

### 产物位置

- 过程稿（原型、候选方向、截图）落 `viz/`（已 gitignore，不进 git）。
- 定稿：选定方向落 `design-demos/`（已跟踪），token 表落 `docs/homepage-design-style.md`。
- `prototype` 的代码不碰 `src/`：独立 HTML 或独立入口，避免与工作区里未提交的改动互相污染。

### 验收闸门

```bash
node scripts/snap-sections.mjs 1440x900   # 必须 errors: none，再肉眼复核 viz/section-*.png
pnpm lint && pnpm test && pnpm e2e        # 基线 0 error / 13 warning、14 个单测、4 个 e2e
```

- **断点只验 1440x900**：入口页按这一档验收；更小断点靠约束 7 的规则保持不坏，不单独出图。
- 大改完成后把 1440 截图发给 YG 等目视验收；e2e 防回归断言不强制补，需要时再加。

### YG 没回复时

`visualize` 卡片发出后 YG 若说「继续」而不逐问作答：按各问的 Recommended 自行拍板开工，**并在回复里逐项标注哪几条是代拍**（先例：m00922 四问未答 → m00945「继续执行，不要停住」 → 代拍四项后开工）。

## 代码约定

- TypeScript `strict`；新增代码避免 `any`，优先复用 `src/types.ts` 的领域类型。
- 组件文件名与导出名一致（`PascalCase.tsx`）；一个文件只放一个主组件，页面级 CSS 与组件同名同目录。
- 样式优先使用 `src/styles.css` 中已有的 CSS 变量与类名，不要引入新的全局重置样式（会打断现有页面）。
- 数据访问一律走 `src/services/*`，组件内不要直接 `fetch`。
- 文案：见 `docs/copy-style.md`（入口页尤其要避免营销腔与 AI 味套话；改完文案要在 1440 与 390 两档看折行）。
- 入口页组件一律从 `.home-story-scroll` 继承 `--poster-*` 变量，不要在组件里 `:root` 定义新色值；色值只允许纯白 / 墨黑 / 灰阶 + `var(--poster-accent)`。
- 提交前至少跑 `pnpm typecheck && pnpm lint && pnpm test`；动了交付链再加 `pnpm e2e && pnpm build:standalone && pnpm verify:standalone`。

## 已知债务

- `src/App.tsx` 中的 `LandingPage`、`components/admin/AdminPage.tsx` 中的 `openContentEditor` / `renderProjectReviewQueue` 目前已无引用（dead code），清理前请先确认无隐藏入口依赖。
- `src/components/home/` 下 `GeometricAccents.tsx`、`FlowLines.tsx`、`DotMatrixHeroVisual.tsx` 与它们的 CSS 已在首屏改版后删除（连同 `.hero-stats-row`、`campus-photo-*`、`dot-matrix-*`、`geo-*`、`flow-lines-*` 与孤立的 `@keyframes hudPulse`），原件在 `backups/home/*.before_dead_component_removal.20261010-014835.bak`。
- `src/data/mock.ts` 的 `blogPosts` 四篇（标题/摘要/元信息/正文）已按 `docs/copy-style.md` 去过 AI 味；`BlogPost.category` 的联合类型里 `'获奖快讯'` 已改为 `'比赛'`（后端与 docs 里无该字面量，不影响接口数据）。
- `pnpm lint` 基线是 0 error / 13 warning（未用变量与 `exhaustive-deps` 建议），改完顺手清掉自己引入的那几条。
- Vite dev 对 `public/` 下**同名文件被改写后**可能返回陈旧的回落页（`200 text/html`）：改完 `public/assets/*` 要重启 dev server（`pnpm exec vite --port 5173 --strictPort`）再判断资源是否正常。
- `pnpm format` 只覆盖新文件：`src/styles.css` 与 `src/components/**/*.css` 已在 `.prettierignore` 里，整仓格式化会制造数千行无关 diff。
- `src/components/home/about-groups.ts` 的 `preview` 与 `keywords` 字段没有渲染点（改版前的排版用过），属于可删的旧数据。
- `scripts/` 下 8 个改版前的截图脚本（`snap-blog`、`snap-join`、`snap-join-mobile`、`snap-offer-plain`、`snap-picks`、`snap-precise`、`snap-interlude-stages`、`screenshot-hero`）针对旧类名，跑起来多半取不到元素；新探针用 `snap-poster.mjs` / `snap-sections.mjs`。
- `GEMINI.md` 已精简为指向本文件的薄壳（只留「探索用 `read` / `grep` / `glob`，大文件先定位再读」+ 默认中文约定）；原文备份在 `backups/GEMINI.md.before_stale_trim.*.bak`。
- `package.json` 里曾指向不存在 CLI 的 `codegraph:sync` / `codegraph:status` 已删除；仓库根的 `.codegraph/`（`daemon.pid`、`daemon.log`，2026-09 残留）已由 `.gitignore` 忽略，本机没有 codegraph CLI。
- 项目级 `.agents/skills/frontend-design/SKILL.md` 顶部已加「本项目约定」指针（指向本文件的《设计工作流》），因此它与 `skills-lock.json` 里记的 `computedHash` 不再一致；该 hash 的上游算法未复现，暂不重算。
