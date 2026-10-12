# ScrollTrigger × Lenis 接线

## 先搞清本仓的 Lenis 是什么驱动

`ExpandedHomePage.tsx:98-103` 自己跑 rAF 循环：

```ts
let rafId: number
function raf(time: number) {
  lenis.raf(time)
  rafId = requestAnimationFrame(raf)
}
rafId = requestAnimationFrame(raf)
```

**不是** GSAP ticker 驱动。所以 GSAP 官方文档里"把 Lenis 交给 `gsap.ticker`"那段**不要照抄** —— 那会变成两个 rAF 推同一个 Lenis 实例，滚动抖动，且 `lenis.destroy()` 只停得掉一个循环。

Lenis 默认把插值后的位置写回真实文档滚动，所以 `window.scrollY` 就是平滑后的值（这正是 `ExpandedHomePage.tsx:107` 那条原生 `scroll` 回退监听能生效的原因）。因此 ScrollTrigger 默认的 window 监听**大多数时候已经能用**；显式接 `lenis.on('scroll', ScrollTrigger.update)` 的价值是把刷新时机对齐到 Lenis 的帧，消掉 `scrub` 稳定滞后一帧的抖动。

## 接法

```ts
// src/motion/use-scroll-animation.ts
import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

/* 只做三件事：建 context、把 update 挂到 Lenis 的 scroll、卸载时全撤 */
export function useScrollAnimation(scope: HTMLElement | null | undefined, build: (self: gsap.Context) => void) {
  useEffect(() => {
    if (!scope) return
    const ctx = gsap.context(build, scope)

    const lenis = (window as unknown as { __lenis?: Lenis }).__lenis
    if (!lenis) return () => ctx.revert() // 没有 Lenis（reduced-motion / 非入口页）→ 用原生滚动

    const onScroll = () => ScrollTrigger.update()
    lenis.on('scroll', onScroll)

    /* pin 或内容异步加载后，Lenis 需要重新量文档高度 */
    const onRefresh = () => lenis.resize()
    ScrollTrigger.addEventListener('refresh', onRefresh)

    return () => {
      ScrollTrigger.removeEventListener('refresh', onRefresh)
      lenis.off('scroll', onScroll)
      ctx.revert() // 一并 kill 掉 ctx 内创建的所有 tween / timeline / ScrollTrigger
    }
  }, [scope, build])
}
```

## 三个必错点

- **`scroller` 保持默认。** 别把它设成 Lenis 的 wrapper 元素。Lenis 默认操作 window 滚动，ScrollTrigger 默认也认 window；一旦指到某个 div，所有 `start: 'top center'` 都会错位。
- **接线时机晚于 Lenis 创建。** `window.__lenis` 在 `ExpandedHomePage` 那个 effect 跑完前是 `undefined`。接线要么排在它之后，要么在拿不到实例时**注册一次 `lenis:ready` 之类的自建事件**——不要用轮询 `setTimeout` 兜。
- **anchor 跳转只有一套。** 区段跳转已经在用 `lenis.scrollTo(el, { offset: HEADER_OFFSET, duration, easing })`（`ExpandedHomePage.tsx:174-193`）。不要另外引入 ScrollToPlugin 走另一套缓动，两者插值曲线不同，导航会与滚动动效打架。

## 排查表

| 现象                                   | 原因                                                                  |
| -------------------------------------- | --------------------------------------------------------------------- |
| 滚动时动画卡在起点不动                 | `ScrollTrigger.update` 没接上，或接在了实例创建之前（那时是 undefined） |
| 滚动一切正常但 `scrub` 元素慢半拍      | 少了 `lenis.on('scroll', ScrollTrigger.update)`，刷新排在原生 scroll 事件之后 |
| 滚动顺滑但位置莫名跳                   | 页面里有两个 `new Lenis()`                                           |
| pin 之后后面的区段 start 全错          | pin 插入 spacer 改了文档高度，缺 `ScrollTrigger.refresh()` → `lenis.resize()` |
| reduced-motion 下动效残留位移          | 只给 Lenis 做了降级，GSAP 侧没 `gsap.matchMedia()`                    |
