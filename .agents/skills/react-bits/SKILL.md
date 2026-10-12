---
name: react-bits
description: 从 React Bits（reactbits.dev）取现成的动效组件：炫酷背景、动态文字、鼠标跟随、过渡组件。当需求是加 aurora/beams/particles 背景、blur/shiny/gradient 动态文字、spotlight/cursor 跟随、pixel transition、点击特效，或用户提到 React Bits、reactbits、现成特效组件、复制的动效组件时使用。
---

# React Bits

165+ 个动效 React 组件，**没有运行时 npm 包**：源码直接落进仓库，peer 依赖只有你真正用到的那几个（`gsap` / `ogl` / `framer-motion` / `three`）。

```bash
# shadcn registry
npx shadcn@latest add @react-bits/SplitText-TS-CSS
# 或 jsrepo
npx jsrepo add react-bits/TextAnimations/SplitText-TS-CSS
```

变体后缀是 `-<JS|TS>-<CSS|TW>`。**组件名与变体以该组件页给出的 CLI 命令为准**（复制粘贴那一行，不要手拼）。

## 本仓选型：默认 `-TS-CSS`

这条决定 CLI 后缀，是本技能最该记住的一句。

本仓 Tailwind 只是骨架（约束 9：只导 `theme` + `utilities` 两个 layer、**不导 preflight**），且每个组件有自己的同名 CSS（`about-section.css` 这种模式）。所以：

- **`-CSS` 变体自带 `.css` 文件**，与本仓"组件 + 同名 css"的约定一致，且不依赖 preflight。
- **`-TW` 变体假设有完整 preflight + shadcn 主题变量**（`--background` / `--foreground` / `border-border`）。本仓没有 preflight、也没装 shadcn，直接用会出现边框、圆角、文本基线全部对不上。要用就得逐个把 shadcn token 映射到 `--poster-*` 与 `src/styles.css` 的既有变量。
- **不要为了一个组件去装 shadcn**（会引入第二套设计系统，约束 9）。CLI 只用来取源码；它顺手带的 `cn()` / `tailwind-merge` 按需手删。

落位：入口页专属的放 `src/components/home/`；通用特效放 `src/components/motion/`（新建目录时配同名 `.css`）。

## 入口页适配（先读这段，再决定用不用）

React Bits 的强项恰好撞在本仓的禁令上：

- **背景类**（Aurora / Beams / Particles / Ballpit / Silk / Threads / Hyperspeed / Plasma …）本质就是装饰层，而入口页禁装饰、禁多色渐变（约束 8）。要用就得走**全套档**（约束 11）：`frontend-art-direction` + `prototype` + `visualize` 出卡片，并把组件里的多色 gradient **收成单层电光蓝 wash**。唯一允许的蓝渐变是首屏那层柔光，且它必须与 `home-hero-glow.webp` 同层 `multiply`、峰值 ≤20%、不做动画 —— `e2e/home.spec.ts:101-107` 正在断言它。
- **文字类**（Split Text / Blur Text / Shiny Text / Gradient Text / Text Pressure / Count Up / Decrypt Text …）最安全。硬规则：只作用于**非 `.hero-title-line`** 的文本，否则撞 `e2e/home.spec.ts:39-49` 的折行断言（原因见 `gsap` 技能的"高风险点"）。眉标 `.poster-eyebrow` 带 `white-space: nowrap`，别对它做逐词换行。
- **鼠标类**（Click Spark / Magnet / Blob Cursor / Follow Cursor / Splash Cursor / Image Trail / Spotlight / Crosshair …）必须两重开关：`matchMedia('(pointer: fine)')` 为真才启用（触屏没指针），reduced-motion 下禁用。跟随类读 `clientX/Y` 不读 scroll，与 Lenis 无冲突；但 `Image Trail` 这类会在 `document` 上挂全局监听 —— 卸载必须 `removeEventListener`，否则 `StrictMode` 双跑叠两套（`src/main.tsx:14`）。
- **动效组件类**（Animated Content / Glare Hover / Pixel Transition / Stack / Stepper / Tilted Card …）多依赖 `framer-motion`（本仓已装 12.43.0，走 `framer-motion` 入口，见 `framer-motion` 技能），继承它的约定。

## 工具页 / 业务页

那边是旧视觉语言（暖纸 `#faf8f2` + 海军蓝 `#073f73` + 深浅主题开关），React Bits 组件进去不与入口页的电光蓝体系打架，但仍要避免引入 shadcn 那套 token。深色档存在，组件的硬编码色要换成 `var(--…)`。

## 别把它的导出当站点素材

Background Studio / Texture Lab 能导出 png / mp4。按 AGENTS.md 的设计工作流：生成式与导出的图像**只做情绪板，不进站点素材**，页面素材一律用 `public/assets/*` 里的真实资产。要用就用它的 **code 导出**。

## 目录

[catalog.md](catalog.md)：四类组件代表清单 + 每个组件在本仓的适配结论（放行 / 需改造 / 不建议）。

## 验收闸门

```bash
node scripts/snap-sections.mjs 1440x900   # 必须 errors: none，再肉眼复核 viz/section-*.png
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e
pnpm build                                 # 组件自带 ogl/three 时记录 chunk 变化
```
