# Club OS 三端后端规划

本文只定义后端的职责分工、边界和落地顺序，不在前端仓库内实现 Node.js、Java、Python 服务。三端最终可以独立部署，但浏览器永远只访问 Node.js Gateway 的 /api。

## 1. 总体边界

| 服务 | 负责什么 | 明确不负责什么 | 主要产出 |
| --- | --- | --- | --- |
| Node.js Gateway | 统一 API 入口、CORS 白名单、请求 ID、限流、超时、上传转发、健康检查 | 不保存账号权限真相，不直接修改业务表，不持有模型密钥 | 对外 API、统一错误格式、上传适配器 |
| Java Core | 登录/会话、角色与届次权限、学习路线、项目、资源、面经、比赛、公告、Prompt、成员、审计 | 不调用大模型，不处理模型密钥，不让前端直连数据库 | 业务 REST API、权限策略、数据库迁移 |
| Python AI | Prompt 编排、知识库切片、Embedding/RAG、模型调用、引用来源、流式回答 | 不创建账号，不决定用户能否编辑内容，不绕过 Java 权限 | AI API、检索链路、模型适配和成本统计 |

本仓库当前只保留前端和契约文档；三端属于下一阶段按本文实施的独立项目。

详细执行步骤见：
- [Node.js Gateway 开发文档](./backend-nodejs.md)
- [Java Core 开发文档](./backend-java.md)
- [Python AI 开发文档](./backend-python.md)

## 2. 请求流向

React / Vite
    │ HTTPS /api
    ▼
Node.js Gateway
    ├── /api/auth/*、/api/projects/*、/api/resources/* ... → Java Core
    ├── /api/ai/*                                      → Python AI
    └── /api/uploads*                                 → MinIO/S3（开发期可用本地适配器）

前端只配置 VITE_API_BASE_URL，不感知 Java/Python 的端口、数据库或模型供应商。

## 3. 数据归属和一致性

- Java Core 是账号、成员和所有内容记录的唯一业务写入方；推荐 PostgreSQL，使用迁移脚本管理表结构。
- Node.js 只负责对象存储适配和文件元数据转发。图片、附件、历届合影保存到 MinIO/S3，业务表只保存 assetId、URL、大小、哈希和创建人。
- Python AI 默认不持久化聊天内容；需要历史时单独设计 conversation/message 表或事件流，不把模型回答写回内容表。
- Java 统一补充 createdAt、updatedAt、createdBy、updatedBy、publishedAt、archivedAt；删除默认软删除。
- 所有服务透传 X-Request-Id；日志中禁止记录密码、access token、模型密钥和完整用户输入。

## 4. 权限模型

| 角色 | 查看公开内容 | 查看成员内容 | 管理全部届次 | 管理本届内容 |
| --- | ---: | ---: | ---: | ---: |
| Visitor | ✓ | — | — | — |
| Member | ✓ | 登录后 | — | 后续可提交待审核 |
| Contributor | ✓ | ✓ | — | ✓ |
| Leader / Admin | ✓ | ✓ | ✓ | ✓ |

- Leader 是组长级管理员；Admin 为预留的超级管理员角色，可用于后续多管理员场景。
- Contributor 的届次由 Java 根据登录用户的 cohort 判定，不能信任浏览器提交的 cohort。
- 前端 canManageContent 只用于隐藏按钮，Java Core 必须在每次写请求再次校验。
- Node 上传接口先检查 Bearer token，再由 Java introspection 或网关鉴权策略确认角色；文件 URL 默认可读，删除必须鉴权。

## 5. 三端具体实施任务

### Node.js Gateway

1. 提供 /api 统一入口，将内容和认证转发至 Java，将 /api/ai 转发至 Python。
2. 统一 CORS、请求 ID、超时、上游错误、JSON 解析和 25 MB 请求体上限。
3. 实现 POST /api/uploads、GET /api/uploads/files/:id/:name、DELETE /api/uploads/:id；先接本地适配器，生产替换 MinIO/S3。
4. 第二阶段接 Redis 限流、访问日志脱敏、HTTPS 反向代理和上传病毒/类型校验。

### Java Core

1. 设计 users、sessions/refresh_tokens、content_records、assets、audit_logs 表和迁移。
2. 实现登录、当前用户、注销、刷新令牌、角色/届次权限和管理后台接口。
3. 为学习路线、项目、资源、面经、比赛提供列表、详情、新增、编辑、软删除；公告、Prompt、成员先提供列表。
4. 统一分页、筛选、排序、字段校验、审计字段和错误码；补充待审核状态流转。
5. 密码使用 Argon2/bcrypt 哈希，access token 短期有效，refresh token 可吊销。

### Python AI

1. 提供 POST /ai/ask 普通回答和后续 /ai/ask/stream SSE。
2. 建立文档导入、切片、Embedding、向量检索、引用过滤和 Prompt 模板编排。
3. 只接受 Gateway 的内部密钥；模型密钥只放 Python 环境变量。
4. 增加模型超时、重试、敏感信息过滤、会话配额和 token/成本统计。

## 6. 落地顺序

1. **契约先行**：以 api-contract-v1.md 和 openapi.yaml 为唯一接口基线，前端继续使用 Mock。
2. **Java Core**：完成数据库、登录、角色和内容 CRUD，再将 VITE_CONTENT_SOURCE 切换为 api。
3. **Node Gateway**：接入统一域名、上传存储、CORS/限流和健康检查。
4. **Python AI**：先接本地 fallback 验证 UI，再接 RAG、模型和 SSE。
5. **上线加固**：HTTPS、密钥管理、审计日志、备份、监控、限流和灾备。

接口路径、字段、错误格式和示例以 docs/api-contract-v1.md 及 docs/openapi.yaml 为准。