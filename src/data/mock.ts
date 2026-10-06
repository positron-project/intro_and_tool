import type {
  AIMessage,
  Announcement,
  Citation,
  CompetitionEvent,
  InterviewExperience,
  LearningNode,
  Member,
  Project,
  PromptTemplate,
  ContentCategory,
  ProjectCategory,
  Resource,
} from '../types'

export const announcements: Announcement[] = [
  { id: 'a1', category: '重要', title: '2026 蓝桥杯报名即将开始！', detail: '报名时间：2026.05.20 — 2026.06.10', date: '05-18' },
  { id: 'a2', category: '比赛', title: '校内 ACM 程序设计竞赛报名中', detail: '比赛时间：2026.06.01 19:00', date: '05-17' },
  { id: 'a3', category: '项目', title: '校园 AI 助手项目招募中', detail: '急需：前端开发 2 人、算法工程师 1 人', date: '05-16' },
  { id: 'a4', category: '讲座', title: '大模型与 Agent 技术分享会', detail: '时间：05.25 14:00 · 地点：教2-301', date: '05-15' },
  { id: 'a5', category: '通知', title: '机房设备维护通知', detail: '时间：05.18 08:00 — 18:00', date: '05-14' },
]

export const projects: Project[] = [
  {
    id: 'p1', slug: 'ai-campus', name: '校园 AI 智能助手', description: '基于 RAG 和 Agent 的校园知识问答系统', intro: '把小组历届沉淀的通知、学习路线与项目文档组织成可检索的知识空间，让下一届可以从真实上下文继续前进。', githubUrl: 'https://github.com/example/campus-ai-assistant', docsUrl: '#/resources', demoUrl: '', issueUrl: 'https://github.com/example/campus-ai-assistant/issues', stack: ['Python', 'FastAPI', 'Vue3'], members: 12, stars: 128, status: '招募中', difficulty: 3, year: 2026, category: 'AI', accent: 'blue', icon: 'spark', featured: true, visibility: 'contributors', memberIds: ['m1', 'm2', 'm4'], joinEnabled: true, joinNote: '欢迎熟悉 Python、前端或知识库方向的成员参与。', milestones: [{ id: 'p1-m1', year: '2024', title: '校园问答 v1', summary: '关键词检索 · Vue · Flask', status: '已完成' }, { id: 'p1-m2', year: '2025', title: 'RAG v2', summary: '向量检索 · FastAPI · PostgreSQL', status: '已完成' }, { id: 'p1-m3', year: '2026', title: 'Agent v3', summary: 'LangGraph · 工具调用 · 评测集', status: '进行中' }], logs: [{ id: 'p1-l1', date: '05-16', title: '新增校园地点检索工具', detail: '补充校园地点查询与引用卡片。', author: '何宇辰', authorInitials: 'HY' }, { id: 'p1-l2', date: '05-12', title: '完成回答引用卡片', detail: '让每次回答都能追溯到对应资料来源。', author: '周一帆', authorInitials: 'ZY' }],
  },
  {
    id: 'p2', slug: 'online-judge', name: '在线题库系统', description: '支持刷题、比赛、评测的在线平台', stack: ['Next.js', 'NestJS', 'MySQL'], members: 8, stars: 86, status: '维护中', difficulty: 4, year: 2025, category: 'Web', accent: 'violet', icon: 'terminal', featured: true, visibility: 'members',
  },
  {
    id: 'p3', slug: 'lab-booking', name: '实验室设备预约系统', description: '设备预约、使用管理与数据统计', stack: ['Spring Boot', 'Vue3', 'MySQL'], members: 6, stars: 64, status: '维护中', difficulty: 3, year: 2024, category: 'Backend', accent: 'mint', icon: 'calendar', featured: true,
  },
  {
    id: 'p4', slug: 'campus-map', name: '校园地图导航', description: '面向新生的室内外校园路线与地点图谱', stack: ['React', 'Go', 'PostGIS'], members: 7, stars: 53, status: '招募中', difficulty: 3, year: 2026, category: 'Tools', accent: 'orange', icon: 'map',
  },
  {
    id: 'p5', slug: 'vision-lab', name: '实验室视觉识别', description: '轻量化视觉模型在实验室场景的实践', stack: ['PyTorch', 'ONNX', 'Docker'], members: 5, stars: 41, status: '已归档', difficulty: 5, year: 2023, category: 'Algorithm', accent: 'rose', icon: 'scan',
  },
]

