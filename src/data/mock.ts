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
  { id: 'r1', title: 'FastAPI 学习路线', description: '从路由到依赖注入，完成第一个可部署服务。', category: '后端', type: '学习路线', tags: ['Python', 'FastAPI'], author: '2025 届 · 林同学', updated: '05-15', views: 1240, accent: 'blue', visibility: 'members' },
  { id: 'r2', title: 'Docker 从入门到实践', description: '给项目加上可复制的本地开发与部署环境。', category: 'DevOps', type: '文档', tags: ['Docker', '部署'], author: '2024 届 · 陈同学', updated: '05-14', views: 982, accent: 'mint' },
  { id: 'r3', title: 'LangChain 中文文档整理', description: '小组成员共同维护的 Agent 学习索引。', category: 'Agent', type: 'GitHub', tags: ['LangChain', 'RAG'], author: 'AI 方向组', updated: '05-13', views: 876, accent: 'violet', visibility: 'contributors' },
  { id: 'r4', title: '前端工程化检查清单', description: '从组件、状态到发布，项目启动前先看这一页。', category: '前端', type: '文章', tags: ['React', '工程化'], author: '2026 届 · 周同学', updated: '05-11', views: 614, accent: 'orange' },
  { id: 'r5', title: 'SQL 面试题 100 讲', description: '从查询基础到索引与事务的系统复习卡片。', category: '数据库', type: '课程', tags: ['MySQL', '面试'], author: '后端方向组', updated: '05-09', views: 530, accent: 'rose' },
  { id: 'r6', title: 'Agent Prompt 设计手册', description: '把一个模糊问题拆成可执行、可评估的指令。', category: 'Prompt', type: '文档', tags: ['Prompt', 'Agent'], author: '2025 届 · 何同学', updated: '05-08', views: 488, accent: 'violet' },
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
  { id: 'i1', company: '字节跳动', role: '后端开发实习', author: '陈默', cohort: '2024 届', date: '2025.11', difficulty: '困难', rounds: 3, tags: ['Java', 'Redis', '系统设计'], summary: '从项目架构讲到缓存一致性，重点准备可观测性和取舍。', visibility: 'members' },
  { id: 'i2', company: '腾讯', role: '前端开发实习', author: '周一帆', cohort: '2026 届', date: '2026.03', difficulty: '中等', rounds: 2, tags: ['React', '性能优化', '工程化'], summary: '面试官围绕真实项目追问性能指标与组件抽象。' },
  { id: 'i3', company: '阿里云', role: 'AI 工程师', author: '何宇辰', cohort: '2025 届', date: '2025.10', difficulty: '困难', rounds: 4, tags: ['RAG', '评测', 'Python'], summary: '把一个 Agent 做好，关键是评测集、失败兜底与数据闭环。', visibility: 'contributors' },
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

export const quickActions = [
  { label: '学习路线', description: '系统化学习路径\n从入门到精通', icon: 'route', path: '#/learning', accent: 'blue' },
  { label: '项目库', description: '历届优秀项目\n学习最佳实践', icon: 'rocket', path: '#/projects', accent: 'violet' },
  { label: '比赛中心', description: '竞赛信息 & 报名\n提升实战能力', icon: 'trophy', path: '#/events', accent: 'orange' },
  { label: '资源库', description: '学习资料 & 文档\n一站式资源集合', icon: 'folder', path: '#/resources', accent: 'mint' },
]

export const competitionEvents: CompetitionEvent[] = [
  { id: 'e1', title: '2026 蓝桥杯', type: '省级竞赛', date: '06.18', deadline: '报名截止 06.10', description: '用算法和工程能力，把一个下午变成一次真正的实战。', status: '报名中', accent: 'blue' },
  { id: 'e2', title: '校内 ACM 程序设计竞赛', type: '校内赛', date: '06.01', deadline: '报名截止 05.28', description: '三人一队，和熟悉的队友一起练习思考与协作。', status: '报名中', accent: 'orange' },
  { id: 'e3', title: 'Agent 创意挑战赛', type: '项目赛', date: '07.12', deadline: '开放组队 06.20', description: '把一个校园问题交给 Agent，做出可以被使用的答案。', status: '即将开始', accent: 'violet', visibility: 'members' },
]
