const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
async function main() {
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, root: path.join(__dirname, 'fixtures'), esbuild: { jsx: 'automatic' }, server: { host: '127.0.0.1', port: 0, fs: { allow: [path.resolve(__dirname, '../..')] } } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(server.resolvedUrls.local[0]);
    for (const placement of ['center', 'left', 'right', 'top', 'bottom']) {
      const trigger = page.getByRole('button', { name: `Open ${placement}`, exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Test dialog' });
      await dialog.waitFor();
      await dialog.evaluate(e => e.getAnimations().forEach(a => a.finish()));
      const box = await dialog.boundingBox();
      const viewport = page.viewportSize();
      if (placement === 'left') assert.equal(Math.round(box.x), 0);
      if (placement === 'right') assert.equal(Math.round(box.x + box.width), viewport.width);
      if (placement === 'top') assert.equal(Math.round(box.y), 0);
      if (placement === 'bottom') assert.equal(Math.round(box.y + box.height), viewport.height);
      assert.equal(await page.locator('body').evaluate(e => e.style.overflow), 'hidden');
      assert.equal(await dialog.getAttribute('class'), `ui-modal ui-modal--${placement}`);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.locator(':focus').textContent(), 'Inside action');
      await page.keyboard.press('Tab');
      assert.equal(await page.locator(':focus').textContent(), 'Close');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await trigger.evaluate(e => e === document.activeElement), true);
      assert.equal(await page.locator('body').evaluate(e => e.style.overflow), '');
    }
    await page.getByRole('button', { name: 'Open center', exact: true }).click();
    await page.mouse.click(1, 1);
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByLabel('Dismiss on backdrop').uncheck();
    await page.getByRole('button', { name: 'Open center', exact: true }).click();
    await page.mouse.click(1, 1);
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    await page.getByRole('button', { name: 'Close Test dialog' }).click();
    await page.getByRole('tab', { name: 'First', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: 'Last' }).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await page.getByRole('tab', { name: 'First', exact: true }).getAttribute('aria-selected'), 'true');
    await page.getByText('More information', { exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('details').evaluate(e => e.open), true);
    assert.deepEqual(errors, []);
    console.log('Shared interaction checks passed: five modal placements, focus trap/restoration, Escape, scroll lock, Tabs keyboard navigation and Accordion activation.');
  } finally { await browser?.close(); await server.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
