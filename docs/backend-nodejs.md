# Node.js Gateway 开发文档

> 本文是 Node.js 部分的实施设计，不代表当前仓库已经包含 Node.js 源码。实现时必须遵守 api-contract-v1.md 和 openapi.yaml。

## 1. 目标与边界

Node.js Gateway 是浏览器唯一访问的后端入口，负责网络层和跨服务编排：

- 对外暴露统一的 /api 前缀，把认证和内容请求转给 Java Core，把 AI 请求转给 Python AI。
- 统一 CORS、请求 ID、超时、错误格式、限流和请求体大小。
- 接收图片/附件并适配 MinIO/S3；业务记录仍由 Java Core 写入。
- 提供 /health 聚合检查，让前端和监控知道依赖是否可用。

Gateway 不负责用户、角色、届次、内容或 AI 对话的业务真相；不直连 PostgreSQL；不保存模型密钥；不因为前端隐藏按钮就放宽权限。

## 2. 部署与配置

开发环境建议：

| 组件 | 地址 | 说明 |
| --- | --- | --- |
| Node.js Gateway | 0.0.0.0:3000 | 浏览器和前端唯一入口 |
| Java Core | 127.0.0.1:8081 | 业务 REST API |
| Python AI | 127.0.0.1:8001 | AI REST/SSE API |
| MinIO/S3 | 内网或云对象存储 | 合影、头像、附件 |

必要配置项：

| 变量 | 作用 | 建议 |
| --- | --- | --- |
| GATEWAY_HOST / GATEWAY_PORT | 监听地址和端口 | 校园网测试绑定 0.0.0.0，生产置于 HTTPS 反向代理后 |
| CORE_SERVICE_URL | Java Core 地址 | 仅服务端环境变量 |
| AI_SERVICE_URL | Python AI 地址 | 仅服务端环境变量 |
| INTERNAL_SERVICE_KEY | Gateway → Python 的内部密钥 | 使用随机值，禁止提交仓库 |
| CORS_ORIGINS | 允许的前端来源 | 生产填写明确域名，不使用 * |
| MAX_UPLOAD_BYTES | 普通图片请求体上限 | 默认 10 MB；头像单独限制 5 MB |
| STORAGE_PROVIDER | local 或 s3 | 开发可 local，生产使用 s3 |
| S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY | 对象存储配置 | 只放服务端密钥存储 |

## 3. 推荐项目结构

~~~text
gateway/
  src/
    server.ts
    config/
    middleware/
      cors.ts
      request-id.ts
      auth-forward.ts
      rate-limit.ts
      error-handler.ts
    routes/
      health.ts
      proxy.ts
      uploads.ts
    adapters/storage/
      storage.port.ts
      local.storage.ts
      s3.storage.ts
    observability/
  test/
  Dockerfile
~~~

路由层只做参数和转发编排；存储通过 storage.port.ts 抽象；配置通过环境变量注入，避免把 Java/Python 地址写进前端。

## 4. 路由与下游归属

