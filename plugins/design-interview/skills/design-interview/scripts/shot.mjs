// Usage: node shot.mjs <out-prefix> --url <http://localhost:PORT/path> [--light] [--step "click:Text" | "wait:ms" | "shot:name" | "scroll:px"]...
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const out = args.shift();
let scheme = 'dark';
let url = 'http://localhost:8081/';
const steps = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--light') scheme = 'light';
  else if (args[i] === '--url') url = args[++i];
  else if (args[i] === '--step') steps.push(args[++i]);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, colorScheme: scheme, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
const page = await context.newPage();
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
let n = 0;
for (const step of steps) {
  const [kind, ...rest] = step.split(':');
  const value = rest.join(':');
  if (kind === 'click') await page.getByText(value, { exact: false }).first().click();
  else if (kind === 'label') await page.getByLabel(value, { exact: false }).first().click();
  else if (kind === 'wait') await page.waitForTimeout(Number(value));
  else if (kind === 'scroll') await page.evaluate((dy) => {
    const all = [...document.querySelectorAll('div')].filter((el) => { const st = getComputedStyle(el); return (st.overflowY === 'auto' || st.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 4 && el.getBoundingClientRect().height > 200; });
    const target = all[all.length - 1];
    if (target) target.scrollTop += dy;
  }, Number(value));
  else if (kind === 'shot') await page.screenshot({ path: `${out}-${value}.png` });
  await page.waitForTimeout(700);
  n++;
}
await page.screenshot({ path: `${out}.png` });
console.log(logs.slice(0, 15).join('\n'));
await browser.close();
