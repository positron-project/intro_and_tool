# Club OS API v1 接口文档

> 本文与 [backend-handoff.md](./backend-handoff.md) 共同组成 v1 契约；管理后台新增接口以 `backend-handoff.md` 的资源定义为准。发生冲突时，以本文下面的统一响应、错误和路径约定为准，并同步更新 `openapi.yaml`。

本文是前端与三端后端之间的主契约。浏览器只请求 Node.js Gateway 的 `/api`，Node 再把请求转给 Java Core、Python AI 或文件存储。

## 基本约定

- 网关开发地址：`http://127.0.0.1:3000`；前端配置 `VITE_API_BASE_URL=http://127.0.0.1:3000/api`。
- 登录成功后前端保存返回的 `accessToken`；后续受保护请求统一发送 `Authorization: Bearer <accessToken>`。未登录的登录、注册和发送验证码请求不携带旧 Token。
- 所有路径均为 `/api` 后的相对路径；服务内部路径不带 `/api`。
- 请求和响应使用 UTF-8 JSON；上传使用 `multipart/form-data`。
- Java 业务响应统一使用 `Result<T>`：`{ "code": 200, "msg": null, "data": ... }`。`code=200` 表示业务成功，前端读取 `data`；其他 `code` 表示业务失败，前端读取 `msg` 提示用户。HTTP 网络层仍建议使用 200/4xx/5xx 表达传输状态，但业务失败不要依赖 HTTP 错误体。
- 列表的 `data` 为数组；分页信息可放在 `data` 的列表结构或扩展响应字段中，前端服务层会兼容直接数组和旧的 `{ items, page }` 响应。
- 成功创建返回 `201`；删除/退出登录返回 `204`；未登录/令牌失效返回 `401`；无权限返回 `403`。
- 每个响应带 `X-Request-Id`，排查问题时把它提供给管理员。

业务失败格式：

```json
{ "code": 403, "msg": "当前账号没有管理这部分内容的权限", "data": null }
```

列表查询参数：`search`、`category`、`status`、`cohortId`、`teamId`、`page`、`pageSize`、`sort`、`direction=asc|desc`。后端应限制 `pageSize <= 100`；为兼容旧前端可暂时接受 `cohort` 别名。

## 服务路由分工

| 前端路径 | 方法 | 归属 |
| --- | --- | --- |
| `/api/auth/*` | GET/POST/PATCH | Java Core |
| `/api/learning-routes*` | GET/POST/PATCH/DELETE | Java Core |
| `/api/projects*` | GET/POST/PATCH/DELETE | Java Core |
| `/api/resources*` | GET/POST/PATCH/DELETE | Java Core |
| `/api/interviews*` | GET/POST/PATCH/DELETE | Java Core |
| `/api/competitions*` | GET/POST/PATCH/DELETE | Java Core |
| `/api/announcements`、`/api/prompts`、`/api/members` | GET/POST/PATCH/DELETE | Java Core |
| `/api/uploads*` | GET/POST/DELETE | Node Gateway |
| `/api/ai/ask` | POST | Python AI |
| `/health` | GET | Node 聚合 Java/Python 状态 |

## 登录与角色

### `POST /api/auth/register/send-code`

请求体 `{ "email": "member@example.com", "turnstileToken": "..." }`。邮箱格式、Turnstile 和发送频率由 Java Core 校验，成功返回验证码有效期。

### `POST /api/auth/register`

请求体 `{ "verificationCode": "123456", "username": "member01", "email": "member@example.com", "password": "********", "turnstileToken": "..." }`。只有 HTTP `200` 表示创建成功；其他状态码均表示失败。`email` 是唯一账号身份，`username` 是用户自行设置的账号名/显示名。

### `POST /api/auth/login`

```json
{ "email": "member@example.com", "password": "********", "turnstileToken": "...", "rememberMe": true }
```

### `POST /api/auth/login/send-code`

请求体 `{ "email": "member@example.com", "turnstileToken": "..." }`，发送登录验证码。

### `POST /api/auth/login/code`

请求体 `{ "email": "member@example.com", "verificationCode": "123456", "turnstileToken": "...", "rememberMe": true }`，返回 HTTP `200` 表示验证码登录成功。

