// End-to-end: the production Next app against a real backend and database (ADR-0005).
// Nothing is intercepted: the admin builds and moves categories, is blocked from deleting
// a referenced one, and a learner reaches a bookable leaf with and without board/level.
// Moving uses reorder mode and a real pointer drag.
//
// Needs a running backend on a freshly seeded database (`prisma migrate deploy`,
// `prisma db seed`, `tsx prisma/seed-demo.ts`) with the catalogue.category_tree flag on and a
// raised global rate limit (for example RATE_LIMIT_MAX=10000), since each run makes a few hundred requests:
//   E2E_BACKEND_ORIGIN   e.g. http://127.0.0.1:3000
//   E2E_JWT_SECRET       the backend's JWT_SECRET (the app verifies the same tokens)
//   E2E_ADMIN_TOKEN      access token: roles [admin], permissions catalogue.read/manage
//   E2E_STUDENT_TOKEN    access token: roles [student]
//   E2E_TENANT           tenant id in the URL (SINGLE_TENANT_ID), default "amentorz"
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
  const missing = ["E2E_BACKEND_ORIGIN", "E2E_JWT_SECRET", "E2E_ADMIN_TOKEN", "E2E_STUDENT_TOKEN"].filter((k) => !env[k]);
  if (missing.length) {
    console.log(`Category tree e2e skipped: set ${missing.join(", ")} (see the header of this file).`);
    return;
  }
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
  const pages = [];
  try {
    for (let i = 0; i < 120; i++) {
      if (app.exitCode !== null) throw new Error(output);
      try { if ((await fetch(origin)).status < 500) break; } catch {}
      await pause(250);
    }
    browser = await chromium.launch({ headless: true, channel: env.PLAYWRIGHT_CHANNEL || undefined });
    const errors = [];
    const as = async (token) => {
      const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      await context.addCookies([{ name: "accessToken", value: token, url: origin, httpOnly: true, sameSite: "Strict" }]);
      const page = await context.newPage();
      pages.push(page);
      if (env.E2E_DEBUG) page.on("console", (m) => console.log("console:", m.type(), m.text()));
      page.on("pageerror", (e) => errors.push(e.message));
      return page;
    };

    // ── Admin ────────────────────────────────────────────────────────────────
    const admin = await as(env.E2E_ADMIN_TOKEN);
    await admin.goto(`${origin}/admin/${tenant}/categories`);
    const tree = admin.getByRole("tree", { name: "Category tree" });
    await tree.waitFor();
    // Row names read "School, 1 sub-category · 6 curricula": match the name before the comma
    const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const item = (name) => tree.getByRole("treeitem", { name: new RegExp(`^${esc(name)},`) });
    const panelPath = () => admin.getByLabel("Path").textContent();

    // 1. Build Academics › School
    await admin.getByRole("button", { name: "Add category", exact: true }).first().click();
    let drawer = admin.getByRole("dialog", { name: "Add root category" });
    await drawer.getByLabel("Name").fill("Academics");
    assert.equal(await drawer.getByLabel("Code").inputValue(), "academics");
    await drawer.getByRole("button", { name: "Add category" }).click();
    await drawer.waitFor({ state: "hidden" });
    await item("Academics").waitFor();
    assert.equal(await panelPath(), "Academics");

    await admin.getByRole("button", { name: "Add sub-category", exact: true }).click();
    drawer = admin.getByRole("dialog", { name: "Add sub-category to Academics" });
    await drawer.getByLabel("Name").fill("School");
    await drawer.getByRole("button", { name: "Add category" }).click();
    await drawer.waitFor({ state: "hidden" });
    await item("School").first().waitFor();
    await admin.waitForFunction(() => document.querySelector('[aria-label="Path"]')?.textContent === "Academics › School");

    // Make the new School a bookable leaf with no board and no level, and give it an offering
    await admin.getByRole("button", { name: "Edit", exact: true }).click();
    drawer = admin.getByRole("dialog", { name: "Edit School" });
    await drawer.getByLabel("Bookable by learners").check();
    await drawer.getByLabel("Requires a level").uncheck();
    await drawer.getByRole("button", { name: "Save changes" }).click();
    await drawer.waitFor({ state: "hidden" });
    await admin.getByText("Learner chooses").waitFor();
    assert.equal(await admin.getByRole("button", { name: "Add sub-category", exact: true }).isDisabled(), true, "Add sub-category is disabled on a bookable leaf");
    await admin.getByLabel("Subject").selectOption({ label: "Physics" });
    await admin.getByRole("button", { name: "Add offering" }).click();
    await admin.getByText("Offerings (1 curriculum)").waitFor();

    // 2. Reorder mode: drag the School branch out of Academics and drop it under Non-academic
    await admin.getByRole("button", { name: "Reorder", exact: true }).click();
    await admin.getByRole("button", { name: "Done reordering" }).waitFor();
    assert.equal(await tree.getByRole("switch").count(), 0, "row actions are hidden while reordering");
    const source = tree.locator("[data-tree-id]", { has: admin.getByText("School", { exact: true }) }).last();
    const target = item("Research & Skill Learning");
    await source.scrollIntoViewIfNeeded();
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    await admin.mouse.move(from.x + 120, from.y + from.height / 2);
    await admin.mouse.down();
    await admin.mouse.move(from.x + 120, from.y + from.height / 2 - 12, { steps: 4 });
    await admin.mouse.move(to.x + 120, to.y + to.height / 2 - 4, { steps: 20 });
    await admin.waitForTimeout(150);
    await admin.mouse.up();
    await admin.waitForFunction(() => [...document.querySelectorAll('[role="treeitem"]')].some((li) =>
      /^School,/.test(li.getAttribute("aria-label") || "") && li.getAttribute("aria-level") === "2"
      && li.previousElementSibling?.getAttribute("aria-label")?.startsWith("Non-academic,")));
    await admin.getByRole("button", { name: "Done reordering" }).click();
    await admin.getByRole("button", { name: "Reorder", exact: true }).waitFor();
    // Persisted: reload and check the path from the server
    await admin.reload();
    await tree.waitFor();
    await admin.getByRole("button", { name: "Expand all" }).click();
    await tree.locator("[data-tree-id]", { has: admin.getByText("School", { exact: true }) }).nth(1).click();
    await admin.waitForFunction(() => document.querySelector('[aria-label="Path"]')?.textContent === "Non-academic › School");

    // 3. Row toggle and details switch act on the same category and stay in sync
    await item("Research & Skill Learning").click();
    await admin.getByRole("switch", { name: "Deactivate Research & Skill Learning" }).first().click();
    await item("Research & Skill Learning").and(admin.locator('[aria-label$="inactive"]')).waitFor();
    assert.equal(await admin.getByRole("switch", { name: "Activate Research & Skill Learning" }).count(), 2, "tree row and details card both show Inactive");
    await admin.getByRole("switch", { name: "Activate Research & Skill Learning" }).last().click();
    await admin.getByRole("switch", { name: "Deactivate Research & Skill Learning" }).first().waitFor();

    // 4. Deleting a referenced category from its row is blocked, with the reason and a way out
    await admin.getByRole("button", { name: "Delete K-12" }).click();
    const del = admin.getByRole("dialog", { name: "Delete K-12" });
    await del.getByText("K-12 cannot be deleted because it has 6 curricula. Deactivate it instead.").waitFor();
    assert.equal(await del.getByRole("button", { name: "Deactivate instead" }).isVisible(), true);
    await del.getByRole("button", { name: "Cancel" }).click();

    // ── Learner ──────────────────────────────────────────────────────────────
    const learner = await as(env.E2E_STUDENT_TOKEN);
    await learner.goto(`${origin}/student/${tenant}`);
    const open = (name) => learner.getByRole("button", { name: new RegExp(`^${name}`) }).click();

    // 4a. Without board or level: Non-academic › School asks only for the subject
    await open("Non-academic");
    await open("School");
    await learner.getByRole("heading", { name: "School" }).waitFor();
    assert.equal(await learner.getByLabel("Board").count(), 0);
    assert.equal(await learner.getByLabel("Level").count(), 0);
    await learner.getByLabel("Subject").selectOption({ label: "Physics" });
    await learner.getByRole("button", { name: "Continue to booking" }).click();
    await learner.getByRole("status").getByText(/^Available\./).waitFor();

    // 4b. With board and level: Academic › School › K-12
    await learner.getByRole("button", { name: "All categories" }).click();
    await open("Academic");
    await open("School");
    await open("K-12");
    await learner.getByLabel("Board").selectOption({ label: "CBSE" });
    await learner.getByLabel("Level").selectOption({ label: "Class 11" });
    await learner.getByLabel("Subject").selectOption({ label: "Physics" });
    await learner.getByRole("button", { name: "Continue to booking" }).click();
    await learner.getByRole("status").getByText(/^Available\./).waitFor();

    assert.deepEqual(errors, []);
    console.log("Category tree e2e passed: build Academics › School, make it bookable with an offering, drag the branch to Non-academic in reorder mode (persists after reload), row and details Active switches in sync, blocked delete from a row with reason, learner path with and without board/level.");
  } catch (error) {
    // E2E_SCREENSHOT_DIR=<dir> saves what each page showed when the run failed
    if (env.E2E_SCREENSHOT_DIR) {
      for (const [i, page] of pages.entries()) await page.screenshot({ path: path.join(env.E2E_SCREENSHOT_DIR, `category-tree-e2e-${i}.png`), fullPage: true }).catch(() => {});
    }
    console.error(output.slice(-2000));
    throw error;
  } finally {
    await browser?.close();
    app.kill();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
