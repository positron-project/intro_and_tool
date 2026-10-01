# 面经墙 API 交接契约

本文对应当前前端实现，只定义接口，不包含后端实现。接口路径相对于 `VITE_API_BASE_URL`，建议该变量配置为 `http://主机:端口/api`。例如 `GET /interviews` 的完整路径为 `http://主机:端口/api/interviews`。

所有接口响应继续使用项目约定的封装：

```json
{
  "code": 200,
  "msg": "success",
  "data": {}
}
```

业务失败也返回 JSON `Result`，不要依赖 HTTP 错误状态表示常规校验失败。鉴权接口读取 `Authorization: Bearer <token>`。后端必须重新校验账号状态、身份、届次和投稿所有权，不能信任前端传来的作者或届次。

## 数据结构

```json
{
  "id": "interview-123",
  "company": "示例公司",
  "role": "后端开发实习生",
  "author": "成员昵称或匿名成员",
  "submitterName": "提交者账号名（仅投稿人/审核端）",
  "anonymous": false,
  "cohort": "2029 届",
  "date": "2026-09-20",
  "recruitmentType": "实习",
  "category": "backend",
  "city": "杭州",
  "difficulty": "中等",
  "rounds": 2,
  "roundDetails": [
    {
      "title": "一面",
      "questions": [
        {
          "question": "如何处理缓存与数据库的一致性？",
          "answer": "说明采用的策略、适用条件和取舍。"
        }
      ]
    }
  ],
  "preparation": "面试前准备的内容",
  "summary": "整体流程与重点总结",
  "reflection": "给后来者的复盘建议",
  "tags": ["Redis", "系统设计"],
  "views": 18,
  "helpfulCount": 4,
  "isHelpful": false,
  "favoriteCount": 2,
  "isFavorited": false,
  "visibility": "public",
  "status": "changes_requested",
  "submitterId": "42",
  "submittedAt": "2026-09-20T10:00:00+08:00",
  "reviewedAt": "2026-09-21T10:00:00+08:00",
  "reviewNote": null,
  "version": 1,
  "reviewHistory": [
    { "id": "review-1", "action": "request_changes", "status": "changes_requested", "reviewerName": "审核人", "note": "请补充过程", "createdAt": "2026-09-21T10:00:00+08:00" }
  ]
}
```

公开面经对象可省略投稿审核字段。`status` 为 `draft | pending | approved | rejected | changes_requested | withdrawn`；公开列表只返回已通过且当前用户有权查看的内容。`roundDetails[].questions[].answer` 可为空。`author` 是公开展示名；`submitterId` 和审核端使用的 `submitterName` 必须由服务端从令牌/账号资料解析，不能接受客户端指定。匿名投稿审核端仍显示真实投稿人，公开详情不得返回 `submitterId` 或 `submitterName`。

招聘类型和方向是两个独立字段：招聘类型使用 `实习 | 校招 | 社招 | 日常招聘`，技术方向使用面经分类的 `key`（例如 `frontend`、`backend`、`ai`）。分类增删改仍复用现有分类接口。日期格式推荐 `YYYY-MM-DD`，前端能兼容旧记录的其他日期字符串。

## 公开检索与详情

### `GET /interviews`

支持服务端分页和筛选；访客只能收到公开内容，登录用户可以额外收到其有权访问的成员内容。

查询参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `search` | string | 公司、岗位、城市、招聘类型、方向、难度、轮次问题/回答、总结、复盘和标签的全文关键词 |
| `recruitmentType` | string | 实习、校招、社招、日常招聘 |
| `category` | string | 技术方向分类 key |
| `cohort` | string | 届次展示值，如 `2029 届` |
| `difficulty` | string | 简单、中等、困难 |
| `sort` | string | `latest`、`helpful`、`popular` |
| `page` | integer | 从 1 开始，默认 1 |
| `pageSize` | integer | 默认 12，最大 100 |

成功响应 `data`：

```json
{
  "items": [],
  "page": { "page": 1, "pageSize": 12, "total": 0 }
}
```

列表项应包含 `favoriteCount`、`isFavorited`、`views`、`helpfulCount` 和 `isHelpful`。游客未登录时 `isFavorited`、`isHelpful` 固定为 `false`。`sort=popular` 按浏览量倒序，`sort=helpful` 按有帮助数倒序，`latest` 按发布时间倒序。

### `GET /interviews/{id}`

返回单条完整公开面经，包含 `roundDetails`、准备内容和复盘内容。执行与列表相同的身份和可见范围校验。

### `POST /interviews/{id}/view`

记录一次详情浏览，建议按用户或匿名会话做短期去重。返回：

```json
{ "views": 19 }
```

### `POST /interviews/{id}/helpful`

对当前账号切换“有帮助”投票；同一账号重复调用应取消已有投票。返回：

```json
{ "helpfulCount": 5, "isHelpful": true }
```

访客不得投票。后端应保证每个账号对一条面经最多一票，并在事务中更新计数。

## 投稿人接口

以下接口只允许已登录且账号正常的非访客身份调用。创建、编辑和重新提交时，作者账号、匿名展示、届次及时间由后端按业务规则校验。

### `GET /interviews/submissions/mine`

支持 `page`、`pageSize`（最大 100），返回当前账号的面经投稿分页对象，包括草稿、待审核、审核结果、要求修改和已撤回记录。成功数据为 `{ "items": [], "page": { "page": 1, "pageSize": 100, "total": 0 } }`；前端个人中心与消息中心会自动读取全部分页。

### `POST /interviews/submissions`

