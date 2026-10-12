# React Bits 目录与适配结论

四类，每类给代表组件与本仓结论。**放行**=可直接用（仅需常规验收）；**需改造**=颜色/交互开关要改完才能进；**不建议**=与入口页视觉语言冲突，工具页可用。组件名与 CLI 后缀以站点该组件页为准。

## 文字动效 Text Animations

| 组件                                        | 依赖             | 入口页结论 | 备注                                        |
| ------------------------------------------- | ---------------- | ---------- | ------------------------------------------- |
| Split Text / Blur Text / Shiny Text         | gsap / 纯 CSS    | 放行       | 避开 `.hero-title-line` 与 `.poster-eyebrow` |
| Gradient Text / Curved Loop / Scroll Float  | 纯 CSS           | 需改造     | 渐变只留电光蓝单色                          |
| Text Pressure / Variable Proximity          | 纯 CSS + 指针    | 需改造     | 指针类要 `pointer: fine` 开关                |
| Count Up / Decrypt Text / Scramble Text     | gsap             | 放行       | 数据未就绪显示 `—`（`GrowthStats` 约定）     |
| Rotating Text / True Focus / Circular Text  | framer-motion    | 放行       | 继承 `framer-motion` 技能约定               |
| ASCII Text / Glitch Text / Fuzzy Text       | 纯 CSS           | 不建议     | 故障风与白纸墨黑的海报感冲突                |

## 动画与交互 Animations

| 组件                                       | 依赖           | 入口页结论 | 备注                                                |
| ------------------------------------------ | -------------- | ---------- | --------------------------------------------------- |
| Animated Content / Fade Content            | framer-motion  | 放行       | 用 `once: true`，避免回头重播                        |
| Glare Hover / Tilted Card / Spotlight Card | 纯 CSS         | 需改造     | hover 只能换色或墨黑（约束 8 的 10 处例外清单）      |
| Pixel Transition / Stack / Stepper         | framer-motion  | 放行       | 工具页也可以用                                       |
| Click Spark / Magnet                       | 纯 CSS / canvas | 需改造    | 指针开关 + reduced-motion 开关                       |
| Blob Cursor / Follow Cursor / Splash Cursor | canvas        | 不建议     | 自定义光标会盖掉既有 10 处墨黑 hover 反馈            |
| Image Trail / Crosshair / Ghost Cursor     | canvas        | 不建议     | 全局 `document` 监听，StrictMode 下最容易漏 cleanup  |

## 背景 Backgrounds

一类全是装饰层，入口页一律**不建议**，除非走全套档（约束 11）并改造成单层电光蓝：
Aurora、Beams、Particles、Ballpit、Silk、Threads、Hyperspeed、Plasma、Iridescence、Balatro、Waves、Light Rays、Orb、Ripple Grid、Liquid Chrome、Letter Glitch、Grid Motion、Gradient Blinds、Squares、Dot Grid、Noise。

允许的替代方向：需要"有质感的白"时用 `public/assets/home-hero-glow.webp` 那套思路（3KB 纹理 + `multiply`），而不是引入 shader 背景。工具页 / 业务页不受这条限制，但要注意深色档。

## 组件 Components

Dock、Carousel、Infinite Scroll、Rolling Gallery、Animated List、Folder、Lanyard、Profile Card、Magic Bubbles、Counter —— 多与 navigation / 列表交互有关，**入口页用不上**（入口页是单张海报，不是应用界面）；工具页 / 业务页按需取。

## 取组件时的三条检查

1. **依赖**：装完看 `package.json` 多了什么。`ogl` / `three` 会进主 chunk（约束 1 没有分包），体积要报给 YG。
2. **变体**：默认 `-TS-CSS`；只有确认 `-TW` 变体的类名不依赖 shadcn token 时才用 `-TW`。
3. **清理**：组件自带的 `document` / `window` 监听、`requestAnimationFrame`、`ResizeObserver` 逐条在卸载时撤掉。React 19 `StrictMode` 下不撤就会叠两套。
