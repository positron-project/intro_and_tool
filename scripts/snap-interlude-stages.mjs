import { spawn } from 'child_process'
import fs from 'fs'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9599

const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=' + port,
  '--window-size=1440,900',
  'http://localhost:5174/#/home'
])

async function run() {
  await new Promise(r => setTimeout(r, 2000))
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const target = list.find(t => t.type === 'page' && t.url.includes('5174')) || list[0]

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let id = 1; const map = new Map()
  ws.onmessage = e => { const m = JSON.parse(e.data); if (map.has(m.id)) { map.get(m.id)(m.result); map.delete(m.id) } }
  const send = (m, p={}) => new Promise(r => { const c = id++; map.set(c, r); ws.send(JSON.stringify({id:c, method:m, params:p})) })
  await new Promise(r => ws.onopen = r)
  await send('Page.enable')

  // 等待页面初始加载
  await new Promise(r => setTimeout(r, 1500))

  // 1. 滚动 10% 屏幕 (约 90px)，处于 20% 之前：应只居中显示“我们是谁”
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (window.__lenis) {
        window.__lenis.scrollTo(90, { immediate: true });
      } else {
        window.scrollTo(0, 90);
      }
    })()`
  })
  await new Promise(r => setTimeout(r, 600))
  const shotStage1 = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('stage1-centered-question.png', Buffer.from(shotStage1.data, 'base64'))
  console.log('Saved stage1-centered-question.png (at scroll 90px)')

  // 2. 滚动 25% 屏幕 (约 225px)，越过 20%：居中字淡出，图二从左侧淡入，正文带动态模糊升起
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (window.__lenis) {
        window.__lenis.scrollTo(225, { immediate: true });
      } else {
        window.scrollTo(0, 225);
      }
    })()`
  })
  await new Promise(r => setTimeout(r, 800))
  const shotStage2 = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('stage2-past-20-percent.png', Buffer.from(shotStage2.data, 'base64'))
  console.log('Saved stage2-past-20-percent.png (at scroll 225px)')

  // 3. 滚动到 02 主体完整展示
  await send('Runtime.evaluate', {
    expression: `(() => {
      const about = document.getElementById('story-about');
      if (about) {
        about.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    })()`
  })
  await new Promise(r => setTimeout(r, 1200))
  const shotStage3 = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('stage3-about-full.png', Buffer.from(shotStage3.data, 'base64'))
  console.log('Saved stage3-about-full.png (02 full in view)')

  proc.kill()
  process.exit(0)
}

run().catch(e => {
  console.error(e)
  proc.kill()
  process.exit(1)
})
