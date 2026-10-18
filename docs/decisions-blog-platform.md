# 决策：博客区改用 Halo 承载，官网只做预览

- 状态：已定（2026-10）
- 决策人：YG
- 影响面：`#/home` 05「小组博客」区、`src/services/blog.service.ts`、部署拓扑（新增子域名）
- 相关：`docs/homepage-design-style.md`（入口页视觉规范）、`AGENTS.md`

## 背景

入口页 05 区的四篇文章此前来自 `src/data/mock.ts:139` 的 `blogPosts` 硬编码常量：手写 Markdown 正文、前端自己解析渲染。没有投稿入口，没有后台，改一篇文章要动代码重新发版。

需求是「真正的博客系统」：用成熟的开源系统写文章，官网只负责展示最新几篇做预览。

### 约束（用户明确）

1. **不自研**：用现成开源博客系统，不写自己的文章后台。
2. **独立部署**：博客系统与官网分开部署，官网页面上不再有写作入口。
3. **官网只做预览**：官网只展示最新几篇的标题/摘要/封面，点击看全文或跳博客站。
4. **与官网现有部署保持一致**：远端 Linux（Ubuntu/Debian），可用 Docker。

## 决策

**采用 Halo 2.26 社区版**，Docker Compose 独立部署在子域名（`blog.<域名>`），PostgreSQL 独立容器承载数据，官网前端直连 Halo 的 Public Content API 拉取最新文章。

### 为什么是 Halo

| 候选 | 结论 |
| --- | --- |
| WordPress | 生态最大（占全网 40.2%），但 PHP 栈与现有 Node/FastAPI 部署不一致，后台偏重，安全面大 |
| Ghost | 官方基线是 Ubuntu + Node 22 + MySQL，运维面比 Halo 重；新闻信只能接 Mailgun；同名的 `ghost.build`（Timescale 的 PG CLI）与 Broadcom Ghost Solution Suite 是噪音 |
| 静态生成器（Hugo/Astro） | 写文章仍是 Markdown + 构建，没有后台，等于把「真正的博客」做成了「另一个 mock」 |
| Headless（Strapi/Directus） | 要自己写前台，违背「不自研」 |
| **Halo** | Java 单容器 + PostgreSQL，`docker compose up -d` 即用；后台成熟；Content API 匿名可读（官网不需要任何密钥）；中文社区活跃、文档完整 |

Halo 是唯一同时满足「有后台可写」「Docker 一条命令起」「官网能匿名取数」三项的候选。

### 为什么是 PostgreSQL 独立容器

Halo 官方推荐 PostgreSQL。独立容器（而非复用官网 MySQL）的理由：博客的数据、备份、升级周期与社团业务库完全解耦，升级 Halo 或换库不影响 `club_os`。

## 架构

```
浏览器
  │
  ├── https://<域名>/#/home      官网（React SPA，本仓）
  │        └── 05 博客区 ──┐
  │                        │ fetch（匿名，无 key）
  │                        ▼
  └── https://blog.<域名>  Halo 2.26  ──┐
         ├── /console      管理后台      │ r2dbc
         └── /apis/...     Public API    ▼
                                    PostgreSQL 15.4（独立容器）
```

- 博客站与官网**不同源**，Halo 需要放开 CORS（见下）。
- 官网**不经过** FastAPI：博客内容不落社团数据库，`backend/OS_club` 不动。
- 官网**不持有任何密钥**：用的全是匿名可读的 Public Content API。

## 接口契约（实测）

基址 `VITE_BLOG_API_BASE`（如 `https://blog.example.com`）。

### 列表

```
GET {base}/apis/api.content.halo.run/v1alpha1/posts?page=1&size=4
```

响应是分页信封：

```json
{ "page": 1, "size": 4, "total": 127, "totalPages": 32,
  "first": true, "hasNext": true, "hasPrevious": false, "last": false,
  "items": [ /* 见下 */ ] }
```

`items[]` 每一项（在 halo.run 官网上实测的键）：

