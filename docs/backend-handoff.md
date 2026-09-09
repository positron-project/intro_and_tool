# Club OS 后端交接接口文档

版本：`1.1`
用途：Node.js Gateway、Java Core、Python AI 开发与联调基线。

现有 `api-contract-v1.md` 和 `openapi.yaml` 保留基础内容接口；本文补齐管理后台实际需要的组织结构、成员、照片、主题、审计和比赛届次项目接口。浏览器只访问 Node.js Gateway，Java Core 是业务数据与权限的唯一写入方。

## 1. 环境与统一约定

前端生产配置：

```env
VITE_CONTENT_SOURCE=api
VITE_API_BASE_URL=http://127.0.0.1:3000/api
VITE_API_TIMEOUT_MS=10000
```

若网关部署在同域名下，使用 `VITE_API_BASE_URL=/api`。不要把 Java 或 Python 的端口直接暴露给浏览器。

请求头：

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
X-Request-Id: <uuid>
```

前端在登录接口返回 HTTP `200` 且响应包含非空 `accessToken` 后才保存 Token。勾选“记住登录状态”时保存到持久存储，否则保存到会话存储；后续受保护请求由统一 HTTP 客户端自动添加 `Authorization: Bearer <accessToken>`。登录、注册和发送验证码接口显式不转发浏览器里可能残留的旧 Token。

Java Core 成功响应统一使用：

```json
{
  "code": 200,
  "msg": null,
  "data": {}
}
```

业务失败也返回 HTTP `200` 的 `Result`，例如 `{ "code": 403, "msg": "当前账号没有管理这部分内容的权限", "data": null }`。前端统一客户端只把 `code=200` 解包为成功结果；其他 code 转成可捕获的业务错误并显示 `msg`，不会把后端响应对象直接渲染为页面异常。网络断开、网关不可用等传输层问题仍使用 HTTP 错误或网络异常处理。

列表响应：

```json
{
  "code": 200,
  "msg": null,
  "data": {
    "items": [],
    "page": {
      "page": 1,
      "pageSize": 20,
      "total": 42,
      "totalPages": 3
    }
  }
}
```

列表统一支持 `search`、`category`、`status`、`cohortId`、`teamId`、`page`、`pageSize`、`sort`、`direction=asc|desc`，后端限制 `pageSize <= 100`。

业务失败响应：

```json
{
  "code": 409,
  "msg": "记录已被其他管理员修改",
  "data": null
}
```

传输层状态码：网络/网关级错误使用 `400` 参数错误、`401` 未登录、`403` 无权限、`404` 不存在、`409` 冲突、`413` 文件过大、`415` 文件类型不支持、`429` 限流、`500` 服务错误、`502/503` 上游不可用；Java 业务校验失败按约定返回 HTTP `200`，在 `Result.code` 中表达业务状态。

## 2. 身份与权限

| 角色 | 说明 | 数据范围 |
| --- | --- | --- |
| `Leader` | 组长，超级管理员 | 全部届次、全部内容、全局设置 |
| `Admin` | 预留超级管理员 | 全部届次、全部内容 |
| `Contributor` | 本届负责人 | 自己届次的成员与内容 |
| `Member` | 普通成员 | 公开内容、登录后成员内容，可提交待审核内容 |
| `Visitor` | 未登录访客 | 公开内容 |

前端权限只用于显示界面，Java 必须在每一个写接口重新校验角色和届次，不能信任请求体中的 `cohortId`。

### 认证接口

```text
POST  /api/auth/login
POST  /api/auth/login/send-code
POST  /api/auth/login/code
POST  /api/auth/register/send-code
POST  /api/auth/register
POST  /api/auth/refresh
POST  /api/auth/logout
GET   /api/auth/me
PATCH /api/auth/me/password
POST  /api/members/{memberId}/reset-password
```

登录响应：

```json
{
  "accessToken": "access-token",
  "refreshToken": "refresh-token",
  "expiresAt": "2026-10-05T04:49:50Z",
  "user": {
    "id": "user_001",
    "name": "组长",
    "initials": "组长",
    "cohort": "全站",
    "role": "Leader",
    "directions": ["全站内容", "成员与权限"]
  }
}
```

密码只能保存 Argon2id/bcrypt 哈希；日志中不得记录密码、Token 或模型密钥。

登录约定：密码登录 `POST /api/auth/login` 只接收 `{ "email": "member@example.com", "password": "...", "turnstileToken": "...", "rememberMe": true }`；验证码登录先调用 `POST /api/auth/login/send-code` 发送验证码，再调用 `POST /api/auth/login/code`，请求体为 `{ "email": "member@example.com", "verificationCode": "123456", "turnstileToken": "...", "rememberMe": true }`。登录成功统一返回 HTTP `200`。

注册约定：前端先调用 `POST /api/auth/register/send-code`，请求体为 `{ "email": "member@example.com", "turnstileToken": "..." }`；服务端验证 Turnstile 后发送 6 位邮箱验证码，验证码有效期建议 10 分钟且同一邮箱 60 秒内只能发送一次。随后调用 `POST /api/auth/register`，请求体为 `{ "verificationCode": "123456", "username": "member01", "email": "member@example.com", "password": "至少 8 位", "turnstileToken": "..." }`。只有返回 HTTP `200` 才视为创建成功，其他状态码均由前端按失败处理。`email` 是账号的唯一身份标识，数据库必须建立唯一索引；`username` 是用户自行设置的显示/登录名称，不承担唯一身份职责。注册和登录都必须在 Java Core 再次校验 Turnstile token，Node 只透传，不接受前端自报的验证结果。密码登录只接收邮箱和密码；验证码登录先通过 `POST /api/auth/login/send-code` 获取验证码，再调用 `POST /api/auth/login/code`。登录额外接收 `rememberMe: boolean`，用于决定 refresh token 的持久化策略。

## 3. 届次与小组

### 届次

```text
GET    /api/cohorts
POST   /api/cohorts
GET    /api/cohorts/{cohortId}
PATCH  /api/cohorts/{cohortId}
DELETE /api/cohorts/{cohortId}
```

新增届次时事务内自动创建三个核心小组：`algorithm`、`project`、`cybersecurity`。

```json
{
  "year": "2030",
  "generationLabel": "第五代 · 共学进行中",
  "description": "2030 届成员资料",
  "status": "active"
}
```

### 小组

```text
GET    /api/cohorts/{cohortId}/teams
POST   /api/cohorts/{cohortId}/teams
PATCH  /api/cohorts/{cohortId}/teams/{teamId}
DELETE /api/cohorts/{cohortId}/teams/{teamId}
```

```json
{
  "key": "algorithm",
  "name": "算法组",
  "description": "算法、模型与实验方向",
  "memberCapacity": 20,
  "accent": "violet"
}
```

核心小组不允许被删除；自定义小组可以删除，但已有成员时返回 `409 TEAM_NOT_EMPTY`，除非请求显式迁移成员。

## 4. 成员账号与小组风采

```text
GET    /api/members?cohortId=&teamId=&search=&page=&pageSize=
POST   /api/members
GET    /api/members/{memberId}
PATCH  /api/members/{memberId}
DELETE /api/members/{memberId}
PATCH  /api/members/{memberId}/status
POST   /api/members/import
```

成员字段：

```json
{
  "id": "member_001",
  "username": "zhangsan",
  "name": "张三",
  "role": "组员",
  "cohortId": "cohort_2029",
  "teamId": "team_algorithm_2029",
  "direction": "算法组",
  "initials": "ZS",
  "accent": "blue",
  "avatarAssetId": "asset_001",
  "status": "ACTIVE"
}
```

公开小组风采必须读取同一套成员接口，不能再维护另一份前台成员数组。成员删除后，届次人数和工具页“小组方向”人数必须立即重新聚合。

### 历届合影

```text
GET    /api/cohorts/{cohortId}/photos
POST   /api/cohorts/{cohortId}/photos
PATCH  /api/photos/{photoId}
PATCH  /api/photos/{photoId}/cover
DELETE /api/photos/{photoId}
```

同一个届次最多一个封面；设置新封面时由事务自动取消旧封面。

## 5. 学习路线

```text
GET    /api/learning-routes?teamId=&status=&search=
POST   /api/learning-routes
GET    /api/learning-routes/{routeId}
PATCH  /api/learning-routes/{routeId}
DELETE /api/learning-routes/{routeId}
POST   /api/learning-routes/{routeId}/nodes
PATCH  /api/learning-routes/{routeId}/nodes/{nodeId}
DELETE /api/learning-routes/{routeId}/nodes/{nodeId}
PUT    /api/learning-routes/{routeId}/project-entries
```

编辑请求必须携带 `version` 或 `If-Match`，避免管理员切换方向后覆盖其他方向的修改。

```json
{
  "version": 3,
  "title": "算法组学习路线",
  "direction": "算法组",
  "description": "从基础算法到真实项目",
  "nodes": [
    {
      "id": "node_001",
      "title": "基础数据结构",
      "duration": "2 周",
      "order": 1,
      "projectIds": ["project_001"]
    }
  ],
  "featuredProjectIds": ["project_001", "project_002"]
}
```

## 6. 内容模块

以下模块统一提供列表、详情、新增、编辑、软删除：

```text
/api/projects
/api/resources
/api/interviews
/api/competitions
/api/announcements
/api/prompts
```

每个模块的通用接口：

```text
GET    /api/{resource}
POST   /api/{resource}
GET    /api/{resource}/{id}
PATCH  /api/{resource}/{id}
DELETE /api/{resource}/{id}
```

新增和编辑时由服务端补充 `createdAt`、`updatedAt`、`createdBy`、`updatedBy`、`publishedAt`、`archivedAt`。

项目额外字段：`slug`、`githubUrl`、`docsUrl`、`demoUrl`、`issueUrl`、`coverAssetId`、`milestones`、`logs`、`memberIds`、`joinEnabled`。

资源额外字段：`category`、`type`、`tags`、`author`、`views`、`assetId`。

面经额外字段：`company`、`role`、`author`、`cohortId`、`date`、`difficulty`、`rounds`、`tags`、`summary`。

公告额外字段：`category`、`title`、`detail`、`scope`、`published`、`publishAt`、`isTop`。

普通成员提交 Prompt、面经或资源时默认 `PENDING_REVIEW`；管理员审核后变为 `PUBLISHED` 或 `REJECTED`。

## 7. 比赛中心与届次项目

比赛基础接口：

```text
GET    /api/competitions
POST   /api/competitions
GET    /api/competitions/{competitionId}
PATCH  /api/competitions/{competitionId}
DELETE /api/competitions/{competitionId}
POST   /api/competitions/{competitionId}/reminder
```

比赛关联历届项目：

```text
GET    /api/competitions/{competitionId}/cohort-projects
POST   /api/competitions/{competitionId}/cohort-projects
PATCH  /api/competitions/{competitionId}/cohort-projects/{itemId}
DELETE /api/competitions/{competitionId}/cohort-projects/{itemId}
```

关联项目字段：`cohortId`、`title`、`description`、`imageAssetId`、`projectUrl`、`sortOrder`。

## 8. 站点设置与个人偏好

全局设置：

```text
GET   /api/settings/site
PATCH /api/settings/site
```

个人设置：

```text
GET   /api/users/me/preferences
PATCH /api/users/me/preferences
```

```json
{
  "theme": "dark",
  "schoolBackgroundEnabled": true,
  "customBackgroundAssetId": null,
  "reducedMotion": false
}
```

背景规则由后端保存并返回：自定义背景启用时关闭校园背景；校园背景开启时使用学校背景；两者都关闭时使用默认纯色背景。夜间星空属于 `theme=dark` 的系统效果，不需要单独的主题开关。

## 9. 上传与审计

```text
POST   /api/uploads
GET    /api/uploads/{assetId}
DELETE /api/uploads/{assetId}
GET    /api/uploads/files/{assetId}/{fileName}
```

图片建议限制 `jpg/jpeg/png/webp`，单文件不超过 `10MB`，头像不超过 `5MB`。Node 负责上传适配，生产存储使用 MinIO/S3。

审计日志：

```text
GET /api/admin/audit-logs?page=&pageSize=&actorId=&action=&resourceType=&from=&to=
GET /api/admin/audit-logs/{logId}
```

每个后台写操作至少记录：操作者、动作、资源类型、资源 ID、变更前后摘要、IP、请求 ID、时间。

## 10. AI 接口

```text
POST /api/ai/ask
POST /api/ai/ask/stream
GET  /api/ai/conversations
POST /api/ai/conversations
GET  /api/ai/conversations/{conversationId}/messages
DELETE /api/ai/conversations/{conversationId}
```

普通问答请求：

```json
{
  "conversationId": "conversation_001",
  "message": "帮我制定算法学习计划",
  "context": { "teamId": "team_algorithm_2029", "routeId": "route_001" }
}
```

流式接口使用 `text/event-stream`。Python 只负责问答、检索和模型调用，不负责账号权限和内容写入。

## 11. 三端分工与验收顺序

| 服务 | 负责内容 |
| --- | --- |
| Node.js Gateway | `/api` 入口、CORS、请求 ID、限流、超时、上传、SSE 转发、健康检查 |
| Java Core | 用户、角色、届次、小组、成员、内容 CRUD、设置、审计、数据库事务 |
| Python AI | `/ai`、RAG、Embedding、模型适配、流式输出、Token 与成本统计 |

实施顺序：

1. PostgreSQL 表结构、迁移、用户和 RBAC。
2. 届次、小组、成员和照片接口，先验证公开页同步。
3. 学习路线、项目、资源、面经、比赛、公告 CRUD。
4. 站点设置、个人偏好、上传和审计日志。
5. Node 网关接入统一域名，前端切换 `VITE_CONTENT_SOURCE=api`。
6. Python AI 普通问答，再接 SSE、RAG 和会话历史。

联调完成标准：新增 2030 届自动拥有三支核心小组；后台新增成员后公开页和工具页人数同步；后台发布公告后公开页可见；删除、权限、分页、上传和并发版本冲突均有自动化测试。
