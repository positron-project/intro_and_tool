/* ============================================================
   02 / 我们是谁 —— 分组内容数据源
   ------------------------------------------------------------
   首屏下滑越过触发线后，先出现「项目组 / 算法组」二选一选择器；
   选定后由本文件的数据驱动 02 正文区的全部文案。

   约定：一个组的四个关键词编号各自从 01 起，与选择器里的 01 / 02 无关。
   ============================================================ */

export type AboutGroupId = 'project' | 'algorithm'

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
  /** 选择器里的方向与规模 */
  meta: string
  /** 正文区主标题 */
  title: string
  /** 第二视觉焦点：两行醒目短句 */
  quoteLines: [string, string]
  /** 正文段落（两段） */
  paragraphs: [string, string]
  /** 四个关键词 */
  keywords: AboutKeyword[]
}

/* 项目组：逐字沿用 02 原有文案，未作改写 */
const PROJECT_GROUP: AboutGroupContent = {
  id: 'project',
  name: '项目组',
  chapterLabel: 'PROJECT TEAM',
  preview: '产品开发 · 协作交付 · 作品沉淀',
  meta: '7 人 · 前端 / 后端 / 测试 / 部署',
  title: '我们各有特色',
  quoteLines: ['从学习一门技术，', '到真正做出一个东西。'],
  paragraphs: [
    '计算机小组 · 项目组，是一群喜欢技术、也喜欢把想法真正做出来的同学。',
    '我们一起学习、开发和维护属于自己的项目，在实践中积累经验，也把过程中沉淀下来的知识、工具和资源分享给后来的人。',
  ],
  keywords: [
    { en: 'LEARN', num: '01', zh: '学习', hoverText: '我们热爱学习' },
    { en: 'BUILD', num: '02', zh: '创造', hoverText: '我们积极创造' },
    { en: 'SHARE', num: '03', zh: '分享', hoverText: '我们善于分享' },
    { en: 'PASS ON', num: '04', zh: '传承', hoverText: '我们致力传承' },
  ],
}

/* 算法组：与项目组同语气的对称文案，可直接改字 */
const ALGORITHM_GROUP: AboutGroupContent = {
  id: 'algorithm',
  name: '算法组',
  chapterLabel: 'ALGORITHM TEAM',
  preview: '算法训练 · 竞赛 · 模型实践',
  meta: '6 人 · 数据结构 / 机器学习 / Agent',
  title: '我们各有特色',
  quoteLines: ['把问题拆开，', '让答案可以被验证。'],
  paragraphs: [
    '计算机小组 · 算法组，是一群愿意为一道题反复推敲、也愿意把思路讲清楚的同学。',
    '我们从基础算法与数据结构出发，一起打比赛、复现论文、训练模型，并把每次实验的过程、代码和踩过的坑整理下来，交给下一届继续往前推。',
  ],
  keywords: [
    { en: 'THINK', num: '01', zh: '思考', hoverText: '我们先把问题想清楚' },
    { en: 'SOLVE', num: '02', zh: '求解', hoverText: '我们把思路写成代码' },
    { en: 'TUNE', num: '03', zh: '调优', hoverText: '我们反复打磨每个细节' },
    { en: 'REVIEW', num: '04', zh: '复盘', hoverText: '我们把经验复盘给后来的人' },
  ],
}

export const ABOUT_GROUPS: Record<AboutGroupId, AboutGroupContent> = {
  project: PROJECT_GROUP,
  algorithm: ALGORITHM_GROUP,
}

/* 选择器里的左右顺序：左项目组、右算法组 */
export const ABOUT_GROUP_ORDER: AboutGroupId[] = ['project', 'algorithm']
