---
name: gsap
description: 用 GSAP 做滚动视差、时间轴编排、SVG 描边／变形、文字拆分与页面转场。当需求是 ScrollTrigger 滚动驱动动画、timeline 序列、DrawSVG/MorphSVG/SplitText/Flip、与 Lenis 平滑滚动配合，或用户提到视差 parallax、滚动动画、入场动效、scroll-driven、GSAP 时使用。
---

# GSAP

GSAP 3.13（2025-04-30，Webflow 收购后）起**整套插件免费**，含以前 Club 专享的 SplitText / ScrollTrigger / ScrollSmoother / DrawSVG / MorphSVG / Flip / Observer / ScrambleText / MotionPath / Draggable。全部从 `gsap` 一个包进：

```bash
pnpm add gsap
```

## 本仓三个刹车（先看，它们决定代码怎么写，不是事后检查项）

1. **静态 import**：本仓禁止 `React.lazy` / `import()`（AGENTS 约束 1）。GSAP 与所有插件一律顶层 import，写进主 bundle。
2. **单文件 ≤ 500KB**：动画代码不要堆进 `src/App.tsx`（约束 3）。落 `src/motion/` 或组件同目录的 `*.motion.ts`。
3. **不碰调色板**：入口页只允许纯白 / 墨黑 / 灰阶 + 那 5 个 `--poster-*` 蓝 token（约束 8）。GSAP 补间 `color` / `background` 前先确认目标是 token 值，不是新色值。

## 步骤

1. **接滚动源。** 入口页已在跑 Lenis（`ExpandedHomePage.tsx:84-126`，自驱 rAF，实例挂在 `window.__lenis`）。ScrollTrigger 挂到同一个滚动源上，**不要起第二个 rAF**。做法与三个必错点见 [lenis-scrolltrigger.md](lenis-scrolltrigger.md)。
   完成判据：`window.__lenis` 只有一个实例；滚动时 `ScrollTrigger.update` 的调用频率与 Lenis 帧率同量级（≈60/s）；`ScrollTrigger.getAll().length` 与页面实际 trigger 数一致。
2. **写动画模块。** 一个动画一个模块，导出 `create*` / `use*`，模块内 `gsap.registerPlugin(...)` 只执行一次。
   完成判据：`git diff --stat` 显示 `src/App.tsx` 体积无增长；每个模块自包含、可单独删。
3. **包 cleanup。** React 19 `StrictMode` 已开（`src/main.tsx:14`），dev 下 effect 双跑。用 `gsap.context(fn, scope)` + `ctx.revert()`，或在 effect 返回里 kill 掉所有 tween / timeline / ScrollTrigger。
   完成判据：路由往返 3 次后 `ScrollTrigger.getAll()` 数量不增长；控制台无 "GSAP target not found"。
4. **遵 reduced-motion。** 入口页已有先例：开了 reduced-motion 就不初始化 Lenis（`ExpandedHomePage.tsx:54-55`）。GSAP 侧用 `gsap.matchMedia()` 给 `(prefers-reduced-motion: reduce)` 直接落终态、不补间。
   完成判据：Edge DevTools 里模拟 `prefers-reduced-motion: reduce` 打开 `#/home`，所有元素处于终态、无入场位移。
5. **跑验收闸门。** 完成判据：`snap-sections.mjs` 输出 `errors: none` + `pnpm e2e` 5 个用例全绿 + 肉眼复核 `viz/section-*.png`。

## 验收闸门

```bash
node scripts/snap-sections.mjs 1440x900   # 必须 errors: none，再肉眼复核 viz/section-*.png
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e
```

动了交付链（入口 chunk / 单文件版）再加：

```bash
pnpm build:standalone && pnpm verify:standalone
```

## 五个能力去哪看

| 需求                | 读                                                 |
| ------------------- | -------------------------------------------------- |
| 滚动视差            | [recipes.md](recipes.md#滚动视差)                  |
| 时间轴序列编排      | [recipes.md](recipes.md#时间轴)                    |
| SVG 描边 / 变形     | [recipes.md](recipes.md#svg)                       |
| 文字拆分 SplitText  | [recipes.md](recipes.md#文字拆分)                  |
| 页面转场（hash 路由） | [recipes.md](recipes.md#页面转场)                |
| ScrollTrigger × Lenis 接线 | [lenis-scrolltrigger.md](lenis-scrolltrigger.md) |

## 高风险点

**SplitText 会撞 e2e 的防回归断言。** `e2e/home.spec.ts:39-49` 断言 `.hero-title-line` 的 `scrollWidth` 不超过容器宽度（防单字折行）。拆分把文本改成一堆 `inline-block` 元素，宽度与空格处理都会变。规则：**只拆 `.home-story-scroll` 里非 `.hero-title-line` 的文本**；要动首屏标题，先拆 → 跑 `pnpm e2e` → 红了就回退。拆出的 wrapper 与每个 unit 都得是 `display: inline-block`，父级保留 `white-space: nowrap`。

**首屏那层柔光不许动画。** `.home-hero-viewport` 的蓝渐变是全档唯一允许的渐变，且明确"不做动画"（约束 8）。`e2e/home.spec.ts:101-107` 正在断言它的两层背景（`home-hero-glow.webp` + `radial-gradient`）与 `multiply, normal` 混色。别拿 GSAP 推它的 `opacity` 或 `background-position`。

**hover 淡出用换色，不用父级 `opacity`。** 父级透明度会把 `#2b5cff` 洗成浅蓝（约束 8）。

**同一个元素只归一个动画库。** 入口页组件已经在用 framer-motion（`AboutSection` / `HeroSection` / `PicksSection` …）。GSAP 与 framer-motion 各自记一份 transform 起点，同时对同一元素写 `transform` 会跳帧。一个元素二选一。

## 相关技能

入口页的新视觉方向走**全套档**（约束 11）：`frontend-art-direction` + `prototype` + `visualize`。同族技能：`framer-motion`、`three-js`、`react-bits`。
