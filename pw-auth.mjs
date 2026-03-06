import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto('https://legalcode.ax1access.com');

// Wait for the user to log in — poll for an auth cookie or the app shell
console.log('>>> Waiting for login (up to 120s)...');
try {
  await page.waitForURL('**/templates**', { timeout: 120_000 }).catch(() => {});
  // Give a moment for all cookies to settle
  await page.waitForTimeout(3000);
} catch {
  // timeout is fine, save whatever state we have
}

await context.storageState({ path: '/tmp/legalcode-auth.json' });
console.log('>>> Auth state saved!');

// Now take screenshots of key pages
const pages = [
  ['https://legalcode.ax1access.com', '/tmp/lc-home.png'],
  ['https://legalcode.ax1access.com/templates', '/tmp/lc-templates.png'],
  ['https://legalcode.ax1access.com/admin', '/tmp/lc-admin.png'],
  ['https://legalcode.ax1access.com/settings', '/tmp/lc-settings.png'],
];

for (const [url, path] of pages) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path, fullPage: true });
    console.log(`>>> Captured ${path}`);
  } catch (e) {
    console.log(`>>> Failed ${url}: ${e.message}`);
  }
}

await browser.close();
