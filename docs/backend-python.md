# Python AI 开发文档

> 本文是 Python 部分的实施设计，不代表当前仓库已经包含 Python 源码。实现时必须遵守 api-contract-v1.md 和 openapi.yaml。

## 1. 目标与边界

Python AI 只负责 AI 能力，不承担账号和业务权限：

- 接收 Gateway 转发的 AI 问题，编排系统 Prompt、检索结果和模型调用。
- 支持无模型配置时的本地 fallback，方便前端先联调。
- 建立知识库导入、切片、Embedding、向量检索、引用过滤和后续 RAG。
- 提供普通 JSON 回答和后续 SSE 流式回答。
- 记录模型耗时、token 用量、成本和失败原因，但默认不保存完整聊天内容。

Python 不创建账号、不修改项目/资源/成员数据、不决定用户是否有编辑权限；这些由 Java Core 判定，模型密钥只存在 Python 服务端。

## 2. 技术基线

推荐 Python 3.11+、FastAPI、Pydantic 2：

- Uvicorn/Gunicorn：服务进程和优雅停机。
- httpx：调用 OpenAI-compatible 或校内模型服务。
- SQLAlchemy/asyncpg：需要会话或任务记录时使用。
- Qdrant、pgvector 或 Milvus：向量库三选一；小规模先 pgvector。
- tiktoken 或对应 tokenizer：切片和 token 估算。
- pytest、pytest-asyncio、respx：接口和上游 mock。
- OpenTelemetry/Prometheus：链路、延迟和用量指标。

## 3. 推荐项目结构

~~~text
ai-service/
  app/
    main.py
    api/
      ask.py
      stream.py
      health.py
    schemas/
      ask.py
      citations.py
    orchestration/
      prompt_builder.py
      retrieval.py
      answer.py
    providers/
      base.py
      openai_compatible.py
      local_fallback.py
    knowledge/
      ingest.py
      chunking.py
      embeddings.py
      vector_store.py
    security/
      internal_auth.py
      redaction.py
    observability/
  tests/
  pyproject.toml
  Dockerfile
~~~

API 层只做校验和响应；orchestration 负责流程；providers 屏蔽模型供应商差异；knowledge 与业务数据库解耦。

## 4. 接口契约

### POST /ai/ask

请求：

~~~json
{ "prompt": "我现在能参加哪些项目？" }
~~~

响应：

~~~json
{
  "id": "assistant-message-id",
  "role": "assistant",
  "content": "回答正文",
  "citations": [
    { "id": "project-ai-campus", "title": "校园 AI 智能助手", "type": "项目", "path": "/projects/ai-campus" }
  ]
}
~~~

- prompt 必填，长度 1–4000；空白、超长和非 JSON 返回 422。
- 请求需要 Gateway 的 X-Internal-Key；同时透传 Authorization 供后续按用户隔离知识范围。
- citations 必须来自检索到的已发布记录，不能编造 URL、id 或标题。
- 模型不可用时返回可理解的 fallback 或稳定 502，由产品决定降级策略。

### POST /ai/ask/stream（第二阶段）

- Content-Type 使用 text/event-stream。
- 每个事件包含 requestId、delta 或 citation；最后发送 done。
- 客户端断开时取消模型请求，不能继续消耗配额。
- 普通 /ai/ask 保持不变，SSE 属于新增能力。

## 5. 回答流水线

1. 校验内部密钥、请求体、用户 token 摘要和请求 ID。
2. 对 prompt 做长度、敏感信息和注入风险预处理；不把系统密钥拼入用户可见文本。
3. 识别问题意图，选择学习路线、项目、资源、面经、比赛等知识集合。
4. 生成查询向量并检索 topK 文档，按权限和 published/archived 状态过滤。
5. 重排结果，去重并生成引用上下文；设置最大上下文 token。
6. 由 Prompt Builder 拼接系统规则、引用材料和用户问题。
7. 调用 provider；超时/429/5xx 使用有限重试和 fallback，不重试明显的校验错误。
8. 校验模型输出和 citations，截断过长回答，记录用量指标后返回。

默认模型参数建议 temperature 0.2–0.4、topK 4–8；上线后由评测集决定，不把参数写死在页面。

## 6. 知识库和引用

知识来源包括已发布的学习路线节点、项目说明、资源卡片、面经和比赛公告：

- 导入任务读取 Java Core 的只读导出或事件，不直接改 Java 数据库。
- 文档按标题、正文、标签和届次切片；保留 sourceId、sourceType、sourcePath、cohort、updatedAt。
- 内容更新或软删除后，异步重建对应向量；查询时再次过滤 archivedAt。
- 引用格式统一为 id、title、type、path，前端可以点击 path 回到站内页面。
- 无可靠引用时明确说明“暂无站内资料”，不要生成伪引用。

## 7. 模型适配与降级

Provider 接口至少包含 ask、stream、countTokens 和 health：

- OpenAI-compatible provider：通过环境变量配置 base URL、model、API key。
- 校内模型 provider：只需实现同一接口，不改变 API 层。
- Local fallback：无模型密钥时按意图返回稳定模板，保证 UI 和错误处理可联调。
- 统一处理 timeout、rate limit、invalid response、context too long，并映射为可观察错误码。
- 模型密钥、完整 prompt 和供应商响应不写入普通日志。

## 8. 安全、配额和隐私

- 只接受 Node Gateway 的内部密钥；Python 端口只绑定内网或容器网络。
- Authorization 只用于权限上下文和审计关联，不在 Python 持久化或回传。
- 对手机号、身份证、密码、token 等敏感信息做脱敏；限制用户输入和单用户并发。
- 按 userId/IP/日额度限制 AI 请求；超额返回 429。
- 默认不保存完整对话；若启用历史，单独设计 retention、删除和导出机制。
- 使用 allowlist 控制可检索知识集合，避免跨届次数据泄露。

## 9. 分阶段交付

### M1：问答壳和 fallback

- 完成 /health、/ai/ask、Pydantic 校验、内部密钥和本地 fallback。
- 用固定 citations 验证前端 AI 页面和 Gateway 转发。
- 交付 provider 接口、环境变量清单和 pytest 基础用例。

### M2：模型和 RAG

- 接 OpenAI-compatible/校内模型，加入超时、重试、token 统计。
- 完成知识导入、切片、Embedding、向量检索、引用过滤和评测集。
- 通过 Gateway 增加权限范围和用户配额。

### M3：流式和生产化

- 实现 /ai/ask/stream SSE、断线取消、会话历史（如确认需要）。
- 加入敏感信息过滤、成本告警、缓存、灰度模型和可观测性。
- 建立提示词版本、回归评测和模型切换流程。

## 10. 验收标准

- 未携带 Gateway 内部密钥返回 403；空 prompt/超长 prompt 返回 422。
- 无模型配置时仍返回合法 AIMessage，citations 字段始终为数组。
- 模型超时、429、5xx 有稳定错误码或 fallback，不泄露供应商密钥。
- 引用只来自已发布站内资料，软删除内容不可被检索。
- SSE 客户端断开能取消上游请求；普通 JSON 接口不受影响。
- 指标包含请求量、P95 延迟、错误率、输入/输出 token、估算成本和 fallback 比例。
