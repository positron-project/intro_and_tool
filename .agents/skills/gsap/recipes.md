# GSAP 配方

## 滚动视差

```ts
// src/motion/parallax.ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function parallaxPlane(plane: HTMLElement, trigger: HTMLElement) {
  return gsap.to(plane, {
    yPercent: -12, // 位移量 = 层深。-8 ~ -18 是本档留白的舒适区，再大就有廉价感
    ease: 'none', // scrub 必须配 ease:'none'；再加缓动曲线会顿
    scrollTrigger: {
      trigger,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.5, // 数值 = 追赶秒数。0 是硬同步；0.3~0.8 才有黏性
      invalidateOnRefresh: true, // 断点 / 字体变化后重算 yPercent 基准
    },
  })
}
```

- 首屏是 `position: sticky`（`.hero-sticky-frame`）。视差层必须是它的**子元素**；动 sticky 元素本身会和 sticky 定位打架。
- `yPercent` 会写 `transform`。同一元素上 CSS 再写 `transform` 会被覆盖 —— 二选一。
- 本档几乎所有动画都只该动 transform / opacity；动 `width` / `top` / `margin` 会触发 layout，与 Lenis 的每帧写入叠加后掉帧。
- 不要给视差层叠 framer-motion 的 `whileInView`。

## 时间轴

```ts
// src/motion/section-intro.ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function sectionIntro(section: HTMLElement) {
  const tl = gsap.timeline({
    defaults: { ease: 'power2.out', duration: 0.5 },
    scrollTrigger: { trigger: section, start: 'top 78%', once: true },
  })

  // '<0.08' = 相对上一段起点延后 0.08s；不写就等于串行
  tl.from(section.querySelectorAll('.poster-eyebrow'), { y: 10, autoAlpha: 0 })
    .from(section.querySelectorAll('.poster-section-title'), { y: 16, autoAlpha: 0 }, '<0.08')
    .from(section.querySelectorAll('[data-reveal]'), { y: 14, autoAlpha: 0, stagger: 0.05 }, '<0.1')

  return tl
}
```

- 用 `autoAlpha`（opacity + visibility），不要单独用 `opacity`：动画结束后元素真的不可见，也不会留下"透明但仍可点击"的坑。
- `once: true`：入场只播一次。全页只有首屏左下角一处滚动指引，回头重播会显得吵。
- 区段行的 hover 是 CSS 的（含有意保留的墨黑 hover，约束 8 例外清单）。GSAP 不接管 hover。
- 触发点写百分比，不写像素。首屏标题行数会随视口变，像素硬编码在窄屏全错。

## SVG

```ts
import gsap from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'

gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin)

/* 描边：从 0 画到满 */
gsap.from('.campus-visual path', {
  drawSVG: '0%',
  duration: 1.1,
  stagger: 0.06,
  ease: 'power1.inOut',
  scrollTrigger: { trigger: '.campus-visual', start: 'top 70%', once: true },
})

/* 变形：两段 path 之间插值，点数不同也能补 */
gsap.to('#shape-a', { morphSVG: '#shape-b', duration: 0.8, ease: 'power2.inOut' })
```

- `CampusVisual.tsx` 是入口页唯一的 SVG 线稿载体，它已经在用 framer-motion。**同一个 path 不要同时被两个库写属性**。
- 线稿色只能取墨黑 / 灰阶 / `--poster-accent`。SVG 的 `stroke` 走 `currentColor` 最省事：在 CSS 里给父级设色，GSAP 只管 `drawSVG`。
- 巨型英文轮廓字属于已删除的装饰层（约束 8），别借 SVG 把它们加回来。

## 文字拆分

```ts
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

/* 3.13 重写后推荐 SplitText.create()（旧的 new SplitText() 仍可用，但没有 mask/smartWrap/aria） */
const split = SplitText.create('.about-group-name', {
  type: 'chars,words',
  mask: 'chars', // 自动套 overflow 容器，位移不会溢出到相邻行
  smartWrap: true, // 窄列自动折行，且不拆断标签
  aria: 'auto', // 给屏幕阅读器留一份原文
})

gsap.from(split.chars, {
  yPercent: 110,
  stagger: { each: 0.02, from: 'start' },
  duration: 0.6,
  ease: 'power3.out',
  scrollTrigger: { trigger: '.about-group-name', start: 'top 80%', once: true },
})

/* cleanup 必做：还原 DOM。否则 React 重渲染时 SplitText 包出的 span 会和 React 抢节点 */
split.revert()
```

**`.hero-title-line` 不许拆。** `e2e/home.spec.ts:39-49` 断言它的 `scrollWidth` 不超过容器宽度（防单字折行），拆分必然改动宽度与空格处理。要动首屏标题：先拆 → `pnpm e2e` → 红了立刻回退。拆出的 wrapper 与每个 unit 都需 `display: inline-block`，父级保留 `white-space: nowrap`。

眉标 `.poster-eyebrow` 带 `white-space: nowrap`，别对它做 `type: 'words'` 的换行拆分（会顶乱左对齐线）。

## 页面转场

本仓是 hash 路由，没有 react-router：`routeFromHash()` / `navigate()` 在 `src/App.tsx`（`routeFromHash` 159，`navigate` 170，`hashchange` 监听 3409），路由分派在 `App.tsx:3449-3490`。

**转场要包在 `.app-shell` 之内**，因为 `.app-shell` 带着 `landing-shell` / `tools-shell` / `site-bg-*` 类，且 `e2e/home.spec.ts:115` 断言它可见。

```tsx
/* App.tsx 路由分派处 */
<AnimatePresence mode="wait" initial={false}>
  <motion.main
    key={route}
    className="route-stage"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.18, ease: 'easeOut' }}
  >
    {renderRoute(route)}
  </motion.main>
</AnimatePresence>
```

- `mode="wait"` 会**延后挂载**新页面（≈ exit 时长）。`e2e/standalone.spec.ts` 校验应用在 `file://` 下真的挂载出来 → 时长压到 0.15–0.2s，且首帧必须 `initial={false}`（这是本仓既有约定，`App.tsx` 里 7 处都用这个组合）。
- `route-stage` 走正常文档流。给它加 `position: absolute` 之类会让 exit 期间滚动高度塌陷，Lenis 会跳到顶部。
- **每次路由切换后 `ScrollTrigger.refresh()`**：新页面高度变了，不刷新的话滚动驱动的 trigger 位置全错。放在转场的 `onExitComplete`，或新页面的 effect 里。
- GSAP 版共享元素转场（列表 → 详情）：点击时 `Flip.getState(sharedEls)`，新页面 `useLayoutEffect` 里 `Flip.from(state, { duration: 0.3, absolute: true })`。入口页没有这类跳转，这条主要给工具页 / 业务页。
- 工具页 / 业务页有深浅主题切换，转场别用背景色补间，两个主题之间插值会路过滤色。