export const projectCategories: ProjectCategory[] = [
  { id: 'cat-ai', key: 'AI', label: 'AI', description: '智能应用、Agent 与知识工程', accent: 'blue', icon: 'spark', order: 1, enabled: true, builtIn: true },
  { id: 'cat-web', key: 'Web', label: 'Web', description: '前端体验与全栈产品', accent: 'violet', icon: 'code', order: 2, enabled: true, builtIn: true },
  { id: 'cat-backend', key: 'Backend', label: 'Backend', description: '服务端、数据与系统工程', accent: 'mint', icon: 'terminal', order: 3, enabled: true, builtIn: true },
  { id: 'cat-algorithm', key: 'Algorithm', label: 'Algorithm', description: '算法训练、模型与实验', accent: 'orange', icon: 'route', order: 4, enabled: true, builtIn: true },
  { id: 'cat-tools', key: 'Tools', label: 'Tools', description: '效率工具与校园服务', accent: 'rose', icon: 'rocket', order: 5, enabled: true, builtIn: true },
]

export const learningNodes: LearningNode[] = [
  { id: 'python', title: 'Python 工程基础', duration: '2 周', resources: 12, projects: 4, description: '语法、模块、虚拟环境与工程习惯' },
  { id: 'git', title: 'Git / GitHub', duration: '1 周', resources: 8, projects: 8, description: '分支协作、Issue、Code Review' },
  { id: 'pydantic', title: 'Pydantic 数据建模', duration: '3 天', resources: 5, projects: 3, description: '让数据可信，让 API 好用' },
  { id: 'fastapi', title: 'FastAPI', duration: '1 周', resources: 10, projects: 3, description: '构建可交付的 Python 服务' },
  { id: 'milestone', title: 'Project Milestone', duration: '2 周', resources: 6, projects: 1, description: '把知识带进一个真实项目' },
  { id: 'rag', title: 'RAG 检索增强', duration: '1 周', resources: 9, projects: 2, description: '让模型回答有依据' },
  { id: 'langchain', title: 'LangChain', duration: '1 周', resources: 7, projects: 2, description: '编排工具、记忆与检索' },
  { id: 'langgraph', title: 'LangGraph', duration: '4 天', resources: 5, projects: 1, description: '用图构建可控 Agent' },
  { id: 'multi-agent', title: 'Multi-Agent', duration: '1 周', resources: 4, projects: 1, description: '让多个角色协同完成任务' },
]

export const resources: Resource[] = [
  { id: 'r1', title: 'FastAPI 学习路线', description: '从路由到依赖注入，完成第一个可部署服务。', category: 'backend', type: '学习路线', tags: ['Python', 'FastAPI'], author: '2025 届 · 林同学', updated: '05-15', views: 1240, accent: 'blue', visibility: 'members' },
  { id: 'r2', title: 'Docker 从入门到实践', description: '给项目加上可复制的本地开发与部署环境。', category: 'devops', type: '文档', tags: ['Docker', '部署'], author: '2024 届 · 陈同学', updated: '05-14', views: 982, accent: 'mint' },
  { id: 'r3', title: 'LangChain 中文文档整理', description: '小组成员共同维护的 Agent 学习索引。', category: 'agent', type: 'GitHub', tags: ['LangChain', 'RAG'], author: 'AI 方向组', updated: '05-13', views: 876, accent: 'violet', visibility: 'contributors' },
  { id: 'r4', title: '前端工程化检查清单', description: '从组件、状态到发布，项目启动前先看这一页。', category: 'frontend', type: '文章', tags: ['React', '工程化'], author: '2026 届 · 周同学', updated: '05-11', views: 614, accent: 'orange' },
  { id: 'r5', title: 'SQL 面试题 100 讲', description: '从查询基础到索引与事务的系统复习卡片。', category: 'database', type: '课程', tags: ['MySQL', '面试'], author: '后端方向组', updated: '05-09', views: 530, accent: 'rose' },
  { id: 'r6', title: 'Agent Prompt 设计手册', description: '把一个模糊问题拆成可执行、可评估的指令。', category: 'prompt', type: '文档', tags: ['Prompt', 'Agent'], author: '2025 届 · 何同学', updated: '05-08', views: 488, accent: 'violet' },
]

