# Three.js 配方

## StrictMode 安全的 canvas hook

```ts
// src/motion/use-three-scene.ts
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Build = (ctx: {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  host: HTMLElement
}) => {
  resize?: (width: number, height: number) => void
  update?: (elapsed: number) => void
  dispose: () => void
}

export function useThreeScene<T extends HTMLElement>(build: Build) {
  const hostRef = useRef<T | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.z = 5

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    host.appendChild(renderer.domElement)

    const sceneApi = build({ renderer, scene, camera, host })

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const clock = new THREE.Clock()
    let rafId: number | null = null
    let visible = true

    const renderFrame = () => {
      sceneApi.update?.(clock.getElapsedTime())
      renderer.render(scene, camera)
    }

    /* 进视口才跑循环；reduced-motion 只渲一帧 */
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !reduced && rafId === null) rafId = requestAnimationFrame(loop)
      if (!visible && rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    })
    io.observe(host)

    function loop() {
      rafId = requestAnimationFrame(loop)
      if (visible) renderFrame()
    }

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host
      if (w === 0 || h === 0) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
      sceneApi.resize?.(w, h)
      if (reduced) renderFrame()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    if (reduced) renderFrame()
    else rafId = requestAnimationFrame(loop)

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      io.disconnect()
      ro.disconnect()
      sceneApi.dispose() // 场景内的 geometry / material / texture 在这里统一 dispose
      renderer.dispose()
      renderer.domElement.remove() // 不 remove 就会在 StrictMode 双跑时留下一个死 canvas
    }
  }, [build])

  return hostRef
}
```

要点：`build` 必须是 `useCallback` 稳住的引用，否则 effect 每渲染一次就重建整个 WebGL context。`renderer.setSize(w, h, false)` 的第三参 `false` 表示不改写 canvas 的 CSS 尺寸，交给 CSS 控制。

## 粒子系统

```ts
const COUNT = 20_000
const positions = new Float32Array(COUNT * 3)
const scales = new Float32Array(COUNT)

for (let i = 0; i < COUNT; i++) {
  positions[i * 3 + 0] = (Math.random() - 0.5) * 12
  positions[i * 3 + 1] = (Math.random() - 0.5) * 8
  positions[i * 3 + 2] = (Math.random() - 0.5) * 6
  scales[i] = Math.random()
}

const geometry = new THREE.BufferGeometry()
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))

const material = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false, // 粒子互相遮挡会出方块边，关掉深度写入
  blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 },
    uAccent: { value: new THREE.Color(accentFromToken) },
    uSize: { value: 26 * Math.min(window.devicePixelRatio, 2) },
  },
  vertexShader: /* glsl */ `
    attribute float aScale;
    uniform float uTime;
    uniform float uSize;
    varying float vFade;
    void main() {
      vec3 p = position;
      p.y += sin(uTime * 0.35 + p.x * 0.6) * 0.35;   // 缓慢漂移
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = uSize * aScale / -mv.z;          // 透视缩放
      vFade = 0.25 + 0.75 * aScale;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uAccent;
    varying float vFade;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;                            // 圆形粒子
      gl_FragColor = vec4(uAccent, smoothstep(0.5, 0.1, d) * vFade);
    }
  `,
})

const points = new THREE.Points(geometry, material)
scene.add(points)
// update: material.uniforms.uTime.value = elapsed
// dispose: geometry.dispose(); material.dispose()
```

上万粒子要动就动 `uniforms`，不要每帧改写 `geometry.attributes.position`（后者每帧上传显存）。实例化几何用 `InstancedMesh` + `matrix.makeTranslation(...)`。

## Shader

GLSL（WebGL）：

```ts
const material = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uAccent: { value: accentColor } },
  vertexShader,
  fragmentShader,
})
```

WebGPU / TSL（`three/webgpu`）：

```ts
import * as THREE from 'three/webgpu'
import { Fn, uniform, uv, vec3, mix, time, sin } from 'three/tsl'

const uAccent = uniform(new THREE.Color(accentFromToken))
const material = new THREE.MeshBasicNodeMaterial()
material.colorNode = Fn(() => mix(vec3(1), uAccent, sin(uv().y.mul(3.14).add(time)).mul(0.5).add(0.5)))()

const renderer = new THREE.WebGPURenderer({ antialias: true })
await renderer.init() // 必须 await，否则首帧黑屏
```

WebGPU 分支要留回退：`if (!navigator.gpu) → WebGLRenderer`。TSL 的 `time` 是自动累加的，不要自己传 `uTime` 再两套都写一遍。

## 程序化纹理（单文件版必须）

`file://` 下加载外部图片 / glb 会挂（约束 2）。用 canvas 造：

```ts
function noiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const v = 200 + Math.random() * 55
    data[i * 4 + 0] = data[i * 4 + 1] = data[i * 4 + 2] = v
    data[i * 4 + 3] = 255
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}
```

`<canvas>` 画的图也可以：`new THREE.CanvasTexture(canvasEl)`。这条同时解决了"生成式图像只做情绪板、不进站点素材"（AGENTS.md 设计工作流）—— 程序化纹理天然不进 `public/assets/`。

## dispose 清单

`build` 返回的 `dispose()` 里逐项：

```ts
scene.traverse((obj) => {
  const mesh = obj as THREE.Mesh
  if (!mesh.isMesh && !(obj as THREE.Points).isPoints) return
  mesh.geometry?.dispose()
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const m of mats) {
    for (const key of Object.keys(m)) {
      const value = (m as any)[key]
      if (value && value.isTexture) value.dispose()
    }
    m.dispose()
  }
})
```

外，还要 `renderer.dispose()` 与 `renderer.domElement.remove()`。查看当前活着几个 context：`renderer.info.memory.geometries` / `textures` 应随卸载归零。
