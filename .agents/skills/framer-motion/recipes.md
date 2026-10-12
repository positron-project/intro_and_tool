# framer-motion 配方

## 组件切换（本仓标准写法）

```tsx
<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={current.id}
    initial={{ opacity: 0, x: 12 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -12 }}
    transition={{ duration: 0.24, ease: 'easeOut' }}
  >
    {current.body}
  </motion.div>
</AnimatePresence>
```

`key` 变化即触发切换；`x` 用位移而不是 `scale`（缩放会带动文字重排，与 Lenis 的每帧写入叠加后糊）。`initial={false}` 在 `AnimatePresence` 本身上，只压首帧、不影响后续切换。

## 高度自适应（手风琴 / 折叠）

```tsx
<motion.div
  initial={false}
  animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
  transition={{ height: { duration: 0.26, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.18 } }}
  style={{ overflow: 'hidden' }}
>
  {children}
</motion.div>
```

`height: 'auto'` 由 framer-motion 量出来再补间，不需要 `max-height` 猜数值。`initial={false}` 必给，否则首次渲染会从 0 撑开一次。内容异步加载导致变高时补一个 `key` 或 `useEffect` 里 `resize()`。

## 手势：拖拽 + 边界

```tsx
const x = useMotionValue(0)
const rotate = useTransform(x, [-200, 200], [-12, 12])

<motion.div
  drag="x"
  style={{ x, rotate }}
  dragConstraints={{ left: -200, right: 200 }}
  dragElastic={0.16}
  onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 120) dismiss() }}
/>
```

- `drag` 会写 `transform`：**同一元素别再用 CSS `transform` 或 GSAP 接管它**。
- 拖拽元素在滚动容器里要和滚动手势区分：横向拖 `drag="x"`，纵向滚动交给 Lenis。移动端优先 `touch-action: pan-y`。
- 触屏上没有 hover。`whileHover` 的效果在移动端要么去掉，要么用 `whileTap` 兜住核心反馈。
- `cursor: grab` 只在 `matchMedia('(pointer: fine)')` 为真时给。

## 共享元素（layoutId）

```tsx
{/* 列表 */}
<motion.div layoutId={`card-${item.id}`} onClick={() => open(item.id)} />

{/* 详情（另一个组件树里） */}
<AnimatePresence>
  {opened && <motion.div layoutId={`card-${opened.id}`} className="detail-hero" />}
</AnimatePresence>
```

同一时刻 `layoutId` 只能有一个实例；两个组件树里都渲染同一个 id 会互相抢，表现为闪一下再归位。工具页 / 业务页有列表 → 详情跳转，是这条的适用场景；入口页没有。

`layout` 与 `.home-story-scroll` 上的 Lenis 位移一起用时，给最近的定位祖先加 `layoutScroll`，否则测量基准是视口而非滚动容器。

## 滚动联动

```tsx
const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
const y = useTransform(scrollYProgress, [0, 1], ['0%', '-12%'])

<motion.div ref={ref} style={{ y }} />
```

**入口页不要给 `useTransform` 的输出再套 `useSpring`。** Lenis 已经在做位置平滑，再叠一层弹簧就是双重滞后，滚动手感变"糊"。Lenis 未启用（reduced-motion）时才考虑 `useSpring`。

`whileInView` 用 `viewport={{ once: true, amount: 0.25 }}`：

```tsx
<motion.li
  initial={{ opacity: 0, y: 14 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.25 }}
  transition={{ duration: 0.4, ease: 'power2.out' }}
/>
```

`once: true` 避免回头重播（全页只有一处滚动指引，重播会显得吵）；`amount` 收小是为了让 `snap-sections.mjs` 截图时元素已经落位。

## 数字滚动

```tsx
import { animate, useMotionValue, useTransform, motion } from 'framer-motion'

const count = useMotionValue(0)
const rounded = useTransform(count, (v) => Math.round(v).toLocaleString())

useEffect(() => {
  const controls = animate(count, target, { duration: 0.9, ease: 'easeOut' })
  return () => controls.stop()
}, [target, count])

<motion.strong>{rounded}</motion.strong>
```

数据没加载完时显示 `—`（`App.tsx` 的 `GrowthStats` 就是这个约定），别从 0 开始滚一个未知终值。