```json
{
  "data": {
  "accessToken": "core.xxxxx",
  "refreshToken": "optional-refresh-token",
  "expiresAt": "2026-10-05T04:49:50Z",
  "user": {
    "id": "user-1",
    "name": "科技小组组长",
    "email": "leader@example.com",
    "initials": "组长",
    "cohort": "全站",
    "role": "Leader",
    "directions": ["全站内容", "成员与权限"]
  },
  "meta": { "requestId": "req_123" }
}
```

### `GET /api/auth/me`

请求头 `Authorization: Bearer <accessToken>`，返回 `user` 对象。

### `PATCH /api/auth/me`

更新当前账号的公开资料（`name`、`initials`、`bio`、`avatarAssetId`），返回更新后的 `user` 对象。

### `POST /api/auth/refresh`

请求体 `{ "refreshToken": "..." }`，返回新的 `accessToken`、可轮换的 `refreshToken` 和 `expiresAt`。

### `PATCH /api/auth/me/password`

请求体 `{ "currentPassword": "...", "newPassword": "..." }`。新密码由 Java Core 使用 Argon2id/bcrypt 哈希保存，成功返回 `204`。

### `POST /api/auth/logout`

请求头同上，吊销当前令牌并返回 `204`；重复退出也应安全返回 `204`。

角色规则：

- `Visitor`：只能查看公开内容；
- `Member`：登录后查看成员内容，可提交待审核内容（后续）；
- `Contributor`：只能编辑登录用户 `cohort` 对应的本届内容；
- `Leader` / `Admin`：组长/超级管理员，可管理全部届次。

前端的权限判断只改善界面，不能替代 Java Core 的后端校验。

## 内容接口

| 模块 | 列表 | 详情 | 新增 | 编辑 | 删除 |
| --- | --- | --- | --- | --- | --- |
| 学习路线 | `GET /learning-routes` | `GET /learning-routes/:id` | `POST /learning-routes` | `PATCH /learning-routes/:id` | `DELETE /learning-routes/:id` |
| 项目库 | `GET /projects` | `GET /projects/:slug`（详情按 slug） | `POST /projects` | `PATCH /projects/:id` | `DELETE /projects/:id` |
| 资源库 | `GET /resources` | `GET /resources/:id`（可选） | `POST /resources` | `PATCH /resources/:id` | `DELETE /resources/:id` |
| 面经墙 | `GET /interviews` | `GET /interviews/:id`（可选） | `POST /interviews` | `PATCH /interviews/:id` | `DELETE /interviews/:id` |
| 比赛中心 | `GET /competitions` | `GET /competitions/:id`（可选） | `POST /competitions` | `PATCH /competitions/:id` | `DELETE /competitions/:id` |
| 公告 / Prompt / 成员 | `GET /announcements` 等 | `GET /{resource}/:id` | `POST /{resource}` | `PATCH /{resource}/:id` | `DELETE /{resource}/:id` |

项目投稿人使用登录后的 `GET /projects/my-submissions` 查看自己所有审核状态的项目。被退回的项目通过 `POST /projects/{projectId}/resubmit` 提交修改；只有原投稿人可以操作，提交后状态恢复为待审核并通知审核人。

比赛中心的赛道作为比赛对象中的 `tracks` 数组，随创建或修改比赛一起提交，不需要单独的赛道接口。往届成果使用 `GET/POST /competitions/{competitionId}/cohort-projects` 和 `PATCH/DELETE /competitions/{competitionId}/cohort-projects/{projectId}`；个人提醒使用登录后的 `GET/POST /competitions/{competitionId}/reminder`。

赛道字段为 `id`、`name`、`description`、`audience`、`format`、`teamSize`、`requirements`、`registrationStart`、`registrationEnd`、`registrationUrl`、`rulesUrl` 和 `awards`。修改比赛时不传 `tracks` 表示保持原值，传空数组表示清空赛道。

### 内容分类

项目库、资源库和面经墙分别维护自己的筛选分类。浏览器端把“全部”作为固定的本地筛选项，不请求后端。分类接口使用 `resource=projects|resources|interviews` 区分内容库，返回结果按 `order` 升序排列。

