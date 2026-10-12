---
name: three-js
description: 用 Three.js 做 3D 场景、粒子系统、Shader 与 WebGL/WebGPU 特效。当需求是 canvas 3D、WebGL 渲染、粒子/点云、自定义 shader、three/webgpu、react-three-fiber 场景、程序化纹理，或用户提到 3D、三维、GPU 特效、噪声/流体背景、WebGPU 时使用。
---

# Three.js（本仓尚未安装）

```bash
pnpm add three
pnpm add -D @types/three
# 需要声明式 React 场景再考虑（体积更大，且与约束 1 冲突见下）
pnpm add @react-three/fiber @react-three/drei
```

## 先过两道门，再决定写不写

**门 1：入口页原则上不放 3D。** 入口页的视觉语言是"纯白纸底 + 墨黑 + 电光蓝，装饰性元素一律不加，海报感靠留白与字号层级"（约束 8）。3D 场景天生是装饰层，且 WebGL canvas 吃不到 CSS 变量、很容易带出新配色。要在 `#/home` 上放，先走**全套档**（约束 11）：`frontend-art-direction` + `prototype` + `visualize`，出 token 表与待确认卡片。工具页 / 业务页是旧视觉语言（暖纸 + 海军蓝），没有这条限制。

**门 2：体积是硬成本。** 约束 1 禁止动态 import，three 会整包进主 chunk（min 约 600KB / gzip 约 150KB 起，`three/webgpu` 还要带 TSL）。落地前跑 `pnpm build` 记录入口 chunk 前后数字，并写进交付说明。若把 three 放到只在工具页用到的模块里，主 chunk 依然会涨 —— 这个仓没有分包这条路。

## 硬约束怎么落

- **单一 rAF。** 入口页的 rAF 已经被 Lenis 占了（`ExpandedHomePage.tsx:98-103` 自驱循环）。three 用 `renderer.setAnimationLoop(fn)` 会另起一个循环。要么把 `renderer.render` 折进 Lenis 那个 rAF，要么只放工具页（那里没有 Lenis）。
- **不可见就停。** `IntersectionObserver` 进视口才开循环，出视口 `setAnimationLoop(null)`。省电，也避免后台标签页空转。
- **reduced-motion 只渲一帧。** 判据与 `ExpandedHomePage.tsx:54-55` 同一套：`window.matchMedia('(prefers-reduced-motion: reduce)').matches` 为真时渲一次静态帧就不循环。
- **颜色从 token 取。** WebGL 材质读不到 CSS 变量，用 `getComputedStyle(el).getPropertyValue('--poster-accent').trim()` 读再转 `THREE.Color`，别硬编码新色。入口页可用色只有 5 个 `--poster-*` + 纯白 / 墨黑 / 灰阶。
- **单文件版不能加载外部资产。** `nchu-cs-club-standalone.html` 走 `file://`，没有后端也没有同源（约束 2）。`GLTFLoader` 读 `/assets/*.glb`、`TextureLoader` 读图片都会挂。**几何与纹理必须程序化生成**，或内联成 data URI。
- **cleanup 要全。** `renderer.dispose()`、`geometry.dispose()`、`material.dispose()`、`texture.dispose()`、`ResizeObserver.disconnect()`，并把 canvas 从 DOM 移掉。React 19 `StrictMode` 下 effect 跑两遍（`src/main.tsx:14`），漏一个就泄漏一个 WebGL context —— 浏览器上限约 8~16 个，到顶后整个页面变白。
- **像素比封顶。** `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`。4K 屏 + DPR 3 会直接把帧率砍半。

## 渲染器怎么选

- 默认 `WebGLRenderer`（`three` 主入口），兼容性最好，先跑通它。
- WebGPU：`import { WebGPURenderer } from 'three/webgpu'`，r171（2025-09）起零配置可用，主流浏览器已全绿。顺序是 `new WebGPURenderer()` → `await renderer.init()`，并保留 WebGL 回退。体积与调试成本都更高，只有在 WebGL 真的跑不动时再上。

## 配方

[recipes.md](recipes.md)：StrictMode 安全的 canvas hook / 粒子系统 / shader（含 WebGPU TSL）/ 程序化纹理 / dispose 清单。

## 验收闸门

```bash
node scripts/snap-sections.mjs 1440x900   # 必须 errors: none，再肉眼复核 viz/section-*.png
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e
pnpm build                                 # 记录入口 chunk 体积变化
pnpm build:standalone && pnpm verify:standalone   # 3D 进了交付物就必须跑这条
```

## 相关技能

`frontend-art-direction`（方向与排版）、`prototype`（一次性原型验证观感）、`visualize`（候选方向卡片）。同族技能：`gsap`、`framer-motion`、`react-bits`。
