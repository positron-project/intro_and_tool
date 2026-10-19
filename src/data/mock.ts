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
    id: 'p1', slug: 'green-easy-fang', name: '绿易坊', description: '面向校园与社区的绿色生活平台', intro: '把「问、估、找、做、聊」放在一条线上：先弄清楚一件东西值多少、该怎么处理，再就近找到愿意接手的人。', githubUrl: 'https://github.com/example/green-easy-fang', docsUrl: '#/resources', demoUrl: 'http://127.0.0.1:18080', issueUrl: 'https://github.com/example/green-easy-fang/issues', stack: ['Vue3', 'Spring Boot', 'MySQL'], members: 3, stars: 46, status: '维护中', difficulty: 3, year: 2026, category: 'other', accent: 'mint', icon: 'leaf', featured: true, visibility: 'contributors', memberIds: ['m1', 'm2', 'm4'], joinEnabled: true, joinNote: '欢迎熟悉前端交互或服务端接口的成员参与。', coverImage: '/assets/showcase/shop-01-home.webp', milestones: [{ id: 'p1-m1', year: '2026', title: '咨询与估价', summary: '环保咨询 · 图文估价 · 流式回答', status: '已完成' }, { id: 'p1-m2', year: '2026', title: '附近闲置物', summary: '就近匹配 · 闲置发布 · 收藏', status: '已完成' }, { id: 'p1-m3', year: '2026', title: '行动与社区', summary: '绿色行动 · 绿叶值 · 社区内容', status: '已完成' }], logs: [{ id: 'p1-l1', date: '05-16', title: '列表与详情页对齐后端契约', detail: '按后端 VO 字段调整了闲置物与社区内容的取数口径。', author: '何宇辰', authorInitials: 'HY' }, { id: 'p1-l2', date: '05-12', title: '补上三态与空态文案', detail: '每个数据区都给出加载、空、失败三种可执行提示。', author: '周一帆', authorInitials: 'ZY' }],
  },
  {
    id: 'p2', slug: 'lijing', name: '砺境', description: '东方水墨世界里的 AI 学习 RPG', intro: '把一个长期目标拆成今天能做完的一段学习，学完留下证据、写下复盘，再让知识彼此连起来。', githubUrl: 'https://github.com/positron-project/lijing-foundation', demoUrl: 'http://127.0.0.1:4187', stack: ['Node.js', 'PostgreSQL', 'Supabase'], members: 1, stars: 0, status: '维护中', difficulty: 4, year: 2026, category: 'other', accent: 'blue', icon: 'spark', featured: true, visibility: 'members', coverImage: '/assets/showcase/lijing-01-home.webp', milestones: [{ id: 'p2-m1', year: '2026', title: '水墨世界壳层', summary: '统一视觉与页面转场 · 八卦功能目录', status: '已完成' }, { id: 'p2-m2', year: '2026', title: '学习证据与复盘', summary: '学习证据试点 · 回望复盘 · 知识脉络', status: '已完成' }, { id: 'p2-m3', year: '2026', title: '服务端 AI Gateway', summary: '注册登录 · 配额与审计 · 模板降级', status: '进行中' }],
  },
  {
    id: 'p3', slug: 'lab-booking', name: '实验室设备预约系统', description: '设备预约、使用管理与数据统计', stack: ['Spring Boot', 'Vue3', 'MySQL'], members: 6, stars: 64, status: '维护中', difficulty: 3, year: 2024, category: 'other', accent: 'mint', icon: 'calendar', featured: false,
  },
  {
    id: 'p4', slug: 'campus-map', name: '校园地图导航', description: '面向新生的室内外校园路线与地点图谱', stack: ['React', 'Go', 'PostGIS'], members: 7, stars: 53, status: '招募中', difficulty: 3, year: 2026, category: 'other', accent: 'orange', icon: 'map',
  },
  {
    id: 'p5', slug: 'vision-lab', name: '实验室视觉识别', description: '轻量化视觉模型在实验室场景的实践', stack: ['PyTorch', 'ONNX', 'Docker'], members: 5, stars: 41, status: '已归档', difficulty: 5, year: 2023, category: 'other', accent: 'rose', icon: 'scan',
  },
  // 下面四条按 featured + 年份倒序会落在入口页 03 区的 03 / 04 / 05 / 06 位
  {
    id: 'p6', slug: 'acg-hut', name: '次元小屋', description: '按元素分类的动画、漫画与游戏索引站', intro: '看过的动画、漫画和游戏按冰火木水土雷暗分好类，站内快讯和一季新番挂在同一页上。', stack: ['Vue3', 'Node.js', 'MySQL'], members: 2, stars: 12, status: '维护中', difficulty: 2, year: 2026, category: 'other', accent: 'violet', icon: 'spark', featured: true, coverImage: '/assets/showcase/acg-hut-01-home.webp',
  },
  {
    id: 'p7', slug: 'data-board', name: '数据可视化大屏', description: '大区数据、报警风险与链路速率的同屏看板', intro: '把六个大区的数据量、云端报警和上下游同步速率放进同一屏，一屏看完当天的运行状态。', stack: ['ECharts', 'WebSocket', 'FastAPI'], members: 3, stars: 18, status: '维护中', difficulty: 3, year: 2026, category: 'other', accent: 'blue', icon: 'scan', featured: true, coverImage: '/assets/showcase/data-board-01-home.webp',
  },
  {
    id: 'p8', slug: 'genshin-concert', name: '原神音乐会首页', description: '照着官方音乐会页面做的整屏练习稿', intro: '乐团人物摆在中间，四个平台的下载入口压在下方，主要练整屏构图和多端入口的对齐。', stack: ['HTML', 'CSS', 'GSAP'], members: 1, stars: 9, status: '已归档', difficulty: 2, year: 2026, category: 'other', accent: 'orange', icon: 'map', featured: true, coverImage: '/assets/showcase/genshin-concert-01-home.webp',
  },
  {
    id: 'p9', slug: 'music-app', name: '音乐播放器', description: '手机端的歌单与推荐视频界面', intro: '歌手、热门歌单和推荐歌单排在一条竖线上，往右滑是推荐视频，底部在音乐和视频两个频道之间切。', stack: ['Vue3', 'Web Audio', 'Node.js'], members: 2, stars: 14, status: '维护中', difficulty: 2, year: 2026, category: 'other', accent: 'rose', icon: 'spark', featured: true, coverImage: '/assets/showcase/music-app-01-home.webp',
  },
]

