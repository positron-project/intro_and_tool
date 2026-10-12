/* ============================================================
   02 / 我们各有特色 —— 分组内容数据源
   ------------------------------------------------------------
   2026-10 起 02 改成多组并置，本文件的数据同时驱动各栏：
   栏头（name）→ 组标（chapterLabel）→ 两行短句（quoteLines）
   → 一句短语（motto）→ 栏尾四格（ABOUT_CAPABILITIES）；
   ABOUT_GROUP_ORDER 决定顺序，两个一行的顺序即从左到右。

   约定：一个组的四个关键词编号各自从 01 起。keywords / preview
   两个字段目前没有任何渲染点（改版前的排版用过），保留待用。
   02 现在有四组（项目 / 算法 / 网安 / 行政办），两行两格，正好占满。
   ============================================================ */

export type AboutGroupId = 'project' | 'algorithm' | 'security' | 'admin'

export interface AboutKeyword {
  /** 英文大词（悬停时被扫入色块压在底层，靠 mix-blend-mode 保持可读） */
  en: string
  /** 组内序号 01–04 */
  num: string
  /** 中文释义（悬停后淡出，由 hoverText 取代） */
  zh: string
  /** 扫入覆盖框内的完整文案 */
  hoverText: string
}

export interface AboutGroupContent {
  id: AboutGroupId
  /** 中文组名 */
  name: string
  /** 章节列里的英文组标 */
  chapterLabel: string
  /** 选择器悬浮/聚焦时显示的预览短句 */
  preview: string
  /** 正文区主标题 */
  title: string
  /** 第二视觉焦点：两行醒目短句 */
  quoteLines: [string, string]
  /** 栏内唯一一句短语（4+4 字，逗号分隔），替掉了原来的两段正文 */
  motto: string
  /** 四个关键词 */
  keywords: AboutKeyword[]
}

/* 项目组：逐字沿用 02 原有文案，未作改写 */
const PROJECT_GROUP: AboutGroupContent = {
  id: 'project',
  name: '项目组',
  chapterLabel: 'PROJECT TEAM',
  preview: '做项目，从写代码到部署',
  title: '我们各有特色',
  quoteLines: ['从学习一门技术，', '到做出一个东西。'],
  motto: '热爱技术，创新革新',
  keywords: [
    { en: 'LEARN', num: '01', zh: '学习', hoverText: '不会就问，问完记下来' },
    { en: 'BUILD', num: '02', zh: '创造', hoverText: '先写个能跑的版本' },
    { en: 'SHARE', num: '03', zh: '分享', hoverText: '踩过的坑写进文档' },
    { en: 'PASS ON', num: '04', zh: '传承', hoverText: '下一届接着往上加' },
  ],
}

/* 算法组：与项目组同语气的对称文案，可直接改字 */
const ALGORITHM_GROUP: AboutGroupContent = {
  id: 'algorithm',
  name: '算法组',
  chapterLabel: 'ALGORITHM TEAM',
  preview: '一起打比赛，平时也跑模型',
  title: '我们各有特色',
  quoteLines: ['把问题拆开，', '再一个个验证。'],
  motto: '以赛代练，稳扎稳打',
  keywords: [
    { en: 'THINK', num: '01', zh: '思考', hoverText: '先在纸上推一遍样例' },
    { en: 'SOLVE', num: '02', zh: '求解', hoverText: '想清楚再上手写代码' },
    { en: 'TUNE', num: '03', zh: '调优', hoverText: '一个参数能调一晚上' },
    { en: 'REVIEW', num: '04', zh: '复盘', hoverText: '比赛完写一份总结' },
  ],
}

/* 网安组：栏内短语与大标题按招新 PPT（2019 成立 / CTF 攻防方向）提炼 */
const SECURITY_GROUP: AboutGroupContent = {
  id: 'security',
  name: '网安组',
  chapterLabel: 'SECURITY TEAM',
  preview: '打 CTF，从找洞到拿旗',
  title: '我们各有特色',
  quoteLines: ['找到那个缺口，', '再拿到 flag。'],
  motto: '攻防兼备，见招拆招',
  keywords: [
    { en: 'FIND', num: '01', zh: '发现', hoverText: '先看它哪里不对劲' },
    { en: 'BREAK', num: '02', zh: '利用', hoverText: '把洞变成一条路' },
    { en: 'FIX', num: '03', zh: '修复', hoverText: '知道怎么坏，才知道怎么修' },
    { en: 'REPORT', num: '04', zh: '复盘', hoverText: '打完写一份 writeup' },
  ],
}

