# Club OS · 计算机科技小组官网与工具台

面向高校技术社团的「官网 + 工具台」一体化系统：对外是宣传与成果展厅，对内是学习路线、项目库、资源库、面经、赛事中心与 AI 助手的协作中枢。

**在线演示：** <https://cs.stcnchu.com/#/home> —— 无需登录，评审期间保持可用。
**离线演示：** `pnpm build:standalone` 产出单个 HTML，双击即可运行整套系统。

## 项目简介

社团的成果常年散在群聊、网盘和几个人的电脑里，每届换届就断一次档；新人进来了不知道从哪开始，老人走了资料也跟着走。Club OS 把这件事拆成三条线：

- **宣传线**：入口页用七个区段把「我们做什么、做过什么、怎么加入」讲清楚，自建纸感设计系统（暖白纸底 + 深青蓝主色管交互 + 琥珀强调色管记号），不使用通用组件库的默认观感。
- **协作线**：工具台把学习路线、项目库、资源库、面经墙、比赛中心、成员档案、AI 助手收在同一处，一条数据改动对所有页面生效。
- **管理线**：组长与管理员进管理后台维护成员、项目、资源、赛事、公告与投稿审核，所有写操作进操作日志，日志可导出 CSV。

同一套代码有三种角色视图：访客看入口页与公开内容，成员登录后用工具台，管理员进后台。

## 技术架构

| 层次 | 选型 | 用在哪 |
| --- | --- | --- |
| 前端框架 | React 19 + TypeScript（strict） | 全部页面与组件 |
| 构建 | Vite 7（两套模式：多 chunk / 单文件） | 开发、生产、离线交付 |
| 动效 | framer-motion + Lenis | 首屏编排、区块进场、平滑滚动 |
| 样式 | 原生 CSS + 设计变量（Tailwind 4 只做骨架） | 入口页纸感视觉、工具台视觉并存 |
| 后端 | FastAPI + SQLAlchemy（异步）+ Pydantic | 25 个路由模块 |
| 数据库 | MySQL 8（utf8mb4） | 成员、项目、资源、赛事、日志等 30 张表 |
| 鉴权 | Bearer Token + Cloudflare Turnstile | 登录、投稿、敏感写操作 |
| 测试 | Vitest（jsdom）、Playwright（系统 Edge）、pytest | 72 个前端单测、e2e、后端用例 |
| 交付 | Node 脚本 | 静态包、单文件包生成与 `file://` 挂载校验 |

## 快速开始

### 前端

```bash
pnpm install
pnpm dev            # http://127.0.0.1:5173，/api 与 /uploads 已代理到 8000
```

没有后端时前端会回落到内置演示数据（`VITE_CONTENT_SOURCE=mock`），界面与交互完整可点。

### 后端

```bash
cd backend/OS_club
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # Linux/macOS 用 .venv/bin/pip
cp .env.example .env                                # 然后填数据库与邮件配置
.venv/Scripts/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

健康检查 `/api/health`。建表用 `backend/OS_club/init_db.py`，接口契约见 `docs/api-contract-v1.md` 与 `docs/openapi.yaml`。

### 数据库

```sql
CREATE DATABASE club_os CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

连接信息全部走环境变量，见下一节。

### 一键启动（Windows 本地）

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev-up.ps1
```

## 环境变量

仓库里不保存任何口令、密钥或服务器地址。

- 后端：复制 `backend/OS_club/.env.example` 为 `backend/OS_club/.env`，填 `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`；邮件服务填 `MAIL_API_URL` / `MAIL_API_KEY` / `MAIL_FROM_NAME` / `MAIL_FROM_EMAIL`；人机校验填 `TURNSTILE_SECRET_KEY`。
- 前端：复制 `.env.example` 为 `.env.local`。`VITE_CONTENT_SOURCE=api` 走后端接口，`mock` 用内置演示数据；单文件离线版固定走 mock。

`.env` 与 `.env.local` 均已被 `.gitignore` 排除，只提交 `.env.example` 模板。

## 目录结构

| 位置 | 内容 |
| --- | --- |
| `src/App.tsx` | 路由分派、顶部导航、业务页面与弹窗 |
| `src/components/home/` | 入口页七段与其 CSS（首屏、关于、提供、作品、精选、博客、加入） |
| `src/components/admin/` | 管理后台（成员、项目、资源、赛事、公告、日志、结构配置） |
| `src/services/` | 数据边界层：HTTP 服务与 React Context，组件里不直接 fetch |
| `src/data/mock.ts` | 离线演示数据 |
| `src/styles.css` | 全局 token 与工具台、业务页样式 |
| `backend/OS_club/` | FastAPI 应用：routers / crud / models / schemas / tests / migrations |
| `docs/` | 接口契约、OpenAPI、设计规范、文案规范、后端架构 |
| `scripts/` | 构建与交付脚本（静态包、单文件包、挂载校验） |
| `e2e/` | Playwright 用例 |

## 交付形态

| 命令 | 产物 |
| --- | --- |
| `pnpm build` | 常规多 chunk 产物，部署到静态站 |
| `pnpm build:static` | 可在 `file://` 下直接打开的静态包 |
| `pnpm build:standalone` | 单文件 `nchu-cs-club-standalone.html`，脚本样式字体图片全内联 |
| `pnpm verify:standalone` | 用系统 Edge 以 `file://` 打开单文件版，校验应用真的挂载出来 |

单文件版要求入口脚本不含顶层 import/export，因此运行时动态分包（`React.lazy` / `import()`）在交付链上被禁止，代码拆分只走静态 import 的新模块。

## 质量门禁

```bash
pnpm typecheck   # tsc -b
pnpm lint        # eslint
pnpm test        # vitest run
pnpm e2e         # playwright test（系统 Edge）
```

当前状态：72 个前端单元测试通过，e2e 覆盖首屏渲染、标题不单字折行、单文件版 `file://` 挂载；后端 13 组 pytest 覆盖成员、邀请码、验证码登录、投稿权限、比赛提醒等模块。

## 团队信息

| 角色 | 姓名 | 主要分工 |
| --- | --- | --- |
| 队长 / 后端 | 待填 | FastAPI 接口与路由拆分、数据库建模、邀请码与审计日志、部署 |
| 前端 | 待填 | 入口页视觉与动效、工具台页面、组件拆分与类型定义 |
| 设计 / 测试 | 待填 | 设计规范与文案规范、Playwright 与 Vitest 用例、文档与截图 |

指导教师：待填　　所在院校：待填　　项目周期：2026.08 – 2026.11

## 已知限制

- 站内 AI 助手的前端交互、引用展示与服务层封装已完成，后端 `/ai/ask` 尚未实现，当前问答为内置演示话术；接口契约与类型定义已就位。
- 图片上传与留言附件依赖后端 `uploads/` 目录，静态演示版中相关入口只展示界面。

## 许可

代码用于教学与社团内部协作，站点素材仅在本项目内使用。