export const projectCategories: ProjectCategory[] = [
  { id: 'project-cat-other', key: 'other', label: '其他', description: '暂未归入自定义方向的项目', accent: 'blue', icon: 'folder', order: 1, enabled: true, builtIn: true },
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
  { id: 'r1', title: 'FastAPI 学习路线', description: '从路由到依赖注入，完成第一个可部署服务。', category: 'other', type: '学习路线', tags: ['Python', 'FastAPI'], author: '2025 届 · 林同学', updated: '05-15', views: 1240, accent: 'blue', visibility: 'members' },
  { id: 'r2', title: 'Docker 从入门到实践', description: '给项目加上可复制的本地开发与部署环境。', category: 'other', type: '文档', tags: ['Docker', '部署'], author: '2024 届 · 陈同学', updated: '05-14', views: 982, accent: 'mint' },
  { id: 'r3', title: 'LangChain 中文文档整理', description: '小组成员共同维护的 Agent 学习索引。', category: 'other', type: 'GitHub', tags: ['LangChain', 'RAG'], author: 'AI 方向组', updated: '05-13', views: 876, accent: 'violet', visibility: 'contributors' },
  { id: 'r4', title: '前端工程化检查清单', description: '从组件、状态到发布，项目启动前先看这一页。', category: 'other', type: '文章', tags: ['React', '工程化'], author: '2026 届 · 周同学', updated: '05-11', views: 614, accent: 'orange' },
  { id: 'r5', title: 'SQL 面试题 100 讲', description: '从查询基础到索引与事务的系统复习卡片。', category: 'other', type: '课程', tags: ['MySQL', '面试'], author: '后端方向组', updated: '05-09', views: 530, accent: 'rose' },
  { id: 'r6', title: 'Agent Prompt 设计手册', description: '把一个模糊问题拆成可执行、可评估的指令。', category: 'other', type: '文档', tags: ['Prompt', 'Agent'], author: '2025 届 · 何同学', updated: '05-08', views: 488, accent: 'violet' },
]

