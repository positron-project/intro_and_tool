import { spawn } from 'child_process'
import fs from 'fs'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9577

const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=' + port,
  '--window-size=1440,900',
  'about:blank'
])

async function run() {
  await new Promise(r => setTimeout(r, 1500))
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const ws = new WebSocket(list[0].webSocketDebuggerUrl)
  let id = 1; const map = new Map()
  ws.onmessage = e => { const m = JSON.parse(e.data); if (map.has(m.id)) { map.get(m.id)(m.result); map.delete(m.id) } }
  const send = (m, p={}) => new Promise(r => { const c = id++; map.set(c, r); ws.send(JSON.stringify({id:c, method:m, params:p})) })
  await new Promise(r => ws.onopen = r)
  await send('Page.enable')

  await send('Page.navigate', { url: 'http://localhost:5174/#/home' })
  await new Promise(r => setTimeout(r, 2000))

  // 诊断各元素位置
  const info = await send('Runtime.evaluate', {
    expression: `(() => {
      const hero = document.getElementById('story-hero');
      const about = document.getElementById('story-about');
      const header = document.querySelector('.site-header');
      const hr = hero ? hero.getBoundingClientRect() : null;
      const ar = about ? about.getBoundingClientRect() : null;
      const hdc = header ? header.getBoundingClientRect() : null;
      return {
        scrollY: window.scrollY,
        innerHeight: window.innerHeight,
        heroRect: hr ? { top: hr.top, height: hr.height } : null,
        aboutRect: ar ? { top: ar.top, height: ar.height } : null,
        headerRect: hdc ? { top: hdc.top, position: window.getComputedStyle(header).position } : null
      };
    })()`,
    returnByValue: true
  })
  console.log('Page info before scroll:', JSON.stringify(info.result.value, null, 2))

  // 执行滚动到 about
  await send('Runtime.evaluate', {
    expression: `(() => {
      const about = document.getElementById('story-about');
      if (about) {
        if (window.__lenis) {
          window.__lenis.scrollTo(about, { offset: 0, immediate: true });
        } else {
          about.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }
    })()`
  })
  await new Promise(r => setTimeout(r, 1000))

  const info2 = await send('Runtime.evaluate', {
    expression: `(() => {
      const hero = document.getElementById('story-hero');
      const about = document.getElementById('story-about');
      const header = document.querySelector('.site-header');
      const hr = hero ? hero.getBoundingClientRect() : null;
      const ar = about ? about.getBoundingClientRect() : null;
      return {
        scrollY: window.scrollY,
        heroRect: hr ? { top: hr.top, height: hr.height, visibility: window.getComputedStyle(hero).visibility } : null,
        aboutRect: ar ? { top: ar.top, height: ar.height } : null,
      };
    })()`,
    returnByValue: true
  })
  console.log('Page info after scroll:', JSON.stringify(info2.result.value, null, 2))

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('about-inspected.png', Buffer.from(shot.data, 'base64'))
  console.log('Saved about-inspected.png')

  proc.kill()
  process.exit(0)
}

run().catch(e => {
  console.error(e)
  proc.kill()
  process.exit(1)
})

