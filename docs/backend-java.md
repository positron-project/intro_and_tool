# Java Core 开发文档

> 本文是 Java 部分的实施设计，不代表当前仓库已经包含 Java 源码。实现时必须遵守 api-contract-v1.md 和 openapi.yaml。

## 1. 目标与边界

Java Core 是 Club OS 的业务核心和权限真相：

- 负责账号、会话、角色、届次、成员和所有内容数据。
- 为学习路线、项目、资源、面经、比赛提供列表、详情和管理 CRUD。
- 为公告、Prompt、成员提供展示列表，并预留管理端扩展。
- 统一分页、搜索、筛选、排序、软删除、审计字段和错误码。
- 只接受 Gateway 或受信任内部服务调用，不把数据库暴露给前端。

Java Core 不调用大模型、不保存模型密钥、不负责对象文件字节流；AI 请求由 Python 处理，图片由 Node Gateway 适配对象存储。

## 2. 技术基线

推荐 Java 21 + Spring Boot 3：

- Spring Web：REST 控制器和统一异常处理。
- Spring Security：Bearer access token、refresh token 和角色授权。
- Bean Validation：请求 DTO 校验。
- Spring Data JPA 或 MyBatis：业务持久化；团队应二选一，不在同一模块混用。
- PostgreSQL：生产数据库；Flyway/Liquibase：版本化迁移。
- Testcontainers：集成测试使用临时 PostgreSQL。
- OpenAPI Generator 或 springdoc：从 openapi.yaml 校验实现。

开发期可以先使用内存/SQLite，但必须保持字段、状态码和错误格式不变；不要把开发实现当生产数据方案。

## 3. 推荐模块结构

~~~text
core/
  src/main/java/.../
    auth/          用户、登录、token、密码
    authorization/ 角色、届次、策略
    content/       通用内容元数据、分页、软删除
    learning/      学习路线与节点
    projects/      项目库
    resources/     资源库
    interviews/    面经墙
    competitions/  比赛中心
    announcements/ 公告
    prompts/       Prompt 模板
    members/       小组成员
    audit/         审计事件
    shared/        Error、RequestId、时钟、分页
  src/main/resources/db/migration/
  src/test/
~~~

Controller 只处理 HTTP；Service 承担业务规则；Repository 负责数据库；Policy/Authorization 负责角色和届次判断。任何写入都不能绕过 Service。

## 4. 数据模型和迁移

建议最少建立以下表：

| 表 | 关键字段 | 说明 |
| --- | --- | --- |
| users | id、email(unique)、username、password_hash、role、cohort、avatar_asset_id、status | 账号和成员身份；username 作为可修改的显示/登录名称，email 是唯一身份标识 |
| refresh_tokens | id、user_id、token_hash、expires_at、revoked_at | 可吊销刷新令牌 |
| content_records | id、kind、payload/jsonb、cohort、visibility、status、created_by、updated_by、created_at、updated_at、archived_at | 统一内容基表或领域表 |
| assets | id、object_key、url、mime_type、size、sha256、created_by | Node 上传后的文件元数据 |
| audit_logs | id、actor_id、action、resource_type、resource_id、before_json、after_json、created_at、request_id | 管理操作追踪 |
| ai_conversations（可选） | id、user_id、title、created_at | 需要历史会话时再启用 |

如果使用领域独立表，仍要保持同名审计字段和查询语义。JSONB 适合原型快速迭代，但高频筛选字段（cohort、status、category、created_at）应落为可索引列。

迁移要求：

- 每个数据库变更一个有序 migration，禁止手工改线上表。
- 所有时间保存 UTC；展示层再转换时区。
- 为 id、slug、cohort、status、updated_at 建索引；slug 在项目库唯一。
- 软删除记录默认不出现在列表，管理员审计查询可显式包含 archivedAt。

## 5. 角色与届次策略

| 角色 | 公开内容 | 成员内容 | 全站写入 | 本届写入 |
| --- | ---: | ---: | ---: | ---: |
| Visitor | ✓ | — | — | — |
| Member | ✓ | 登录后 | — | 待审核投稿（后续） |
| Contributor | ✓ | ✓ | — | ✓ |
| Leader | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ |

规则必须由后端执行：