| 目标字段 | 来源 | 备注 |
| --- | --- | --- |
| `id` | `metadata.name` | UUID |
| `title` | `spec.title` | |
| `excerpt` | `status.excerpt` → 回落 `spec.excerpt.raw` | `spec.excerpt` 是**对象** `{autoGenerate, raw}`，`status.excerpt` 才是字符串 |
| `date` | `spec.publishTime` | ISO 带纳秒 `2026-09-28T06:41:25.045999529Z`，需格式化 |
| `author` | `owner.displayName` | 实测 `{"displayName":"Halo","name":"halo"}` |
| `category` | `categories[0].spec.displayName` | 内联数组，不是 id 列表 |
| `tags` | `tags[].spec.displayName` | 同上，内联 |
| `url` | `blogBase + status.permalink` | `status.permalink` 形如 `/archives/<slug>` |
| `cover` | `spec.cover` | 相对路径 `/upload/...`，需拼 `blogBase` |
| `readTime` | —— | 列表**不含正文**，无法计算；点开时由详情接口补 |

列表**不返回正文**。

### 详情

```
GET {base}/apis/api.content.halo.run/v1alpha1/posts/{metadata.name}
```

返回结构同上，**外加顶层**：

```json
"content": { "content": "<p>…渲染后的 HTML…</p>", "raw": "<p>…原始 HTML…</p>" }
```

正文是 **HTML**，不是 Markdown。

⚠️ `GET .../posts/{name}/content` **不存在**（404 `No static resource ...`），别用。`.../posts/{name}/navigation?scope=category` 是上下篇导航接口，不是正文。

### 其他

- Public Content API 匿名可读，无需 `Authorization`。Console / UC API 才需要 `Bearer pat_xxx`。
- 未确证支持 `sort` 参数，因此**排序在前端本地做兜底**，不臆造 `?sort=publishTime,desc`。
- 官网取数只需要 `posts` 一个端点。

## 落地顺序

1. DNS：`blog.<域名>` A 记录指向服务器。
2. 反代 + TLS：Nginx 反代到 `127.0.0.1:8090`，签发证书。
3. `docker compose up -d` 起 Halo + PostgreSQL。
4. 访问 `/console` 完成初始化，**确认 `--halo.external-url` 与实际站点地址一致**。
5. 装主题与插件（投稿审核、SEO 按需）。
6. 官网侧配置 `VITE_BLOG_API_BASE` / `VITE_BLOG_SITE_URL` 并验证取数。
7. 配定期备份（Halo 后台备份 + `halo2/`、`db/` 两个卷）。

## 运维

- 升级：改 compose 里的镜像 tag（`2.26` → 目标版本），`docker compose pull && docker compose up -d`。升级前先备份。
- 备份：`docker compose exec halodb pg_dump -U halo halo > backup.sql`，外加 `halo2/` 卷（附件与配置）。
- 健康检查：`GET /actuator/health/readiness`。

## 已知坑（部署前先读）

1. **反代与 DNS 必须早于 `/console` 初始化**：`external-url` 一旦写错，整站链接（含 API 返回的 `permalink`）都是错的，改起来要动数据库。
2. **Halo 与 Ghost 都不支持反向代理到子路径**：只能挂独立子域名，`https://<域名>/blog` 这条路不通。
3. **外网必须畅通**：Halo 初始化时会拉取账号体系的校验，服务器出网受限会导致初始化卡住。
4. **跨域**：官网与博客不同源，Halo 需放开 `Access-Control-Allow-Origin`，否则浏览器直接拦截取数。这是「前端直连」方案的代价；若不想放开 CORS，就改走 FastAPI 只读转发端点（本次未采用）。

## 被否决的方案

- **FastAPI 加只读转发端点**（约 25 行，`GET /api/blog/posts` 内部转发到 Halo）：好处是官网同源、无 CORS、可加缓存。用户选择前端直连，理由是后端不动、少一层。**如果后续 CORS 或缓存成为问题，这是回退路径。**
- **复用官网 MySQL**：博客与业务库耦合，升级与备份互相牵制。
- **自研文章表 + 后台**：违背「不自研、用成熟系统」。

## 官网侧落地

- `src/services/blog.service.ts`：Halo Public API 客户端 + 字段映射 + 正文清洗。
- `src/services/content.context.tsx`：`refresh()` 里并行拉取博客，失败降级为 `mock.ts` 的演示数据并在 error 里提示。
- `src/components/home/BlogSection.tsx`：抽屉支持 Halo 的 HTML 正文（清洗后渲染），并给出跳博客站的入口。
- `.env` / `.env.example` / `.env.standalone`：新增 `VITE_BLOG_API_BASE`、`VITE_BLOG_SITE_URL`、`VITE_BLOG_PAGE_SIZE`、`VITE_BLOG_TIMEOUT_MS`；**留空即视为未配置**，官网回落到 mock 数据，本地开发不受影响。**单文件版必须在 `.env.standalone` 里显式清空这四个变量** —— Vite 在任何 mode 下都会先加载 `.env`，而 `.env.[mode]` 只覆盖它自己声明的键。
- `src/services/blog.service.test.ts`：覆盖清洗器安全边界（`base`/`area`/`template` 丢弃、`javascript:` 的大小写/实体/控制字符变体、`data:` 只放行位图）与映射边界（空串摘要回落、按 `publishTime` 排序、`content.raw` 回落、非 2xx、超时 abort）。