export const resourceCategories: ContentCategory[] = [
  { id: 'resource-cat-other', key: 'other', label: '其他', description: '暂未归入自定义方向的资源', accent: 'blue', icon: 'folder', order: 1, enabled: true, builtIn: true },
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


// 离线演示版（.env.standalone / mock 源）只放几条代表性赛事：
// 一条正在报名、一条赛程待定、一条已结束，覆盖卡片与详情的主要状态。
// 线上真实赛事以数据库 competitions 表为准，不在这里重复维护。
export const competitionEvents: CompetitionEvent[] = [
  {
    id: 'competition-qwb',
    title: '第十届强网杯全国网络安全挑战赛',
    seriesName: '强网杯',
    type: '信息安全',
    organizer: '河南省委网信办、河南省教育厅、郑州市人民政府、信息工程大学、郑州大学',
    officialUrl: 'https://www.qiangwangbei.com/',
    lifecycle: 'published',
    date: '',
    deadline: '',
    description: '报名即日起至 10 月下旬（暂定）。线上赛 10 月下旬，线下赛 11 月下旬在郑州，另设车联网、具身智能、量子与抗量子等专项赛道。',
    status: '报名中',
    accent: 'rose',
    visibility: 'public',
    tracks: [
      { id: 'qwb-online', name: '线上赛（挑战赛）', format: '团队，≤10 人 + 1 名领队', teamSize: '10', audience: '国内高校、企业、机构，须中国国籍', description: '线上解题赛，考二进制逆向、密码分析、智能终端安全、信息隐藏、人工智能安全等方向，前 32 名进入线下赛。', requirements: '每队不超过 10 名队员 + 1 名指导教师（领队）；须中国国籍（不含港澳台）。', awards: '一等奖 3 万/队、二等奖 2 万/队、三等奖 1 万/队' },
      { id: 'qwb-offline', name: '线下赛', format: '团队，≤4 人 + 1 名领队', teamSize: '4', audience: '线上赛前 32 名队伍', description: '郑州现场攻防赛，赛题含 Web 漏洞挖掘、固件漏洞、大模型安全、物联网设备现场破解等。', requirements: '由线上赛晋级队伍自行挑选，每队不超过 4 名队员 + 1 名指导教师。', awards: '冠军 15 万、亚军 10 万、季军 8 万' },
    ],
  },
  {
    id: 'competition-4c-2027',
    title: '2027 年第二十届中国大学生计算机设计大赛',
    seriesName: '中国大学生计算机设计大赛',
    type: '综合设计',
    organizer: '中国大学生计算机设计大赛组织委员会',
    officialUrl: 'https://jsjds.blcu.edu.cn/',
    lifecycle: 'published',
    date: '',
    deadline: '',
    description: '面向在校本科生，按大类分组评审，走校级赛、省级赛、国家级赛三级。通常 1 月发预通知、3 月发正式通知。',
    status: '即将报名',
    accent: 'violet',
    visibility: 'public',
    tracks: [
      { id: '4c-software', name: '软件应用与开发', format: '团队，2–9 人', teamSize: '2–9', audience: '同一院校在籍本科生', description: '交付一套可运行的软件系统，覆盖 Web、移动端、管理信息系统、工具软件等，评审看功能完整度与现场演示。', requirements: '同校 2–9 名本科生组队；作品须当届周期内原创；国赛答辩不少于 2 人。', awards: '国赛一、二、三等奖' },
      { id: '4c-ai', name: '人工智能应用', format: '团队，2–9 人', teamSize: '2–9', audience: '同一院校在籍本科生', description: '把机器学习或大模型能力落到真实场景，重点在问题定义、数据合规与效果验证。', requirements: '同校 2–9 名本科生；AI 工具须符合组委会当年指定清单。', awards: '国赛一、二、三等奖' },
      { id: '4c-media', name: '数媒类（静态 / 动漫短片 / 游戏交互）', format: '团队，2–9 人', teamSize: '2–9', audience: '同一院校在籍本科生', description: '分别做平面视觉、动画叙事与可玩原型。每年指定传统文化主题。', requirements: '须符合当届公布的传统文化主题；使用地图须标注审图号与来源。', awards: '国赛一、二、三等奖' },
    ],
  },
  {
    id: 'competition-cumcm-2026',
    title: '2026 年全国大学生数学建模竞赛（CUMCM）',
    seriesName: '全国大学生数学建模竞赛',
    type: '数学建模',
    organizer: '中国工业与应用数学学会',
    officialUrl: 'https://www.mcm.edu.cn/',
    eventStart: '2026-09-10T18:00',
    eventEnd: '2026-09-13T20:00',
    lifecycle: 'published',
    date: '2026-09-10T18:00',
    deadline: '',
    description: '2026 年共 1962 所院校、89516 支队伍报名，赛题于 9 月 10 日 18:00 发布、9 月 13 日 20:00 截止提交。',
    status: '已结束',
    accent: 'blue',
    visibility: 'public',
    tracks: [
      { id: 'cumcm-undergrad', name: '本科组', format: '团队，3 人一队', teamSize: '3', audience: '在校本科生（研究生不得参加）', description: '从工程、社科、经管等领域的实际问题中抽象出数学模型，完成假设、建模、求解、检验，交一篇完整论文。', requirements: '每队不超过 3 人且必须同校；每队最多 1 名指导教师且竞赛期间不得参与讨论。', awards: '全国一等奖、二等奖；各赛区另设奖项' },
      { id: 'cumcm-vocational', name: '高职高专组', format: '团队，3 人一队', teamSize: '3', audience: '高职高专学生', description: '与本科组同题同赛制、单独评奖，题目更偏工程应用。', requirements: '仅高职高专学生可报本组，也可选择本科组。', awards: '全国及赛区分级评奖' },
    ],
  },
]

export const blogPosts: import('../types').BlogPost[] = [
  {
    id: 'post-1',
    category: '技术文章',
    title: 'hello world',
    excerpt: '测试消息',
    date: '2026.10.12',
    readTime: '1 分钟阅读',
    author: '项目组',
    tags: ['测试'],
    content: '测试消息',
  },
]


export const contactInfo = {
  email: 'contact@stcnchu.com',
  adminEmail: 'admin@stcnchu.com',
  github: 'https://github.com/positron-project',
  wechatMp: '南航科院计算机科技小组',
  qqGroup: '1074753902',
  qqAdmin: '2893821042',
  location: '南昌航空大学科技学院 实验实训大楼 · 机房 402（科技小组专属基地）',
  openTime: '周一至周日 08:30 - 22:30 (全天候极客研讨空间)',
}
