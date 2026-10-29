// Screenshots for a visual pass. Run from tbv-tools/:  node vre-self-employment-prep/test/shots.mjs <outdir>
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, extname } from 'node:path';
import process from 'node:process';
const execFileP = promisify(execFile);
const PORT = 8921, BASE = `http://localhost:${PORT}/vre-self-employment-prep/`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.argv[2] || '.';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => { try { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const body = await readFile(join(ROOT, p)); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404).end('not found'); } });
await new Promise(r => server.listen(PORT, r));
const shot = async (name, url, w, h) => { await execFileP(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--window-size=${w},${h}`, '--virtual-time-budget=9000', `--screenshot=${join(OUT, name)}`, url]).catch(e => console.log('shot error', name, e.message.slice(0, 200))); console.log('shot', name); };
const SHARE = '?m=idea&r=70&st=not-applied&bt=trade&pl=draft&it=equipment:30000.inventory:15000.licenses:500.training:4000.vehicle:38000.insurance:1400&sb=met&fn=savings&mk=written&lo=home&tr=short&cr=yes&xp=worked&dep=1&ev=rating.dd214.plan.sba&source=vre-self-employment-prep';
try {
  await shot('vsep-first-desktop.png', BASE + '?utm_source=shot', 1280, 2200);
  await shot('vsep-first-mobile.png', BASE + '?utm_source=shot', 390, 2600);
  await shot('vsep-result-desktop.png', BASE + SHARE, 1280, 4200);
  await shot('vsep-result-mobile.png', BASE + SHARE, 390, 4200);
  await shot('vsep-own-desktop.png', BASE + '?m=own&r=60&st=not-applied&op=over12&source=vre-self-employment-prep', 1280, 2400);
} finally { server.close(); }
