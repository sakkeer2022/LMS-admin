// End-to-end: the production Next app against a real backend and database (ADR-0005).
// Nothing is intercepted: the admin builds and moves categories, is blocked from deleting
// a referenced one, and a learner reaches a bookable leaf with and without board/level.
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
  try {
    for (let i = 0; i < 120; i++) {
      if (app.exitCode !== null) throw new Error(output);
      try { if ((await fetch(origin)).status < 500) break; } catch {}
      await pause(250);
    }
    browser = await chromium.launch({ headless: true, channel: env.PLAYWRIGHT_CHANNEL || undefined });
    const errors = [];
    const as = async (token) => {
      const context = await browser.newContext();
      await context.addCookies([{ name: "accessToken", value: token, url: origin, httpOnly: true, sameSite: "Strict" }]);
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      return page;
    };

    // ── Admin ────────────────────────────────────────────────────────────────
    const admin = await as(env.E2E_ADMIN_TOKEN);
    await admin.goto(`${origin}/admin/${tenant}/categories`);
    const tree = admin.getByRole("tree", { name: "Category tree" });
    await tree.waitFor();
    const item = (name) => tree.getByRole("treeitem", { name, exact: true });
    const panelPath = () => admin.getByLabel("Path").textContent();

    // 1. Build Academics › School
    await admin.getByRole("button", { name: "Add root category" }).first().click();
    let drawer = admin.getByRole("dialog", { name: "Add root category" });
    await drawer.getByLabel("Name").fill("Academics");
    assert.equal(await drawer.getByLabel("Code").inputValue(), "academics");
    await drawer.getByRole("button", { name: "Add category" }).click();
    await drawer.waitFor({ state: "hidden" });
    await item("Academics").waitFor();
    assert.equal(await panelPath(), "Academics");

    await admin.getByRole("button", { name: "+ Add sub-category" }).click();
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
    assert.equal(await admin.getByRole("button", { name: "+ Add sub-category" }).isDisabled(), true, "Add sub-category is disabled on a bookable leaf");
    await admin.getByLabel("Subject").selectOption({ label: "Physics" });
    await admin.getByRole("button", { name: "Add offering" }).click();
    await admin.getByText("Offerings (1 curriculum)").waitFor();

    // 2. Move the branch under Non-academic
    await admin.getByRole("button", { name: "Move", exact: true }).click();
    const move = admin.getByRole("dialog", { name: "Move School" });
    await move.getByLabel("New parent").selectOption({ label: "Non-academic" });
    await move.getByRole("button", { name: "Move", exact: true }).click();
    await move.waitFor({ state: "hidden" });
    await admin.waitForFunction(() => document.querySelector('[aria-label="Path"]')?.textContent === "Non-academic › School");

    // 3. Deleting a referenced category is blocked, with the reason and a way out
    await tree.getByRole("treeitem", { name: "Academic", exact: true }).click();
    await admin.getByRole("button", { name: "Expand all" }).click();
    await item("K-12").click();
    await admin.getByRole("button", { name: "Delete", exact: true }).click();
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
    console.log("Category tree e2e passed: build Academics › School, make it bookable with an offering, move the branch, blocked delete with reason, learner path with and without board/level.");
  } catch (error) {
    console.error(output.slice(-2000));
    throw error;
  } finally {
    await browser?.close();
    app.kill();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
