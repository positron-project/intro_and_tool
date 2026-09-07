# 三端后端开发任务总表

> 这是按职责拆分的开发计划，不代表当前仓库包含后端源码。详细实施要求见三份开发文档；接口路径和字段以 api-contract-v1.md、openapi.yaml 为唯一基线。

管理后台新增的届次、小组、成员、照片、主题、审计和比赛届次项目接口见 [后端交接接口文档](./backend-handoff.md)。

## 开发文档

- [Node.js Gateway 开发文档](./backend-nodejs.md)：统一入口、代理、上传、限流和网络安全。
- [Java Core 开发文档](./backend-java.md)：账号权限、内容 CRUD、数据库和审计。
- [Python AI 开发文档](./backend-python.md)：AI 问答、RAG、模型适配和 SSE。
- [三端总体架构](./backend-architecture.md)：服务边界、数据归属和落地顺序。

## Node.js Gateway

- [ ] 统一 /api 入口：auth/content → Java，ai → Python，uploads → 对象存储
- [ ] CORS 白名单、X-Request-Id、统一错误结构、上游超时和熔断
- [ ] 25 MB 请求体限制与 multipart 上传/下载/删除
- [ ] Redis 限流、访问日志脱敏、HTTPS 反向代理
- [ ] MinIO/S3 适配器和对象元数据生命周期
- [ ] Gateway 单元、代理、上传安全和故障降级测试

## Java Core

- [ ] PostgreSQL 表结构与迁移：用户、会话、内容、资源、审计
- [ ] 登录、刷新令牌、注销、当前用户和角色/届次权限
- [ ] 学习路线、项目、资源、面经、比赛 CRUD 与软删除
- [ ] 公告、Prompt、成员列表；管理端待审核状态
- [ ] 分页、搜索、筛选、排序、校验、审计字段和统一错误码
- [ ] Argon2/bcrypt 密码哈希、token 吊销、敏感日志脱敏
- [ ] API、权限、迁移和并发更新集成测试

## Python AI

- [ ] /ai/ask 普通回答和 /ai/ask/stream SSE
- [ ] 文档导入、切片、Embedding、向量库、引用过滤
- [ ] OpenAI-compatible/校内模型适配、超时、重试和 fallback
- [ ] Gateway 内部密钥校验；模型密钥只在服务端
- [ ] 会话配额、token/成本统计、敏感信息过滤
- [ ] Provider、RAG、SSE 断线和安全回归测试

## 跨服务联调验收

- [ ] Swagger/Insomnia 可导入 openapi.yaml
- [ ] 未登录不能写入；Contributor 不能修改其他届次
- [ ] Java/Python 任一不可用时，Gateway 返回可读的 502/503
- [ ] 上传测试覆盖类型、大小、文件名和路径穿越
- [ ] 前端仅设置 VITE_API_BASE_URL 即可切换真实 API
- [ ] 契约变更先更新 OpenAPI 与 Markdown，再改服务实现
- [ ] 生产上线前完成 HTTPS、密钥管理、备份、监控和灾备评审
