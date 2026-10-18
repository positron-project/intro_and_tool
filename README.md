# Club OS · 南昌航空大学科技学院计算机科技小组

一个以“学习 → 实践 → 传承”为主线的计算机科技小组数字社区前端原型。

## 本地运行

```bash
npm install
npm run dev
```

## 本地环境（本机已配置）

| 组成 | 位置 / 版本 | 说明 |
| --- | --- | --- |
| 前端工具链 | Node 26.11.0 + pnpm 12.10.1 | 依赖已装好（`pnpm install`） |
| 前端服务 | http://127.0.0.1:5173 | `pnpm run dev`；`/api` 与 `/uploads` 已代理到后端 8000，不涉及 CORS |
| 后端 | `backend/OS_club`，Python 3.14.8 虚拟环境 `.venv` | 依赖见 `backend/OS_club/requirements.txt` |
| 后端服务 | http://127.0.0.1:8000 | `.venv/Scripts/python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000`，健康检查 `/api/health` |
| 数据库 | `D:\_tools\mysql-8.4.9-winx64`（MySQL 8.4.9 便携版，非服务） | `root / 123456`，库 `club_os`（utf8mb4），表结构已由 `init_db.py` 建好 |

一键启动 MySQL + 后端（前端另开终端跑 `pnpm run dev`）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev-up.ps1
```

停止 MySQL：

```bash
D:/_tools/mysql-8.4.9-winx64/bin/mysqladmin.exe -u root -p123456 shutdown
```

`.env` 由 `.env.example` 生成，默认 `VITE_CONTENT_SOURCE=api`；只想用浏览器本地演示数据时改成 `mock`。

生产构建：

```bash
npm run build
```

生成可双击打开的静态包：

```bash
npm run build:static
```

然后解压交付包，直接双击 `index.html` 即可打开，无需启动服务端。

如果浏览器限制了本地文件夹资源，可使用单文件版：

```bash
npm run build:standalone
```

生成根目录的 `nchu-cs-club-standalone.html`，无需解压资源，直接双击即可打开。

## 目录约定

- `src/App.tsx`：页面级视图和交互编排，按功能拆分为可复用组件。
- `src/data/mock.ts`：所有演示数据集中管理，便于替换为 API 响应。
- `src/types.ts`：核心领域模型和权限角色类型。
- `src/services/`：Mock service 边界，后续可替换为 FastAPI 请求。
- `src/styles.css`：设计令牌、响应式布局、深色模式和动效。

## 后端接口预留

页面通过 `src/services/content.service.ts` 和 `src/services/api-client.ts` 读取内容。`VITE_CONTENT_SOURCE=api` 时只显示后端真实数据，接口不可用会显示错误或空状态，不会静默回退到演示目录；只有明确设置 `VITE_CONTENT_SOURCE=mock` 时才启用浏览器本地演示数据。学习路线、项目库、资源库、面经墙和比赛中心均已预留列表、新增、编辑、删除接口，登录、权限和文件上传也有独立服务边界。

环境变量示例见 [.env.example](./.env.example)，三端职责见 [docs/backend-architecture.md](./docs/backend-architecture.md)，开发任务见 [docs/backend-tasks.md](./docs/backend-tasks.md)，Node.js/Java/Python 具体开发文档见 [docs/backend-nodejs.md](./docs/backend-nodejs.md)、[docs/backend-java.md](./docs/backend-java.md)、[docs/backend-python.md](./docs/backend-python.md)，接口路径、字段和角色规则见 [docs/api-contract-v1.md](./docs/api-contract-v1.md)，也可直接导入 [docs/openapi.yaml](./docs/openapi.yaml) 到 Swagger/Insomnia。

当前原型包含白底 DeepSeek 风格入口页、南昌航空大学科技学院官网风格门户、Club OS 工具页、学习路线、项目库/详情、比赛中心、资源库、Prompt 模板库、面经墙、小组风采、就业指导和 AI 助手页面，并支持 `Light / Dark / System` 三种主题、⌘K Command Palette、移动端菜单、AI Drawer 与首次访问路线生成。

## 届次配置

- 当前届次列表为 2026—2029，配置位于 `src/App.tsx` 的 `cohortCatalog`，页面会自动生成左侧届次列表和历届合影卡片。
- 新增 2030 届时，在数组中追加 `{ year: '2030', memberLabel: '人数待补充' }`；如果已经确定分组，再在 `cohortTeamsByYear` 中增加 `'2030': [...]`，页面会自动显示对应的分组和成员。
- 管理员登录和上传入口暂时不放在展示页，等登录页面完成后再接入组长与届次负责人的权限控制。