| Gateway 对外路径 | 下游 | 方法 | 说明 |
| --- | --- | --- | --- |
| /api/auth/* | Java Core | GET/POST/PATCH | 登录、刷新、资料、密码和注销 |
| /api/learning-routes* | Java Core | GET/POST/PATCH/DELETE | 学习路线 |
| /api/projects* | Java Core | GET/POST/PATCH/DELETE | 项目库 |
| /api/resources* | Java Core | GET/POST/PATCH/DELETE | 资源库 |
| /api/interviews* | Java Core | GET/POST/PATCH/DELETE | 面经墙 |
| /api/competitions* | Java Core | GET/POST/PATCH/DELETE | 比赛中心 |
| /api/announcements、/api/prompts、/api/members | Java Core | GET/POST/PATCH/DELETE | 展示和管理数据 |
| /api/ai/ask | Python AI | POST | 普通 AI 回答 |
| /api/ai/ask/stream | Python AI | POST | 后续 SSE 流式回答 |
| /api/uploads | Gateway + 对象存储 | POST | multipart 上传 |
| /api/uploads/files/:id/:name | Gateway + 对象存储 | GET | 文件读取 |
| /api/uploads/:id | Gateway + 对象存储 | DELETE | 鉴权后删除 |
| /health、/api/health | Gateway | GET | 聚合 Java/Python 健康状态 |

路径、字段、状态码和错误码以 openapi.yaml 为准；Gateway 不改变下游 JSON 字段。

## 5. 请求处理流水线

1. 生成或透传 X-Request-Id，并把它写入响应和结构化日志。
2. 校验 Origin、HTTP 方法和请求路径；OPTIONS 直接返回 204。
3. 对 JSON 读取执行大小限制和 Content-Type 校验；上传执行 multipart 解析。
4. 需要登录的请求透传 Authorization；访问 Python 时额外加入 X-Internal-Key。
5. 通过 AbortController 设置上游超时；只对安全的 GET 请求做有限重试，写请求不自动重试。
6. 将下游错误转换成统一结构：`{ error: { code, message, details, requestId } }`，并保留原 HTTP 状态。
7. 记录耗时、上游服务、状态码和 requestId；日志脱敏，不记录 token 和请求正文。

建议默认超时：Java 10 秒，Python 普通问答 60 秒，文件上传按大小和网络带宽配置。Java/Python 不可用时返回 502；健康检查依赖不完整时返回 503。

## 6. 文件上传设计

上传流程：

1. 要求 Bearer token，交由 Java introspection 或已签发会话策略确认角色。
2. 只接受 multipart/form-data，字段为 file，folder 和 alt 可选。
3. 限制总大小、文件扩展名和 MIME；图片按魔数重新识别，拒绝路径分隔符和可执行文件。
4. 生成不可猜测的 assetId，原始文件名只用于展示；对象键使用 assetId 和安全扩展名。
5. 返回 id、url、name、mimeType、size、alt；内容表后续保存 assetId。
6. 删除前再次鉴权并删除对象；元数据删除采用幂等语义。

生产实现应增加病毒扫描、图片重编码、EXIF 清理、对象生命周期和私有桶签名 URL。

## 7. 安全与运维

- CORS 只允许配置的校园网前端来源；禁止把 Java/Python 端口暴露到公网。
- Redis 限流按 IP、用户和路由分级；AI 和上传使用更严格配额。
- 采用 HTTPS、HSTS、反向代理和安全响应头；生产关闭详细错误堆栈。
- 监控 gateway_requests_total、upstream_latency、upload_bytes、rate_limit_rejected 和 5xx。
- 追踪 requestId；日志保留周期和访问权限由管理员制定。
- 配置、密钥和对象存储凭据通过环境变量或密钥管理系统注入。

## 8. 分阶段交付

### M1：接口壳和联调

- 实现健康检查、CORS、请求 ID、Java/Python 代理和统一错误。
- 用固定的本地 Java/Python mock 验证所有 openapi 路由。
- 交付配置说明、Dockerfile、启动脚本和最小 README。

### M2：上传和安全

- 接入本地存储适配器、上传/下载/删除、大小和类型校验。
- 接入 MinIO/S3、Redis 限流、日志脱敏和 HTTPS 反向代理。
- 完成上传异常、路径穿越和权限测试。

### M3：生产化

- 增加熔断、指标、追踪、灰度配置、对象生命周期和备份。
- 对上游版本和接口契约做兼容性检查，发布前冻结 OpenAPI 版本。

## 9. 验收标准

- 浏览器只需要一个 VITE_API_BASE_URL，无法观察到 Java/Python 内部地址。
- 所有成功/失败响应均带 X-Request-Id，错误符合 Error 结构。
- Java 停止时内容请求得到可读的 502，健康检查得到 503。
- 未登录上传返回 401；无管理角色返回 403；普通图片超过 10 MB 或头像超过 5 MB 返回 413。
- 文件名不能造成路径穿越，下载只能读取已登记 assetId。
- OPTIONS、移动端来源、超时、重复 DELETE 和上游 5xx 均有自动化测试。
