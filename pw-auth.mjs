import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto('https://legalcode.ax1access.com');

console.log('>>> Browser open. Log in now...');
// Wait for the app shell to appear (authenticated state)
await page.waitForSelector('text=Templates', { timeout: 120_000 });
await page.waitForTimeout(3000);

await context.storageState({ path: '/tmp/legalcode-auth.json' });
console.log('>>> Auth saved! Taking screenshots...');

const urls = [
  ['https://legalcode.ax1access.com', '/tmp/lc-home.png'],
  ['https://legalcode.ax1access.com/admin', '/tmp/lc-admin.png'],
  ['https://legalcode.ax1access.com/settings', '/tmp/lc-settings.png'],
];

for (const [url, path] of urls) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path, fullPage: true });
    console.log(`>>> Captured ${path}`);
  } catch (e) {
    await page.screenshot({ path, fullPage: true });
    console.log(`>>> Captured ${path} (with timeout warning)`);
  }
}

await browser.close();