- Leader 表示组长级管理员；Admin 为后续超级管理员扩展角色。
- Contributor 的可管理届次来自 token 对应用户的 cohort；忽略请求体中试图修改的 cohort。
- 更新和删除先读取原记录，再检查原记录届次，避免通过 PATCH 把内容改到别的届次。
- 成员和权限变更写入 audit_logs；密码、token 和模型请求不得写入日志。

## 6. 对外接口实现顺序

所有路径均由 Node Gateway 暴露，Java 内部去掉 /api 前缀：

1. Auth：POST /auth/register/send-code、POST /auth/register、POST /auth/login、POST /auth/login/send-code、POST /auth/login/code、GET /auth/me、POST /auth/logout；第二阶段 POST /auth/refresh。
2. Learning：learning-routes 列表、详情、创建、编辑、软删除。
3. Projects：projects 列表、按 id 或 slug 详情、创建、编辑、软删除。
4. Resources、Interviews、Competitions：同样的列表/详情/CRUD。
5. Announcements、Prompts、Members：先完成 GET 列表，再开放管理员写接口。
6. Admin：用户、成员、公告审核、资产关联和审计查询。

列表统一支持 search、category、status、cohort、page、pageSize、sort、direction；pageSize 最大 100。返回 items 和 page，其中 page 含 page、pageSize、total。

## 7. 请求校验与响应

- 新增 DTO 不允许客户端提交 id、createdAt、updatedAt、createdBy、updatedBy、archivedAt。
- PATCH 只允许白名单字段；未知字段返回 VALIDATION_ERROR 或被明确忽略，团队需统一策略。
- 项目 slug、用户名、资源 URL 和文件 assetId 做唯一性/格式校验。
- 注册成功返回 200；其他资源成功创建 201，编辑 200，软删除 204，未登录 401，无权限 403，校验失败 422，不存在 404。
- 错误统一为 message、code、details，并透传 X-Request-Id。
- 不要把 Java 异常堆栈、SQL 语句或密码提示返回给浏览器。

## 8. 登录与令牌

登录流程：

1. 先在 Java Core 校验 `turnstileToken`，通过 Cloudflare Siteverify 后再校验 email/password；密码使用 Argon2id（或 bcrypt cost 12+）哈希比对。验证码登录走独立的 `/auth/login/send-code` 和 `/auth/login/code`，不得绕过 Turnstile 或邮箱验证码校验。
2. 签发短期 access token（建议 15–30 分钟）和只存哈希的 refresh token（建议 7–30 天）；`rememberMe=false` 时只创建短会话。
3. 注册先校验 Turnstile、邮箱格式、邮箱唯一性和发送频率，再发送 6 位验证码（有效期建议 10 分钟）；注册提交时再次校验 Turnstile、验证码和密码（前端确认密码不应传给后端）。
4. access token 仅包含 userId、role、cohort、tokenId 等最小声明。
5. refresh 时轮换 refresh token，旧 token 立即吊销；logout 吊销当前 token。
6. Gateway 将 Bearer token 透传；Python 不能自行决定业务权限。

第一版可以使用数据库会话表，但接口字段仍保留 refreshToken 和 expiresAt，便于后续无痛升级。

## 9. 分阶段交付

### M1：认证和只读内容

- 建库、迁移、用户/角色/届次模型。
- 完成登录、当前用户、注销、列表和详情。
- 以公开 seed 数据验证前端页面，无管理按钮也能正常浏览。

### M2：管理 CRUD

- 完成学习路线、项目、资源、面经、比赛 CRUD。
- 加入 Contributor 本届限制、Leader/Admin 全站权限、软删除和审计字段。
- 完成公告、Prompt、成员管理端接口设计。

### M3：生产安全

- 接入 Argon2/bcrypt、refresh token、密钥轮换、审计查询和异常告警。
- 增加数据库备份、索引、分页上限、并发更新（version/updatedAt）和迁移回滚方案。
- 用 Testcontainers 跑完整 API、权限和迁移测试。

## 10. 验收标准

- Visitor 的 GET 可用，所有 POST/PATCH/DELETE 未登录返回 401。
- Contributor 只能写自己 cohort 的记录，不能通过请求体或 URL 绕过。
- Leader/Admin 可管理全部届次；每次变更都有 createdBy/updatedBy 和 audit_logs。
- 列表分页、筛选、排序结果稳定，软删除记录不会泄露。
- 错误结构与 openapi.yaml 一致，所有响应带 X-Request-Id。
- 密码、token、Authorization 头和 AI 输入不出现在日志和异常响应。
