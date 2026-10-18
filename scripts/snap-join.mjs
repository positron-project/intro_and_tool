import { spawn } from 'child_process'
import fs from 'fs'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9595

const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=' + port,
  '--window-size=1440,1000',
  'http://localhost:5173/#/home'
])

async function run() {
  await new Promise(r => setTimeout(r, 2000))
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const target = list.find(t => t.type === 'page' && t.url.includes('5173')) || list[0]

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let id = 1; const map = new Map()
  ws.onmessage = e => { const m = JSON.parse(e.data); if (map.has(m.id)) { map.get(m.id)(m.result); map.delete(m.id) } }
  const send = (m, p={}) => new Promise(r => { const c = id++; map.set(c, r); ws.send(JSON.stringify({id:c, method:m, params:p})) })
  await new Promise(r => ws.onopen = r)
  await send('Page.enable')

  // 等待页面完全加载
  await new Promise(r => setTimeout(r, 1200))

  // 1. 滚动到 06 / JOIN US 章节
  await send('Runtime.evaluate', {
    expression: `
      const el = document.getElementById('story-join');
      if (window.__lenis && el) {
        window.__lenis.scrollTo(el, { offset: -70, immediate: true, force: true });
      } else if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    `
  })
  await new Promise(r => setTimeout(r, 1200))
  const shot1 = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-06-join-desktop.png', Buffer.from(shot1.data, 'base64'))

  // 2. 滚动到底部 Footer 区域
  await send('Runtime.evaluate', {
    expression: `
      const footer = document.querySelector('.join-footer-block');
      if (window.__lenis && footer) {
        window.__lenis.scrollTo(footer, { immediate: true, force: true });
      } else if (footer) {
        footer.scrollIntoView({ behavior: 'instant', block: 'end' });
      }
    `
  })
  await new Promise(r => setTimeout(r, 1000))
  const shotFooter = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-06-footer-desktop.png', Buffer.from(shotFooter.data, 'base64'))

  // 3. 测试点击复制 QQ 群交互
  await send('Runtime.evaluate', {
    expression: `
      const btn = document.querySelector('.group-copy-btn');
      if (btn) btn.click();
    `
  })
  await new Promise(r => setTimeout(r, 400))
  const shotCopy = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-06-copy-active.png', Buffer.from(shotCopy.data, 'base64'))

  // 4. 移动端视口测试 (390x844)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  })
  await new Promise(r => setTimeout(r, 600))
  await send('Runtime.evaluate', {
    expression: `
      if (window.__lenis) {
        window.__lenis.resize();
        window.__lenis.scrollTo('#story-join', { immediate: true, force: true });
      } else {
        document.getElementById('story-join')?.scrollIntoView();
      }
    `
  })
  await new Promise(r => setTimeout(r, 1200))
  const mobileShot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-06-join-mobile.png', Buffer.from(mobileShot.data, 'base64'))

  console.log('Join screenshots captured successfully!')
  ws.close()
  proc.kill()
}

run().catch(err => {
  console.error(err)
  proc.kill()
})

