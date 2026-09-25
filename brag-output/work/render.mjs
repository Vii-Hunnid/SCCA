// Usage: node render.mjs stills 0.8 2.5 ...   |   node render.mjs video
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const FPS = 30;
const here = path.dirname(fileURLToPath(import.meta.url));
const [mode, ...rest] = process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'index.html')).href, { waitUntil: 'networkidle0' });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
});
const fontsOk = await page.evaluate(() => ['Inter', 'JetBrains Mono'].map((f) => `${f}:${document.fonts.check(`500 20px "${f}"`)}`).join(' '));
console.log('fonts', fontsOk);

const shoot = async (t, type = 'png') => {
  await page.evaluate((tt) => window.render(tt), t);
  return page.screenshot({ type, ...(type === 'jpeg' ? { quality: 95 } : {}) });
};

if (mode === 'stills') {
  mkdirSync(path.join(here, 'stills'), { recursive: true });
  for (const s of rest) {
    const t = parseFloat(s);
    await page.evaluate((tt) => window.render(tt), t);
    await page.screenshot({ path: path.join(here, 'stills', `t${t.toFixed(2)}.png`) });
  }
} else {
  const dur = await page.evaluate(() => window.DURATION);
  const n = Math.round(dur * FPS);
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    path.join(here, 'video-silent.mp4')], { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let i = 0; i < n; i++) {
    const buf = await shoot(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('done', n, 'frames');
}
await browser.close();
