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
    id: 'p1', slug: 'green-easy-fang', name: '绿易坊', description: '面向校园与社区的绿色生活平台', intro: '把「问、估、找、做、聊」放在一条线上：先弄清楚一件东西值多少、该怎么处理，再就近找到愿意接手的人。', githubUrl: 'https://github.com/example/green-easy-fang', docsUrl: '#/resources', demoUrl: 'http://127.0.0.1:18080', issueUrl: 'https://github.com/example/green-easy-fang/issues', stack: ['Vue3', 'Spring Boot', 'MySQL'], members: 3, stars: 46, status: '维护中', difficulty: 3, year: 2026, category: 'Web', accent: 'mint', icon: 'leaf', featured: true, visibility: 'contributors', memberIds: ['m1', 'm2', 'm4'], joinEnabled: true, joinNote: '欢迎熟悉前端交互或服务端接口的成员参与。', coverImage: '/assets/showcase/shop-01-home.webp', milestones: [{ id: 'p1-m1', year: '2026', title: '咨询与估价', summary: '环保咨询 · 图文估价 · 流式回答', status: '已完成' }, { id: 'p1-m2', year: '2026', title: '附近闲置物', summary: '就近匹配 · 闲置发布 · 收藏', status: '已完成' }, { id: 'p1-m3', year: '2026', title: '行动与社区', summary: '绿色行动 · 绿叶值 · 社区内容', status: '已完成' }], logs: [{ id: 'p1-l1', date: '05-16', title: '列表与详情页对齐后端契约', detail: '按后端 VO 字段调整了闲置物与社区内容的取数口径。', author: '何宇辰', authorInitials: 'HY' }, { id: 'p1-l2', date: '05-12', title: '补上三态与空态文案', detail: '每个数据区都给出加载、空、失败三种可执行提示。', author: '周一帆', authorInitials: 'ZY' }],
  },
  {
    id: 'p2', slug: 'lijing', name: '砺境', description: '东方水墨世界里的 AI 学习 RPG', intro: '把一个长期目标拆成今天能做完的一段学习，学完留下证据、写下复盘，再让知识彼此连起来。', githubUrl: 'https://github.com/positron-project/lijing-foundation', demoUrl: 'http://127.0.0.1:4187', stack: ['Node.js', 'PostgreSQL', 'Supabase'], members: 1, stars: 0, status: '维护中', difficulty: 4, year: 2026, category: 'AI', accent: 'blue', icon: 'spark', featured: true, visibility: 'members', coverImage: '/assets/showcase/lijing-01-home.webp', milestones: [{ id: 'p2-m1', year: '2026', title: '水墨世界壳层', summary: '统一视觉与页面转场 · 八卦功能目录', status: '已完成' }, { id: 'p2-m2', year: '2026', title: '学习证据与复盘', summary: '学习证据试点 · 回望复盘 · 知识脉络', status: '已完成' }, { id: 'p2-m3', year: '2026', title: '服务端 AI Gateway', summary: '注册登录 · 配额与审计 · 模板降级', status: '进行中' }],
  },
  {
    id: 'p3', slug: 'lab-booking', name: '实验室设备预约系统', description: '设备预约、使用管理与数据统计', stack: ['Spring Boot', 'Vue3', 'MySQL'], members: 6, stars: 64, status: '维护中', difficulty: 3, year: 2024, category: 'Backend', accent: 'mint', icon: 'calendar', featured: false,
  },
  {
    id: 'p4', slug: 'campus-map', name: '校园地图导航', description: '面向新生的室内外校园路线与地点图谱', stack: ['React', 'Go', 'PostGIS'], members: 7, stars: 53, status: '招募中', difficulty: 3, year: 2026, category: 'Tools', accent: 'orange', icon: 'map',
  },
  {
    id: 'p5', slug: 'vision-lab', name: '实验室视觉识别', description: '轻量化视觉模型在实验室场景的实践', stack: ['PyTorch', 'ONNX', 'Docker'], members: 5, stars: 41, status: '已归档', difficulty: 5, year: 2023, category: 'Algorithm', accent: 'rose', icon: 'scan',
  },
  // 下面四条按 featured + 年份倒序会落在入口页 03 区的 03 / 04 / 05 / 06 位
  {
    id: 'p6', slug: 'acg-hut', name: '次元小屋', description: '按元素分类的动画、漫画与游戏索引站', intro: '看过的动画、漫画和游戏按冰火木水土雷暗分好类，站内快讯和一季新番挂在同一页上。', stack: ['Vue3', 'Node.js', 'MySQL'], members: 2, stars: 12, status: '维护中', difficulty: 2, year: 2026, category: 'Web', accent: 'violet', icon: 'spark', featured: true, coverImage: '/assets/showcase/acg-hut-01-home.webp',
  },
  {
    id: 'p7', slug: 'data-board', name: '数据可视化大屏', description: '大区数据、报警风险与链路速率的同屏看板', intro: '把六个大区的数据量、云端报警和上下游同步速率放进同一屏，一屏看完当天的运行状态。', stack: ['ECharts', 'WebSocket', 'FastAPI'], members: 3, stars: 18, status: '维护中', difficulty: 3, year: 2026, category: 'Tools', accent: 'blue', icon: 'scan', featured: true, coverImage: '/assets/showcase/data-board-01-home.webp',
  },
  {
    id: 'p8', slug: 'genshin-concert', name: '原神音乐会首页', description: '照着官方音乐会页面做的整屏练习稿', intro: '乐团人物摆在中间，四个平台的下载入口压在下方，主要练整屏构图和多端入口的对齐。', stack: ['HTML', 'CSS', 'GSAP'], members: 1, stars: 9, status: '已归档', difficulty: 2, year: 2026, category: 'Web', accent: 'orange', icon: 'map', featured: true, coverImage: '/assets/showcase/genshin-concert-01-home.webp',
  },
  {
    id: 'p9', slug: 'music-app', name: '音乐播放器', description: '手机端的歌单与推荐视频界面', intro: '歌手、热门歌单和推荐歌单排在一条竖线上，往右滑是推荐视频，底部在音乐和视频两个频道之间切。', stack: ['Vue3', 'Web Audio', 'Node.js'], members: 2, stars: 14, status: '维护中', difficulty: 2, year: 2026, category: 'Web', accent: 'rose', icon: 'spark', featured: true, coverImage: '/assets/showcase/music-app-01-home.webp',
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
    title: '把校园 AI 助手的 Agent 从 Prompt 链改成状态图',
    excerpt: '线性链在多分支判断和工具调用失败时不太好处理，我们把它换成了 LangGraph 状态图，记下改的过程和现在还在的问题。',
    date: '2026.05.20',
    readTime: '8 分钟阅读',
    author: '何宇辰 · 2025 届',
    tags: ['Agent', 'LangGraph', 'FastAPI', 'RAG'],
    content: `## 原来的做法

助手最早是一条线性的 Prompt 链：先把问题改写成检索语句，再召回教务文档，最后把召回结果拼进提示词生成回答。链路短，调起来也方便。

放到真实提问上就不够用了。像“帮我查一下这学期的重修报名时间，顺便看看有没有相关的课程”这种问题，一次要判两个意图。链式流程没法在中间决定“这里该去查库、那里该调接口”。

## 改成状态图

我们把流程换成了 LangGraph 的 StateGraph，用一个共享状态在节点之间传数据：用户输入、历史消息、召回到的片段、工具调用次数、最终回答。

节点分成四类：判意图的路由节点、检索节点、执行机房预约和课表这类工具的执行节点，以及检查引用对不对得上的校验节点。

\`\`\`python
class AgentState(TypedDict):
    query: str
    chat_history: List[BaseMessage]
    citations: List[Citation]
    tool_retries: int
    final_response: str
\`\`\`

## 现在还有的问题

- 工具调用要设上限，不然模型会来回试。现在是 5 步封顶。
- 模型返回的 JSON 用 Pydantic 校验，格式不对就重试一次。
- 下游接口不稳时会拖慢整条流程，暂时降级成只查知识库。

## 还没做的

评测集只覆盖了 60 多条真实提问，多轮追问基本没测。这块打算下学期接着补。`,
  },
  {
    id: 'post-2',
    category: '活动记录',
    title: '24 小时黑客松：8 支队伍各自做了什么',
    excerpt: '4 月 15 日到 16 日，32 位成员分成 8 支队伍在机房待了 24 小时。题目自定，唯一的硬要求是结束时演示一个能跑的系统，不写 PPT。',
    date: '2026.04.16',
    readTime: '5 分钟阅读',
    author: '周一帆 · 项目组',
    tags: ['黑客松', '活动复盘', '开源协作'],
    content: `## 规则

4 月 15 日 09:00 到 16 日 09:00，32 个人分成 8 支队伍，在机房 402 待满 24 小时。题目自定，唯一的要求是结束时在测试服上演示一个能跑的东西，不写 PPT。

## 时间线

- 09:00-12:00 定题目，把要做的功能砍到 24 小时能做完。
- 14:00-20:00 写主流程，前后端同时开工。
- 02:00-05:00 联调，主要在处理跨域和接口字段对不上。
- 09:00 演示，8 支队伍都上线了。

## 做出来的东西

- Campus Fast-Drop：局域网里传大文件的工具，用 WebRTC，不占流量。
- Git Commit Linter CLI：检查提交信息格式的命令行工具，给新生用。
- Course Radar：把选课评价汇总起来的查询页。

代码都在小组的 GitHub 组织里，想接着做的可以认领 issue。`,
  },
  {
    id: 'post-3',
    category: '比赛',
    title: '第十五届“中国软件杯”全国总决赛二等奖',
    excerpt: '参赛作品是「基于混合检索与多智能体协同的校园知识中枢系统」，从初赛走到全国总决赛，拿回二等奖。',
    date: '2025.10.28',
    readTime: '3 分钟阅读',
    author: '项目组',
    tags: ['中国软件杯', '比赛', '混合检索'],
    content: `## 比赛

第十五届“中国软件杯”大学生软件设计大赛，参赛作品是《基于混合检索与多智能体协同的校园知识中枢系统》，从初赛走到全国总决赛，最终拿到全国二等奖。

## 队伍

- 指导老师：张教授
- 成员：何宇辰（2025 届）、周一帆（2026 届）、苏晴（2026 届）、陈默（2024 届）
- 赛题方向：面向复杂业务场景的智能体软件系统开发与工程化实践

## 做了什么

系统分三层：混合检索从教务文档里找依据，状态图编排多个智能体分工，最外层是沙箱和监控。答辩时现场跑了几个真实提问，回答里能标出引用到哪份文档。

## 赛后

代码和部署文档整理完会放进项目库。下一届如果继续参赛，可以直接在这套东西上改。`,
  },
  {
    id: 'post-4',
    category: '周报',
    title: '第 20 周：官网改版与 OJ 压测',
    excerpt: '这周在改 Club OS 官网的信息架构和滚动效果，给 OJ 判题内核做了 1000 并发压测，实验室预约接了刷卡。',
    date: '2026.05.18',
    readTime: '4 分钟阅读',
    author: '项目组',
    tags: ['周报', '官网', 'OJ', '压测'],
    content: `## 这周做的事

### 官网
- 板块定为五个：关于我们、项目作品、技术与成果、小组博客、加入我们。
- 首屏做了滚动视差，往下滚时淡出。
- 把“进行中”的项目从作品列表里去掉了，只留能访问的。
- 博客加了从侧边滑出的阅读抽屉。

### 在线判题系统
- 用 k6 压了 1000 QPS 的提交，判题延迟在 18ms 以内。
- 修了 C++ 内存超限检测偶尔判不准的问题。
- 排行榜的 WebSocket 广播改成先聚合再推。

## 下周

- 准备夏季招新的材料。
- 算法组和项目组一起把蓝桥杯模拟赛的题复盘一遍。
- 把校园 AI 助手的工具插件接口定下来。`,
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
