// Screenshot one element of a page at 2x via the Chrome DevTools protocol (no puppeteer needed; Node 22 has WebSocket).
//   node tools/shot-element.mjs <url> <css-selector> <out.png> [padding-px] [js-to-run-first]
// Used for newsletter images: the page may scroll itself on load; a clip capture doesn't care.
import { execFile, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [url, selector, out, padArg, preJs] = process.argv.slice(2);
const PAD = Number(padArg || 12);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, '--window-size=1000,1200', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitPort() { for (let i = 0; i < 50; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch {} await sleep(200); } throw new Error('chrome did not start'); }
try {
  await waitPort();
  const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 1200, deviceScaleFactor: 2, mobile: false });
  await send('Page.navigate', { url });
  await sleep(4500); // module scripts + cross-tool imports
  if (preJs) { await send("Runtime.evaluate", { expression: preJs, awaitPromise: true, returnByValue: true }); await sleep(800); }
  const r = await send('Runtime.evaluate', { expression: `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; if (el.tagName === 'DETAILS') el.open = true; window.scrollTo(0, 0); const b = el.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height }; })()`, returnByValue: true });
  const box = r.result && r.result.result && r.result.result.value;
  if (!box) throw new Error('selector not found: ' + selector);
  await sleep(400);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: Math.max(0, box.x - PAD), y: Math.max(0, box.y - PAD), width: box.w + PAD * 2, height: box.h + PAD * 2, scale: 2 } });
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log(`wrote ${out} (${Math.round(box.w + PAD * 2)}x${Math.round(box.h + PAD * 2)} css px)`);
  ws.close();
} finally { chrome.kill(); }