/* 行政办：四个事务方向（申请教室 / 批经费 / 申请批假 / 管理考核）按日常工作顺序排 */
const ADMIN_GROUP: AboutGroupContent = {
  id: 'admin',
  name: '行政办',
  chapterLabel: 'ADMIN OFFICE',
  preview: '教室、经费、假条、考核都归它',
  title: '我们各有特色',
  quoteLines: ['把杂事接过来，', '让各组只管往前。'],
  motto: '有求必应，按章办事',
  keywords: [
    { en: 'APPLY', num: '01', zh: '申请', hoverText: '教室先约，再动笔' },
    { en: 'APPROVE', num: '02', zh: '审批', hoverText: '按预算卡着走' },
    { en: 'COORDINATE', num: '03', zh: '协调', hoverText: '时间冲突提前说' },
    { en: 'ASSESS', num: '04', zh: '考核', hoverText: '考核结果会留档' },
  ],
}

export const ABOUT_GROUPS: Record<AboutGroupId, AboutGroupContent> = {
  project: PROJECT_GROUP,
  algorithm: ALGORITHM_GROUP,
  security: SECURITY_GROUP,
  admin: ADMIN_GROUP,
}

/* 栏序：项目组、算法组一行，网安组、行政办另起一行 */
export const ABOUT_GROUP_ORDER: AboutGroupId[] = ['project', 'algorithm', 'security', 'admin']

/* ------------------------------------------------------------
   栏尾的四格 —— 数据源
   每一组栏尾都挂四格：项目组取项目实训方向的四条主线（前端 / 后端 /
   协作 / 管理），算法组取招新 PPT 的四章（赛事 / 赛制 / 算法 / 训练），
   网安组取 CTF 的四个方向（PWN / Reverse / Web / Crypto），
   行政办取四件日常事务（申请教室 / 批经费 / 申请批假 / 管理考核）。
   格内只有图标 + 特性名，不写说明文字。
   id 同时是图标键，图标实现在 AboutSection.tsx 的 CAPABILITY_ICONS。
   image 是悬停时淡入的插画（public/assets/capabilities/），
   路径必须写成字面量：scripts/create-standalone.mjs 靠扫字面量把
   资源转成 data URI，模板字符串拼出来的路径它看不见，单文件版会缺图。
   ------------------------------------------------------------ */
export type AboutCapabilityId =
  | 'frontend'
  | 'backend'
  | 'teamwork'
  | 'management'
  | 'contest'
  | 'rules'
  | 'algorithm'
  | 'training'
  | 'pwn'
  | 'reverse'
  | 'web'
  | 'crypto'
  | 'apply-room'
  | 'apply-budget'
  | 'apply-leave'
  | 'apply-review'

export interface AboutCapability {
  id: AboutCapabilityId
  /** 特性名（≤ 14 字）：一格就这一行字 */
  name: string
  /** 悬停淡入的插画：墨黑单线（纸底已抠成透明），按各自主体外框裁过，整张可见 */
  image: string
}

/* 按组分：键就是 AboutGroupId，栏尾四格按自己的组取 */
export const ABOUT_CAPABILITIES: Record<AboutGroupId, AboutCapability[]> = {
  project: [
    { id: 'frontend', name: '前端开发', image: './assets/capabilities/frontend.webp' },
    { id: 'backend', name: '后端开发', image: './assets/capabilities/backend.webp' },
    { id: 'teamwork', name: '团队协作', image: './assets/capabilities/teamwork.webp' },
    { id: 'management', name: '项目管理', image: './assets/capabilities/management.webp' },
  ],
  algorithm: [
    { id: 'contest', name: '赛事', image: './assets/capabilities/contest.webp' },
    { id: 'rules', name: '赛制', image: './assets/capabilities/rules.webp' },
    { id: 'algorithm', name: '算法', image: './assets/capabilities/algorithm.webp' },
    { id: 'training', name: '训练', image: './assets/capabilities/training.webp' },
  ],
  security: [
    { id: 'pwn', name: 'PWN', image: './assets/capabilities/pwn.webp' },
    { id: 'reverse', name: 'Reverse', image: './assets/capabilities/reverse.webp' },
    { id: 'web', name: 'Web', image: './assets/capabilities/web.webp' },
    { id: 'crypto', name: 'Crypto', image: './assets/capabilities/crypto.webp' },
  ],
  admin: [
    { id: 'apply-room', name: '申请教室', image: './assets/capabilities/apply-room.webp' },
    { id: 'apply-budget', name: '批经费', image: './assets/capabilities/apply-budget.webp' },
    { id: 'apply-leave', name: '申请批假', image: './assets/capabilities/apply-leave.webp' },
    { id: 'apply-review', name: '管理考核', image: './assets/capabilities/apply-review.webp' },
  ],
}
