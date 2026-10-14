// Usage: node render.mjs <absolute-html-file> <out.png> [viewportWidth]
import { chromium } from 'playwright-core';
const [file, out, width = '1500'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 2 });
await page.goto(`file://${file}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
