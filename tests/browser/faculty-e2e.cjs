// End-to-end: the production Next app against a real backend (LMS-78, LMS-79). Nothing is
// intercepted. The admin switches status tabs (All is kept), pages, opens a row menu,
// invites tutors by email, is shown a 409 for an address that already has an account,
// and copies a single-use invitation link.
//
// Needs a running backend (migrated and seeded, EMAIL_TRANSPORT=log or a test SendGrid
// account, a raised RATE_LIMIT_MAX) and:
//   E2E_BACKEND_ORIGIN   e.g. http://127.0.0.1:3000
//   E2E_JWT_SECRET       the backend's JWT_SECRET
//   E2E_ADMIN_TOKEN      access token for an existing admin: faculty.read and faculty.create
//   E2E_TENANT           tenant id in the URL (SINGLE_TENANT_ID), default "amentorz"
//   E2E_SCREENSHOTS      optional folder for screenshots
// Run `npm run build` first. Skips (exit 0) when the variables are missing.
const assert = require("node:assert/strict");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");

const root = path.resolve(__dirname, "../..");
const env = process.env;
const tenant = env.E2E_TENANT || "amentorz";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function freePort() {
  const server = net.createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  await new Promise((r) => server.close(r));
  return port;
}

async function main() {
  const missing = ["E2E_BACKEND_ORIGIN", "E2E_JWT_SECRET", "E2E_ADMIN_TOKEN"].filter((k) => !env[k]);
  if (missing.length) {
    console.log(`Faculty e2e skipped: set ${missing.join(", ")} (see the header of this file).`);
    return;
  }
  const me = await fetch(`${env.E2E_BACKEND_ORIGIN}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${env.E2E_ADMIN_TOKEN}` },
  }).then((r) => r.json());
  const adminEmail = me?.data?.email;
  assert.ok(adminEmail, "E2E_ADMIN_TOKEN must belong to an existing user");

  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  let output = "";
  const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: root,
    env: { ...env, JWT_SECRET: env.E2E_JWT_SECRET, BACKEND_ORIGIN: env.E2E_BACKEND_ORIGIN, SINGLE_TENANT_ID: tenant },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  app.stdout.on("data", (c) => (output += c));
  app.stderr.on("data", (c) => (output += c));
  let browser;
  try {
    for (let i = 0; i < 120; i++) {
      if (app.exitCode !== null) throw new Error(output);
      try {
        if ((await fetch(origin)).status < 500) break;
      } catch {}
      await pause(250);
    }
    browser = await chromium.launch({ headless: true, channel: env.PLAYWRIGHT_CHANNEL || undefined });
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
    await context.addCookies([{ name: "accessToken", value: env.E2E_ADMIN_TOKEN, url: origin, httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const shot = async (name) => env.E2E_SCREENSHOTS && page.screenshot({ path: path.join(env.E2E_SCREENSHOTS, `${name}.png`) });
    const tag = Date.now().toString(36);

    // The dashboard links here with ?filter=Pending
    await page.goto(`${origin}/admin/${tenant}/faculty?filter=Pending`);
    const pending = page.getByRole("tab", { name: /^Pending/ });
    await pending.waitFor();
    assert.equal(await pending.getAttribute("aria-selected"), "true");
    await page.locator(".table-footer, .faculty-empty").first().waitFor();
    await shot("faculty-pending");

    // All profiles is kept and is the default view
    await page.getByRole("tab", { name: /^All profiles/ }).click();
    await page.waitForURL((u) => !u.search.includes("filter="));
    await page.keyboard.press("ArrowRight");
    await page.waitForURL(/filter=pending/);
    for (const name of ["Verified", "Published", "Suspended"]) {
      await page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();
      await page.waitForURL(new RegExp(`filter=${name.toLowerCase()}`));
      // The previous tab's rows stay (dimmed) until the new page arrives
      await page.waitForFunction(
        (label) =>
          !document.querySelector('[aria-busy="true"]') &&
          (document.querySelector(".faculty-empty") ||
            [...document.querySelectorAll("tbody .faculty-status")].every((b) => b.textContent.includes(label))),
        name,
      );
      const badges = await page.locator("tbody .faculty-status").allTextContents();
      assert.ok(badges.every((b) => b.includes(name)), `${name} tab shows only ${name} rows: ${badges}`);
    }
    await page.getByRole("tab", { name: /^All profiles/ }).click();

    // Invite: chips, inline validation, 409 for an existing account, success
    await page.getByRole("button", { name: "Invite tutor" }).click();
    const dialog = page.getByRole("dialog", { name: "Invite tutors" });
    const input = dialog.getByLabel("Email address");
    await dialog.getByRole("button", { name: "Invite", exact: true }).click();
    await dialog.getByText("Enter at least one email address.").waitFor();
    await input.fill(`e2e-${tag}-a@example.com, E2E-${tag}-B@Example.com`);
    await input.press("Enter");
    assert.equal(await dialog.locator(".invite-chip").count(), 2);
    await input.fill("not-an-email");
    await input.press("Enter");
    await dialog.getByText('"not-an-email" is not a valid email address.').waitFor();
    await input.fill(adminEmail);
    await input.press("Enter");
    await shot("faculty-invite-modal");
    await dialog.getByRole("button", { name: "Invite", exact: true }).click();
    await dialog.getByText(`${adminEmail.toLowerCase()} already has an Amentorz account`).waitFor();
    assert.equal(await dialog.locator(".invite-chip--error").count(), 1);
    await shot("faculty-invite-conflict");
    await dialog.getByRole("button", { name: `Remove ${adminEmail.toLowerCase()}` }).click();
    await dialog.getByRole("button", { name: "Invite", exact: true }).click();
    await page.getByText("2 invitations sent").waitFor();
    assert.equal(await dialog.isVisible(), false);
    await page.getByText(`e2e-${tag}-a@example.com`).waitFor();

    // Copy link: one email, no email sent, link on the clipboard
    await page.getByRole("button", { name: "Invite tutor" }).click();
    await input.fill(`e2e-${tag}-link@example.com`);
    await dialog.getByRole("button", { name: /Copy link/ }).click();
    await page.getByText(new RegExp(`Invitation link for e2e-${tag}-link@example.com copied`)).waitFor();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(link, /\/faculty\/onboarding\?token=[A-Za-z0-9_-]{43}$/);

    // Row menu placeholders
    await page.getByRole("button", { name: `Actions for e2e-${tag}-link@example.com` }).click();
    assert.deepEqual(await page.getByRole("menuitem").allTextContents(), ["Resend invitation", "Revoke invitation"]);
    await page.keyboard.press("Escape");

    assert.deepEqual(errors, []);
    console.log("Faculty e2e passed.");
  } finally {
    await browser?.close();
    app.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
