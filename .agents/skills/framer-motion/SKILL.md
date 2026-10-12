---
name: framer-motion
description: 用 framer-motion（本仓已装 12.43.0）做 React 组件动效、手势交互、组件切换与布局动画。当需求是 motion.div 的 animate/whileHover/whileTap/whileInView、AnimatePresence 进出场、layout/layoutId 共享元素、useScroll/useSpring 联动、drag 手势、数字滚动，或用户提到动效、过渡、微交互、手势、布局动画时使用。
---

# framer-motion

本仓已装 `framer-motion@12.43.0`（`package.json`），入口页 8 个组件 + `App.tsx` 都在用。**沿用 `framer-motion` 这个 import 路径**，不要迁到 `motion/react` —— v12 两个入口并存，混用会把同一份运行时打进 bundle 两遍。

全局配置在 `src/main.tsx:15`：`<MotionConfig reducedMotion="user">` 已包住整棵树。**reduced-motion 由框架处理，不用自己判**；默认行为是"关 transform、保留 opacity"，要改默认（比如整段不动）就在组件上用 `useReducedMotion()` 覆盖。

## 本仓约定

1. **`AnimatePresence` 一律 `mode="wait" initial={false}`。** `App.tsx` 里 7 处（1111 / 1116 / 1200 / 1540 / 2653 / 2698 / 2711）全是这个组合：`wait` 防进出场重叠，`initial={false}` 让首屏不做入场、只在后续切换时动。
2. **别把 `layout` 动画的祖先当滚动容器。** `layout` / `layoutId` 靠 `getBoundingClientRect` 定位，与 Lenis 的位移叠加会算错。`layoutScroll` 只在元素自己就是 scroll 容器时加；入口页的滚动在 `.home-story-scroll` 上，别往它上面加。
3. **不用 `LazyMotion`。** 约束 1 禁 `import()` / `React.lazy`，而 `LazyMotion` + `m` 的核心收益就是按需加载 feature bundle。本仓用完整 `motion` 组件。
4. **入口页没有深色档**（约束 10）：`src/components/home/**` 里不要用 `data-theme` / `prefers-color-scheme` 驱动 variants。
5. **有 10 处控件的 hover 已定稿为墨黑**（约束 8 例外清单：`.site-nav-item`、`.about-group-tab`、`.picks-copy-btn`、`.join-copy-btn`、`.site-tools-btn`、`.blog-footer-link`、`.drawer-close-btn`、项目组选中墨黑块）。动它们前先确认。`ProjectCard` 那种 `whileHover={{ y: -4 }}` 属于工具页 / 业务页，不属于入口页。
6. **强调色淡出用换色，不用父级 `opacity`**：父级透明度会把 `#2b5cff` 洗成浅蓝（约束 8）。

## 配方

[recipes.md](recipes.md)：组件切换 / 高度自适应 / 手势拖拽 / 共享元素 / 滚动联动 / 数字滚动。

## 验收闸门

```bash
node scripts/snap-sections.mjs 1440x900   # 必须 errors: none，再肉眼复核 viz/section-*.png
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e
```

动了交付链（入口 chunk / 单文件版）再加 `pnpm build:standalone && pnpm verify:standalone`。

## 高风险点

**`whileInView` 的触发点与 e2e 截图时机。** `snap-sections.mjs` 逐节截图时若内容还在位移中，截到的是中间帧。`once: true` + `amount` 收小（0.2~0.3），入场时长控制在 0.4s 内。

**首屏标题不接受宽度变化。** `e2e/home.spec.ts:39-49` 断言 `.hero-title-line` 的 `scrollWidth` 不超容器宽度。给标题加 `letterSpacing` / `scale` / 拆字都会动宽度，先跑 `pnpm e2e`。

**StrictMode 双跑。** `src/main.tsx:14` 开着 `StrictMode`，dev 下 effect 跑两遍。挂在 `document` / `window` 上的全局手势监听必须在 cleanup 里 `removeEventListener`，否则叠两套。

## 相关技能

入口页新视觉方向走**全套档**（约束 11）：`frontend-art-direction` + `prototype` + `visualize`。同族技能：`gsap`、`three-js`、`react-bits`。