export const resourceCategories: ContentCategory[] = [
  { id: 'resource-cat-frontend', key: 'frontend', label: '前端', description: '界面、交互与工程化实践', accent: 'orange', icon: 'code', order: 1, enabled: true, builtIn: true },
  { id: 'resource-cat-backend', key: 'backend', label: '后端', description: '服务端、数据库与接口设计', accent: 'blue', icon: 'terminal', order: 2, enabled: true, builtIn: true },
  { id: 'resource-cat-algorithm', key: 'algorithm', label: '算法', description: '算法训练与模型实践', accent: 'violet', icon: 'route', order: 3, enabled: true, builtIn: true },
  { id: 'resource-cat-ai', key: 'ai', label: 'AI', description: '人工智能与知识工程', accent: 'blue', icon: 'spark', order: 4, enabled: true, builtIn: true },
  { id: 'resource-cat-agent', key: 'agent', label: 'Agent', description: '智能体编排与应用', accent: 'mint', icon: 'rocket', order: 5, enabled: true, builtIn: true },
  { id: 'resource-cat-database', key: 'database', label: '数据库', description: 'SQL、存储与数据建模', accent: 'rose', icon: 'folder', order: 6, enabled: true, builtIn: true },
  { id: 'resource-cat-devops', key: 'devops', label: 'DevOps', description: '部署、容器与运维工具', accent: 'mint', icon: 'terminal', order: 7, enabled: true, builtIn: true },
  { id: 'resource-cat-prompt', key: 'prompt', label: 'Prompt', description: '提示词与模型协作方法', accent: 'violet', icon: 'spark', order: 8, enabled: true, builtIn: true },
]

export const members: Member[] = [
  { id: 'm1', name: '林知行', role: '负责人', cohort: '2025 届', direction: 'AI / 后端', projects: ['校园 AI 智能助手', '知识库 2.0'], initials: 'LZ', accent: 'blue' },
  { id: 'm2', name: '周一帆', role: '前端组长', cohort: '2026 届', direction: '前端工程', projects: ['校园 AI 智能助手'], initials: 'ZY', accent: 'violet' },
  { id: 'm3', name: '陈默', role: '后端组长', cohort: '2024 届', direction: '后端 / DevOps', projects: ['在线题库系统'], initials: 'CM', accent: 'mint' },
  { id: 'm4', name: '何宇辰', role: '算法组长', cohort: '2025 届', direction: '算法 / Agent', projects: ['校园 AI 智能助手'], initials: 'HY', accent: 'orange' },
  { id: 'm5', name: '苏晴', role: '项目成员', cohort: '2026 届', direction: '前端工程', projects: ['实验室设备预约系统'], initials: 'SQ', accent: 'rose' },
  { id: 'm6', name: '叶嘉', role: '项目成员', cohort: '2025 届', direction: 'Java / 后端', projects: ['在线题库系统'], initials: 'YJ', accent: 'blue' },
]

export const interviews: InterviewExperience[] = [
  { id: 'i1', company: '字节跳动', role: '后端开发实习', author: '陈默', cohort: '2024 届', date: '2025.11', difficulty: '困难', rounds: 3, tags: ['Java', 'Redis', '系统设计'], summary: '从项目架构讲到缓存一致性，重点准备可观测性和取舍。', category: 'backend', visibility: 'members' },
  { id: 'i2', company: '腾讯', role: '前端开发实习', author: '周一帆', cohort: '2026 届', date: '2026.03', difficulty: '中等', rounds: 2, tags: ['React', '性能优化', '工程化'], summary: '面试官围绕真实项目追问性能指标与组件抽象。', category: 'frontend' },
  { id: 'i3', company: '阿里云', role: 'AI 工程师', author: '何宇辰', cohort: '2025 届', date: '2025.10', difficulty: '困难', rounds: 4, tags: ['RAG', '评测', 'Python'], summary: '把一个 Agent 做好，关键是评测集、失败兜底与数据闭环。', category: 'ai', visibility: 'contributors' },
]

