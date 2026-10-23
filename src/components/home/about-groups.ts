/* ============================================================
   02 / 我们各有特色 —— 分组内容数据源
   ------------------------------------------------------------
   2026-10 起 02 改成多组并置，本文件的数据同时驱动各栏：
   栏头（name）→ 组标（chapterLabel）→ 两行短句（quoteLines）
   → 一句短语（motto）→ 栏尾四格（ABOUT_CAPABILITIES）；
   ABOUT_GROUP_ORDER 决定顺序，两个一行的顺序即从左到右。

   02 现在有四组（项目 / 算法 / 网安 / 行政办），两行两格，正好占满。
   ============================================================ */

export type AboutGroupId = 'project' | 'algorithm' | 'security' | 'admin'

export interface AboutGroupContent {
  id: AboutGroupId
  /** 中文组名 */
  name: string
  /** 章节列里的英文组标 */
  chapterLabel: string
  /** 正文区主标题 */
  title: string
  /** 第二视觉焦点：两行醒目短句 */
  quoteLines: [string, string]
  /** 栏内唯一一句短语（4+4 字，逗号分隔），替掉了原来的两段正文 */
  motto: string
}

/* 项目组：逐字沿用 02 原有文案，未作改写 */
const PROJECT_GROUP: AboutGroupContent = {
  id: 'project',
  name: '项目组',
  chapterLabel: 'PROJECT TEAM',
  title: '我们各有特色',
  quoteLines: ['从学习一门技术，', '到做出一个东西。'],
  motto: '热爱技术，创新革新',
}

/* 算法组：与项目组同语气的对称文案，可直接改字 */
const ALGORITHM_GROUP: AboutGroupContent = {
  id: 'algorithm',
  name: '算法组',
  chapterLabel: 'ALGORITHM TEAM',
  title: '我们各有特色',
  quoteLines: ['把问题拆开，', '再一个个验证。'],
  motto: '以赛代练，稳扎稳打',
}

/* 网安组：栏内短语与大标题按招新 PPT（2019 成立 / CTF 攻防方向）提炼 */
const SECURITY_GROUP: AboutGroupContent = {
  id: 'security',
  name: '网安组',
  chapterLabel: 'SECURITY TEAM',
  title: '我们各有特色',
  quoteLines: ['找到那个缺口，', '再拿到 flag。'],
  motto: '攻防兼备，见招拆招',
}

/* 行政办：四个事务方向（申请教室 / 批经费 / 申请批假 / 管理考核）按日常工作顺序排 */
const ADMIN_GROUP: AboutGroupContent = {
  id: 'admin',
  name: '行政办',
  chapterLabel: 'ADMIN OFFICE',
  title: '我们各有特色',
  quoteLines: ['把杂事接过来，', '让各组只管往前。'],
  motto: '有求必应，按章办事',
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