创建草稿，初始状态为 `draft`。请求体为面经字段（`company`、`role`、`anonymous`、`date`、`recruitmentType`、`category`、`city`、`difficulty`、`rounds`、`roundDetails`、`preparation`、`summary`、`reflection`、`tags`）；作者显示名和届次依据当前账号与 `anonymous` 由服务端生成。不接收客户端 `id`、`author`、`submitterId`、`submitterName`、`cohort`、`status`、审核时间和审核意见。

### `GET /interviews/submissions/{id}`

返回当前用户自己的草稿或被退回投稿。其他用户的记录必须返回业务失败。

### `PATCH /interviews/submissions/{id}`

保存草稿、修改中或退回状态的内容。只允许所有者修改 `draft`、`changes_requested`、`rejected`；`pending` 和 `approved` 不可编辑。每次成功保存增加 `version` 并返回最新完整投稿。

### `POST /interviews/submissions/{id}/submit`

正式提交或重新提交。只允许当前用户自己的 `draft`、`changes_requested`、`rejected` 记录；校验公司、岗位、招聘类型、至少一轮且每轮至少一个问题、总结。成功后状态变为 `pending`，清空旧审核意见并更新 `submittedAt`、`version`。

### `POST /interviews/submissions/{id}/withdraw`

投稿人撤回本人待审核记录，成功后设为 `withdrawn` 并返回最新记录；只允许从 `pending` 撤回。已审核记录不能撤回。

### `DELETE /interviews/submissions/{id}`

当前前端只对草稿显示删除操作。后端只允许所有者删除 `draft`；其他状态请使用明确的撤回业务操作，不要物理删除审核历史。

## 管理审核接口

管理端“投稿中心 > 面经”读取审核队列。只有组长可跨届查看；届次负责人只能查看本人负责届次。该范围必须在后端强制执行，不能只依赖前端的届次过滤。

### `GET /admin/interviews/submissions`

查询参数：`status`（`pending | approved | rejected | changes_requested`，省略时返回所有可审核历史，不包含草稿和已撤回）、`cohort`、`search`、`page`、`pageSize`。搜索范围覆盖公司、岗位、作者、届次、招聘类型、城市、方向、难度、总结、轮次问题和标签。返回 `items + page` 的分页对象；最大 `pageSize` 建议 100。管理端先读取 100 条，之后以“加载更多”逐页读取，不能只返回前 100 条。

### `POST /admin/interviews/submissions/{id}/review`

请求体：

```json
{
  "action": "approve",
  "reviewNote": "可选审核说明"
}
```

`action` 允许 `approve | reject | request_changes`。`approve` 允许审核意见为空；`reject` 和 `request_changes` 必须填写审核意见。只允许处理 `pending` 记录。通过后发布到 `GET /interviews`；要求修改或退回后，投稿人可读取意见、编辑并重新提交。每次状态变化写入 `reviewHistory`、当前审核人、审核时间和版本。审核接口返回的投稿记录应包含仅审核端可见的 `submitterName`。

## 消息通知

站内通知统一保存在 `notifications` 表中；面经和其他业务记录仍分别保存在各自业务表中，通知只记录收件箱内容，不代替投稿状态，也不拥有或删除投稿记录。

- `POST /interviews/submissions/{id}/submit`：提交成功后给有权审核该届面经的负责人、组长和旧版 Admin 账号创建待审核通知；草稿阶段不发通知。
- `POST /admin/interviews/submissions/{id}/review`：审核后将对应待办通知标记为已读，并给投稿人创建通过、退回或要求修改的结果通知。投稿状态、通知状态和结果通知在同一事务中保存。
- `GET /notifications?page=1&pageSize=20`：分页读取当前账号自己的通知，`pageSize` 最大为 100；响应带 `total`、`page`、`pageSize`。`isActionable` 表示通知关联的审核事项目前是否仍待处理，避免已处理任务继续显示为待办。
- `GET /notifications/unread-count`、`PATCH /notifications/{id}/read`、`POST /notifications/read-all`：查询未读数和同步已读状态。
- `DELETE /notifications/{id}`：只能删除已读通知；若它仍关联待处理的审核任务，即使已读也不能删除。
- `DELETE /notifications/read`：批量清理所有已读且不再对应待处理事项的通知。单条或批量删除只删除 `notifications` 行，不会删除项目、投稿、申请或反馈等业务记录。

消息中心每次先读取 25 条，用户可以继续加载更早记录；不会只显示最新 100 条，也不会自动过期或自动隐藏历史。比赛提醒另有发送记录，用户删除已送达提醒后不会被定时任务重新生成。上线已有数据时，按顺序应用通知表/去重键迁移、提醒发送记录迁移和一次性通知回填脚本；回填脚本不要在用户删除过通知后重跑。

## 权限与校验清单

- 访客可按可见范围浏览，不得创建草稿、投有帮助票、提交投稿或审核。
- 普通成员、组员、届次负责人和组长可投稿及查看自己的完整投稿记录。
- 组长可以审核所有届次；届次负责人只能审核自己届次的投稿。
- 只有 `pending` 投稿可审核；只有所有者可以编辑自己的可修改状态。
- 匿名只隐藏公开作者名，不隐藏管理审核端的提交者身份。
- 审核通过后才公开；草稿、待审核、退回和要求修改状态不能出现在公开列表。
- 浏览量和有帮助数由服务端维护，不能直接接受客户端提供的计数值。
- 所有分页、搜索、分类和状态过滤需由服务端执行；不能先返回全部记录再由前端截断。