export const interviewCategories: ContentCategory[] = [
  { id: 'interview-cat-intern', key: 'intern', label: '实习', description: '暑期、日常与转正实习面试', accent: 'blue', icon: 'users', order: 1, enabled: true, builtIn: true },
  { id: 'interview-cat-campus', key: 'campus', label: '校招', description: '秋招、春招与校园招聘', accent: 'orange', icon: 'route', order: 2, enabled: true, builtIn: true },
  { id: 'interview-cat-frontend', key: 'frontend', label: '前端', description: '前端开发与工程化岗位', accent: 'violet', icon: 'code', order: 3, enabled: true, builtIn: true },
  { id: 'interview-cat-backend', key: 'backend', label: '后端', description: '服务端与系统研发岗位', accent: 'mint', icon: 'terminal', order: 4, enabled: true, builtIn: true },
  { id: 'interview-cat-ai', key: 'ai', label: 'AI', description: '算法、模型与 AI 工程岗位', accent: 'rose', icon: 'spark', order: 5, enabled: true, builtIn: true },
]

export const prompts: PromptTemplate[] = [
  { id: 'pt1', title: '把需求拆成可执行的技术任务', usage: '从模糊想法进入项目排期', model: '通用模型', category: '编程', preview: '你是一个资深技术负责人。请将下面的需求拆解为…' },
  { id: 'pt2', title: '温和但严格的代码 Review', usage: '快速找到风险并给出修复方向', model: 'Claude / GPT', category: '代码 Review', preview: '请按正确性、可维护性、性能、测试四个维度…' },
  { id: 'pt3', title: 'Debug 线索整理器', usage: '把报错信息转为排查路径', model: '通用模型', category: 'Debug', preview: '我会提供错误日志和最小复现。请先总结已知事实…' },
  { id: 'pt4', title: '把论文读成一页技术卡片', usage: '快速建立一个领域的地图', model: 'GPT-5', category: '论文', preview: '请以研究问题、方法、实验、局限、可复现步骤…' },
]

export const citations: Citation[] = [
  { id: 'c1', title: 'FastAPI 学习路线', type: '学习路线', path: '#/learning' },
  { id: 'c2', title: '校园 AI 项目 README', type: '项目文档', path: '#/projects/ai-campus' },
  { id: 'c3', title: '2026 蓝桥杯报名通知', type: '公告', path: '#/home' },
]

export const starterMessages: AIMessage[] = [
  { id: 'welcome', role: 'assistant', content: '你好，我是科技小组 AI 助手 👋\n我可以帮你在学习路线、项目、资源和面经之间找到下一步。试着问我“我现在能参加哪些项目？”', citations },
]

export const growthStats = [
  { label: '成员总数', value: '286', note: '一起学习的人', icon: 'users', accent: 'blue' },
  { label: '项目数量', value: '68', note: '历届项目', icon: 'rocket', accent: 'violet' },
  { label: '资源数量', value: '1,324', note: '学习资料', icon: 'folder', accent: 'mint' },
  { label: '面经数量', value: '587', note: '经验分享', icon: 'message', accent: 'orange' },
  { label: '获奖数量', value: '23', note: '竞赛奖项', icon: 'trophy', accent: 'rose' },
  { label: '届数', value: '6', note: '传承不息', icon: 'history', accent: 'blue' },
]


export const competitionEvents: CompetitionEvent[] = [
  { id: 'e1', title: '2026 蓝桥杯', seriesName: '蓝桥杯', type: '省级竞赛', date: '06.18', deadline: '报名截止 06.10', description: '用算法和工程能力，把一个下午变成一次真正的实战。', status: '报名中', accent: 'blue' },
  { id: 'e2', title: '校内 ACM 程序设计竞赛', seriesName: '校内 ACM', type: '校内赛', date: '06.01', deadline: '报名截止 05.28', description: '三人一队，和熟悉的队友一起练习思考与协作。', status: '报名中', accent: 'orange' },
  { id: 'e3', title: 'Agent 创意挑战赛', seriesName: 'Agent 创意挑战赛', type: '项目赛', date: '07.12', deadline: '开放组队 06.20', description: '把一个校园问题交给 Agent，做出可以被使用的答案。', status: '即将开始', accent: 'violet', visibility: 'members' },
]