```text
GET    /api/categories?resource=projects|resources|interviews
POST   /api/categories
PATCH  /api/categories/{categoryId}
DELETE /api/categories/{categoryId}
```

分类对象：

```json
{
  "id": "cat-data",
  "resource": "projects",
  "key": "data-engineering",
  "label": "数据工程",
  "description": "数据管道、存储与分析系统",
  "accent": "mint",
  "icon": "terminal",
  "order": 6,
  "enabled": true,
  "builtIn": false
}
```

新增请求体不传 `id`；编辑可只传变更字段。`key` 是对应内容记录的关联值，修改时 Java Core 应在事务内同步迁移使用该分类的项目、资源或面经。内置分类只能停用不能删除；仍被内容使用的自定义分类应返回业务冲突，要求先迁移内容。

分类写接口按项目统一响应约定返回 HTTP `200` 且 `code=200`；失败也返回 HTTP `200`，通过 `code` 和 `msg` 表达业务结果。

新增请求体去掉 `id` 和审计字段；编辑只传变更字段。Java Core 补充 `createdAt`、`updatedAt`、`createdBy`、`updatedBy`、`archivedAt`。删除采用软删除，默认列表不返回已归档记录。

## 文件上传

### `POST /api/uploads`

Node 接收 `multipart/form-data`：`file`（必填，普通图片单文件不超过 10 MB，头像不超过 5 MB）、`folder`（可选）、`alt`（可选）。请求头需要 `Authorization: Bearer <accessToken>`。

响应 `201`（成功响应包裹在 `data` 中）：

```json
{
  "data": {
  "id": "asset-uuid",
  "url": "/api/uploads/files/asset-uuid/photo.jpg",
  "name": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 183920,
  "alt": "2029 届算法组成员合影"
  },
  "meta": { "requestId": "req_123" }
}
```

`GET /api/uploads/files/:id/:name` 返回文件流；`DELETE /api/uploads/:id` 删除文件。生产环境把 Node 本地目录换成 MinIO/S3，返回字段保持不变。

当前 FastAPI 实现会在上传成功前写入 `upload_assets`，上传者从登录用户取得，客户端不能指定归属。删除要求上传者本人或全局 `Leader` / `Admin`；`CohortLeader` 不具有跨用户删除权限。无归属记录的历史文件仅允许全局管理员清理。无权删除返回 403，仍被业务内容引用返回 409，文件不存在返回 404，成功返回 204。

仓库的 main 自动部署流程会在重启后端前执行 `backend/OS_club/migrations/20261023_create_upload_assets.sql`。手工部署时，应先执行该脚本，或在已配置数据库的后端目录运行 `python init_db.py` 创建缺失表，再更新后端服务。迁移不回填或猜测历史文件上传者，也不删除现有文件。

## AI

### `POST /api/ai/ask`

```json
{ "prompt": "我现在能参加哪些项目？" }
```

```json
{
  "data": {
  "id": "assistant-message-id",
  "role": "assistant",
  "content": "可以先从校园 AI 智能助手的前端协作任务开始……",
  "citations": [
    { "id": "project-ai-campus", "title": "校园 AI 智能助手", "type": "项目", "path": "/projects/ai-campus" }
  ]
  },
  "meta": { "requestId": "req_123" }
}
```

Python 不保存 access token，也不决定内容编辑权限。模型密钥只放在 Python 服务环境变量。后续 SSE 使用新路径 `/api/ai/ask/stream`，不破坏普通请求。

## 规划服务地址

这些是三端计划使用的内部监听地址；当前仓库内的 FastAPI 只实现认证、账号状态、邀请码和健康检查子集，其余路由仍按本契约待实现。真实缺口以 [`implementation-gap-analysis.md`](./implementation-gap-analysis.md) 为准。

| 服务 | 计划地址 | 归属 |
| --- | --- | --- |
| Node.js Gateway | :3000 | 浏览器唯一入口 |
| Java Core | :8081 | 业务数据、账号和权限 |
| Python AI | :8001 | AI 编排、检索和模型调用 |

生产必须启用 HTTPS、密码哈希、短期 access token + refresh token、CORS 白名单、限流、日志脱敏、数据库迁移和备份。服务实现时应保持本文件与 openapi.yaml 的路径、字段和错误格式一致。
