import { spawn } from 'child_process'
import fs from 'fs'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9594

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

  // 1. 滚动到 05 / BLOG 章节顶部
  await send('Runtime.evaluate', {
    expression: `
      const el = document.getElementById('story-blog');
      if (window.__lenis && el) {
        window.__lenis.scrollTo(el, { offset: -70, immediate: true, force: true });
      } else if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    `
  })
  await new Promise(r => setTimeout(r, 1200))
  const shot1 = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-05-blog-desktop.png', Buffer.from(shot1.data, 'base64'))

  // 1.5 滚动到 05 / BLOG 底部通栏条目与 Footer
  const scrollResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const el = document.querySelector('.blog-row-article');
        if (el && window.__lenis) {
          window.__lenis.scrollTo(el, { immediate: true, force: true });
          return 'lenis scrolled to el, current scrollY: ' + window.scrollY;
        }
        return 'element not found';
      })()
    `
  })
  console.log('Scroll bottom debug:', scrollResult)
  await new Promise(r => setTimeout(r, 1500))
  const shotBottom = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-05-blog-bottom.png', Buffer.from(shotBottom.data, 'base64'))
  await send('Runtime.evaluate', {
    expression: `
      const featured = document.querySelector('.blog-featured-article');
      if (featured) {
        featured.click();
      }
    `
  })
  await new Promise(r => setTimeout(r, 800))
  const shotDrawer = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-05-blog-drawer.png', Buffer.from(shotDrawer.data, 'base64'))

  // 关闭抽屉
  await send('Runtime.evaluate', {
    expression: `
      const closeBtn = document.querySelector('.drawer-close-btn');
      if (closeBtn) closeBtn.click();
    `
  })
  await new Promise(r => setTimeout(r, 600))

  // 3. 移动端视口测试 (390x844)
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
        window.__lenis.scrollTo('#story-blog', { immediate: true, force: true });
      } else {
        document.getElementById('story-blog')?.scrollIntoView();
      }
    `
  })
  await new Promise(r => setTimeout(r, 1200))
  const mobileShot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-05-blog-mobile.png', Buffer.from(mobileShot.data, 'base64'))

  console.log('Blog screenshots captured successfully!')
  ws.close()
  proc.kill()
}

run().catch(err => {
  console.error(err)
  proc.kill()
})