export const blogPosts: import('../types').BlogPost[] = [
  {
    id: 'post-1',
    category: '技术文章',
    title: '从零构建企业级 Agent：LangGraph 状态图与多工具调度的踩坑实录',
    excerpt: '在构建校园 AI 助手的过程中，我们经历了从基础 Prompt 链到 RAG 检索，再到图状态机的架构演进。本文全面复盘状态路由、工具容错与评测集设计。',
    date: '2026.05.20',
    readTime: '8 分钟阅读',
    author: 'AI 方向负责人 · 何宇辰',
    tags: ['Agent', 'LangGraph', 'FastAPI', 'RAG'],
    content: `## 为什么放弃简单的线性 Prompt Chain？

在最初开发“校园 AI 智能助手”时，我们尝试使用普通的 Prompt 串联（LangChain Sequence）。但在真实复杂的校园场景下，这种线性流程很快暴露出致命短板：
1. **多分支判断脆弱**：当用户同时询问“请帮我查一下教务通知，并且推荐一条对应的学习路线”时，线性逻辑无法准确分支判断。
2. **工具调用失败无法自愈**：一旦某个网络检索 API 超时，整个 Chain 即刻崩溃抛错。

## 转向 LangGraph：把 Agent 建模为状态图

LangGraph 将大模型的思考决策抽象为一个有向图（StateGraph）。我们定义了一个包含用户输入、中间上下文、工具调用计数与错误重试标记的全局状态结构：

\`\`\`python
class AgentState(TypedDict):
    query: str
    chat_history: List[BaseMessage]
    citations: List[Citation]
    tool_retries: int
    final_response: str
\`\`\`

每个节点（Node）分别负责不同的职能：
- **Router Node**：分析用户意图，决定走“直接生成”、“向量库召回”还是“外部 API 执行”。
- **Retrieval Node**：调用 pgvector 混合检索教务知识库。
- **Tool Executor**：安全沙箱执行机房预约查询、课程表检索等工具。
- **Verification Node**：校验生成内容的事实性与引用准确率。

## 生产环境踩坑与优化建议

- **严格限制工具执行深度**：防止模型进入死循环，设置最大步数为 5 步；
- **Prompt 强制结构化输出**：使用 Pydantic 严格校验模型返回的 JSON；
- **加入断路器（Circuit Breaker）**：当下游接口波动时，平滑降级为知识库静态离线检索。`,
  },
  {
    id: 'post-2',
    category: '活动记录',
    title: '【极客破冰】2026 春季开源马拉松回顾：24 小时从想法到生产交付',
    excerpt: '连续 24 小时的代码狂欢，32 位成员、8 支战队在实训机房通宵攻坚。从清晨的需求头脑风暴，到深夜的代码联调，带你重温那些发光的极客时刻。',
    date: '2026.04.16',
    readTime: '5 分钟阅读',
    author: '项目组长 · 周一帆',
    tags: ['活动复盘', '黑客松', '开源协作', '极客文化'],
    content: `## 24 小时，我们能做出什么？

4 月 15 日上午 09:00，科技小组专属机房 402 准时拉开本学期“24H 原型黑客松”的序幕。
本次黑客松不设命题门槛，唯一硬性要求是：**24 小时后必须展示一个真实可交互、部署在测试服上的系统 Demo，拒绝纯 PPT 演讲！**

## 战况直击：从讨论白板到键盘声浪

- **09:00 - 12:00 头脑风暴与需求拆解**：白板上画满了架构拓扑、API 路由契约与 Figma 低保真线框。
- **14:00 - 20:00 模块攻坚与接口联调**：前端组件迅速成型，后端 Docker 服务持续部署，机房弥漫着机械键盘的敲击声。
- **02:00 - 05:00 凌晨攻坚与联调调试**：解决跨域 CORS、修补沙箱边界、通宵咖啡与能量饮料补给。
- **09:00 最终 Demo 评审与成果验收**：8 支队伍全部完成了系统上线！

## 最终交付亮点

1. **Campus Fast-Drop**：基于 WebRTC 的局域网免流量大文件直传工具；
2. **Git Commit Linter CLI**：面向新生的标准化 Git 提交检查终端工具；
3. **Course Radar**：轻量化选课评价分析器。

所有代码现已全部开源在科技小组 GitHub 组织中，欢迎认领后续 Issue！`,
  },
  {
    id: 'post-3',
    category: '获奖快讯',
    title: '热烈祝贺！项目组在第十五届“中国软件杯”全国总决赛斩获二等奖',
    excerpt: '历经四个月的高强度备战、初赛选拔与现场封闭答辩，我院计算机科技小组项目组团队从全国数千支高校队伍中脱颖而出，喜获全国二等奖！',
    date: '2025.10.28',
    readTime: '3 分钟阅读',
    author: '官方新闻中心',
    tags: ['荣誉快讯', '中国软件杯', '国赛获奖', '成果喜报'],
    content: `## 赛事实录与捷报

在刚刚落幕的第十五届“中国软件杯”大学生软件设计大赛全国总决赛中，由我院计算机科技小组项目组组队研发的参赛作品——《基于混合检索与多智能体协同的校园知识中枢系统》，凭借创新的系统架构、高稳定性的工程交付与现场优异的答辩表现，荣获**全国二等奖**！

## 参赛团队构成

- **指导老师**：张教授
- **团队成员**：何宇辰（2025届）、周一帆（2026届）、苏晴（2026届）、陈默（2024届）
- **参赛赛题**：面向复杂业务场景的智能体软件系统开发与工程化实践

## 专家评审评语

“该团队不仅在算法层面深入实现了 RAG 与状态图 Agent 编排，更可贵的是在底层构建了完善的沙箱隔离与监控告警。这是一套具备真正产业级交付水准的优秀学生作品。”

荣誉属于每一位在机房奋斗至深夜的成员，期待项目组再接再厉，在后续赛事中续写辉煌！`,
  },
  {
    id: 'post-4',
    category: '周报',
    title: '项目组研发周报 (2026 第 20 周)：Club OS 官网重构与 OJ 性能压测',
    excerpt: '本周重点推进 Club OS 官网全新信息架构设计与动效重构，OJ 判题内核完成 1000 并发压力测试，实验室预约系统新增人脸/刷卡联动模块。',
    date: '2026.05.18',
    readTime: '4 分钟阅读',
    author: '项目组技术委员会',
    tags: ['研发周报', '架构演进', '交付进展', '项目进度'],
    content: `## 本周主要进展

### 1. Club OS 官网与数字化社区重构
- 确定了全新的 5 大核心板块（关于我们、项目作品、技术与成果、动态博客、加入我们）；
- 首屏引入 Sticky 视差淡出动效，25% 滚动节点触发关于我们入场字动画；
- 移除“进行中”半成品项目，全面提升已上线作品的展示水准；
- “动态与博客”新增侧滑沉浸式抽屉阅读交互。

### 2. 在线判题系统 (OJ) v3.0
- 使用 k6 完成 1,000 QPS 模拟高并发提交压测，判题延迟稳定在 18ms 以内；
- 修复了极端情况下 C++ 内存超限检测偶发不准的问题；
- 优化了排行榜 WebSocket 广播机制。

### 3. 下周规划
- 开启 2026 年夏季招新宣传物料准备；
- 组织算法组与项目组联合开展蓝桥杯考前最后一次模拟赛复盘；
- 启动校园 AI 智能助手 v2.6 的工具插件开放生态规划。`,
  },
]


export const contactInfo = {
  email: 'contact@stcnchu-cs.club',
  adminEmail: 'admin@stcnchu-cs.club',
  github: 'https://github.com/nchu-cs-club',
  wechatMp: '南航科院计算机科技小组',
  qqGroup: '869342150',
  qqAdmin: '2893821042',
  location: '南昌航空大学科技学院 实验实训大楼 · 机房 402（科技小组专属基地）',
  openTime: '周一至周日 08:30 - 22:30 (全天候极客研讨空间)',
}