## 实施状态（截至 2026-10）

- **Halo 已部署并完成初始化**：容器 `halo-halo-1`（`registry.fit2cloud.com/halo/halo:2.26`）+ `halo-halodb-1`（`postgres:15.4`）均为 Healthy，端口绑在宿主机回环 `127.0.0.1:8091` → 容器 `8090`（宿主机 `8090` 已被别的服务占用）。
- **`external-url` 在初始化之前就已写成最终域名** `https://blog.stcnchu.com/`，没有出现「初始化后再改」的返工。
- **前端链路已端到端验证**：本地 `.env` 指向 `http://127.0.0.1:8091`（经 SSH 隧道），官网首页博客区成功渲染 Halo 的真实文章；抽屉走 HTML 清洗分支正确；`H2→drawer-h2` / `P→drawer-paragraph` 类映射生效；被清洗掉的 `<script>`、`on*` 属性均未出现在 DOM。列表字段映射（标题 / 摘要 / 日期 / 分类 / 作者）与实测值一一对上。
- **列表返回不含正文，点开抽屉时才发第二请求**取详情 —— 这是预期行为，不是 bug。
- **降级路径已验证**：把 `VITE_BLOG_API_BASE` 指向不可达端口后，官网首页零可见影响，只有博客区回落到 mock 演示数据。
  > 注意：博客请求**不是**完全静默的 —— 失败时会在横幅里补一句「博客站暂时连不上」，与 FastAPI 侧集合的失败文案分开，避免把博客故障指向「后端接口」。
- **代码 review 后修正的几处**（首版遗留，已修并补了单测）：
  - `content.context.tsx`：博客 promise 在 `Promise.allSettled` 之后才 `await`，中间无 handler 会先产生一次 unhandled rejection；且这个 `await` 会拖住全站其余内容的提交（最长 `VITE_BLOG_TIMEOUT_MS`）。已改成「立即接住失败 + 最后单独提交」。
  - `content.context.tsx`：博客站正常但 0 篇文章时被判成「失败」，而横幅原文写着「不会显示演示数据」—— 与 `emptyContent()` 确实给博客区塞了 mock 的事实相矛盾。现在空列表视为正常空态。
  - `blog.service.ts`：清洗器原先放行 `<base href>`（可改写文档级 `baseURI`，让站内所有相对 URL 改向）与 `<area href="javascript:">`，且 `data:` 白名单过宽（连带放行可内嵌脚本的 `data:image/svg+xml`）。已把 `base` / `area` / `map` / `template` / `noscript` 补进丢弃表，并把协议判断从黑名单改成显式白名单。
  - `.env.standalone`：原先没覆盖 `VITE_BLOG_*`，隧道地址被打进了 `nchu-cs-club-standalone.html`（已构建产物实测确认）。已补空值覆盖并重新构建验证不再泄漏。
- 管理员账号与密码通过线下方式交接，**不写入仓库**。

### 本地开发怎么连

Halo 只监听服务器回环地址，本机开发需要一条 SSH 隧道：

```bash
ssh -L 8091:127.0.0.1:8091 <user>@<server>
# 之后 .env 里用 VITE_BLOG_API_BASE=http://127.0.0.1:8091
```

### 剩余待办

1. `blog.stcnchu.com` 的 DNS 解析 + 反向代理（→ `127.0.0.1:8091`）+ TLS 证书。
2. 服务器 `/home/csclub/clubos/.env` 补 `VITE_BLOG_API_BASE=https://blog.stcnchu.com` 并重新构建发布。
3. 首页「查看全部文章」已改成：配了 `VITE_BLOG_*` 就新窗口跳到 `${VITE_BLOG_SITE_URL}/archives`，否则维持原来的 `#/resources` 站内跳转。服务器构建时填上域名即生效。
4. Halo 侧仍是默认主题与示例文章，站点标题已设为「计算机科技小组」；主题、投稿审核插件按需再调。
