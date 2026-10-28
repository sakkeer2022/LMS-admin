const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

async function main() {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const apiRequests = [], errors = [];
    page.on('request', request => { if (request.url().includes('/api/v1/')) apiRequests.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    const base = 'http://127.0.0.1:3001';
    async function visit(url) {
      try { await page.goto(url); }
      catch (error) {
        // Next dev can reload the document while compiling a route for the first time.
        if (!String(error).includes('ERR_ABORTED')) throw error;
        await page.goto(url);
      }
    }
    await page.goto(`${base}/admin/dev-admin/dashboard`);
    await page.waitForURL('**/login');
    await page.getByText(/Development login · Username: admin/).waitFor();
    await page.getByLabel('Email or development username').fill('admin');
    await page.locator('input[name="password"]').fill('wrong');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText('Invalid development username or password.').waitFor();
    await page.locator('input[name="password"]').fill('Admin@123');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/admin/dev-admin/dashboard');
    await page.getByRole('navigation', { name: 'admin navigation' }).waitFor();
    await page.locator('.app-header').waitFor();
    await page.getByText('Total users', { exact: true }).waitFor();
    await page.reload();
    await page.getByRole('navigation', { name: 'admin navigation' }).waitFor();
    const links = await page.locator('nav[aria-label="admin navigation"] a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    for (const href of links) {
      await visit(base + href);
      await page.getByRole('navigation', { name: 'admin navigation' }).waitFor();
      assert.ok(page.url().includes('/admin/dev-admin/'));
      if (href.endsWith('/users')) await page.getByText(/Development session: live users are unavailable/).waitFor();
    }
    const otherTab = await context.newPage();
    await otherTab.goto(`${base}/admin/dev-admin/dashboard`);
    await otherTab.waitForURL('**/login');
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await page.waitForURL('**/login');
    await page.goto(`${base}/admin/dev-admin/dashboard`);
    await page.waitForURL('**/login');
    assert.deepEqual(apiRequests, []);
    assert.deepEqual(errors, []);
    console.log(`Development login browser checks passed: validation, login, refresh, ${links.length} admin pages, tab isolation, logout, no backend calls or browser errors.`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
