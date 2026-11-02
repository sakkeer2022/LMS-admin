// Runs the production application with browser-intercepted auth responses and a
// test-only backend profile server. No production auth bypass or live credentials.
const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE_PATH || "playwright",
);
const root = path.resolve(__dirname, "../..");
const profile = {
  id: "test-user",
  email: "person@example.test",
  fullName: "Person Test",
  mobileNumber: null,
  isActive: true,
  emailVerified: true,
  roles: [{ id: "role-admin", name: "admin", permissions: [{ name: "*" }] }],
};
const envelope = (data) => ({ success: true, message: "OK", data });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server.address().port;
}

async function main() {
  let browser, app, page;
  const backend = http.createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(envelope(profile)));
  });
  const backendPort = await listen(backend);
  const reservation = net.createServer();
  const port = await listen(reservation);
  await new Promise((resolve) => reservation.close(resolve));
  let output = "";
  try {
    app = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "-p",
        String(port),
        "-H",
        "127.0.0.1",
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          BACKEND_ORIGIN: `http://127.0.0.1:${backendPort}`,
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    app.stdout.on("data", (chunk) => {
      output += chunk;
    });
    app.stderr.on("data", (chunk) => {
      output += chunk;
    });
    const origin = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (app.exitCode !== null) throw new Error(output);
      try {
        if ((await fetch(origin)).ok) {
          ready = true;
          break;
        }
      } catch {}
      await pause(250);
    }
    assert(ready, `Application did not start: ${output}`);
    browser = await chromium.launch({
      headless: true,
      channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    });
    const context = await browser.newContext();
    page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.error("Browser error:", error.message);
    });
    let attempts = 0,
      mode = "reject",
      release,
      received;
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (pathname.endsWith("/csrf-token"))
        return route.fulfill({ json: envelope({ csrfToken: "test-csrf" }) });
      if (pathname.endsWith("/refresh"))
        return route.fulfill({
          status: 401,
          json: { success: false, message: "Refresh token is required" },
        });
      if (pathname.endsWith("/login")) {
        attempts++;
        received = request.postDataJSON();
        assert.equal(request.headers()["x-csrf-token"], "test-csrf");
        if (mode === "pending")
          await new Promise((resolve) => {
            release = resolve;
          });
        if (mode !== "success")
          return route.fulfill({
            status: 422,
            json: {
              success: false,
              message: "Please use a different email.",
              errors: { email: ["Email is unavailable"] },
            },
          });
        return route.fulfill({ json: envelope({ user: profile }) });
      }
      if (pathname.endsWith("/users"))
        return route.fulfill({
          json: {
            ...envelope([profile]),
            meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
          },
        });
      return route.fulfill({ json: envelope(profile) });
    });
    const noOverflow = async () =>
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        "Unexpected document overflow",
      );
    await page.goto(`${origin}/login?redirect=//evil.test`);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByText("Please correct the highlighted fields.").waitFor();
    assert.equal(attempts, 0);
    assert.equal(await page.locator(":focus").getAttribute("name"), "email");
    await page.getByLabel(/^Email/).fill("Person@Example.test");
    await page.getByLabel(/^Password/).fill("legacy-password");
    await page.keyboard.press("Tab");
    assert.equal(
      await page.locator(":focus").getAttribute("aria-label"),
      "Show password",
    );
    await page.keyboard.press("Space");
    assert.equal(
      await page.getByLabel(/^Password/).getAttribute("type"),
      "text",
    );
    await page.getByRole("button", { name: "Hide password" }).click();
    mode = "pending";
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByRole("button", { name: "Please wait…" }).waitFor();
    assert(
      await page.getByRole("button", { name: "Please wait…" }).isDisabled(),
    );
    assert(await page.getByLabel(/^Email/).isDisabled());
    assert.equal(attempts, 1);
    mode = "reject";
    release();
    await page.getByText("Email is unavailable", { exact: true }).waitFor();
    assert.equal(await page.locator(":focus").getAttribute("name"), "email");
    assert.equal(received.email, "person@example.test");
    assert.equal(
      await page.getByLabel(/^Email/).getAttribute("aria-invalid"),
      "true",
    );
    await fs.mkdir(path.join(root, "test-results"), { recursive: true });
    await page.screenshot({
      path: path.join(root, "test-results/auth-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 320, height: 740 });
    await noOverflow();
    await page.screenshot({
      path: path.join(root, "test-results/auth-mobile.png"),
      fullPage: true,
    });
    mode = "success";
    // The mocked login sets no cookie, so give the browser the access cookie the edge gate needs
    await context.addCookies([
      {
        name: "accessToken",
        value: [{ alg: "none" }, { exp: Math.floor(Date.now() / 1000) + 600 }]
          .map((part) => Buffer.from(JSON.stringify(part)).toString("base64url"))
          .join(".") + ".x", // the edge gate only reads the expiry
        url: origin,
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL(`${origin}/admin/dashboard`); // unsafe redirect remains rejected
    assert.equal(received.email, "person@example.test");
    await page.goto(`${origin}/admin/account`);
    await page.getByText("Person Test · person@example.test").waitFor();
    await page.goto(`${origin}/recovery`);
    await page.getByRole("heading", { name: "Password recovery" }).waitFor();
    assert.equal(await page.locator("form").count(), 0);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${origin}/admin`);
    await page.waitForURL(`${origin}/admin/dashboard`);
    console.log(
      "Dashboard browser environment:",
      await page.evaluate(() => ({
        online: navigator.onLine,
        visibility: document.visibilityState,
        ready: document.readyState,
      })),
    );
    await page.getByText("Total users", { exact: true }).waitFor();
    await noOverflow();
    await page.screenshot({
      path: path.join(root, "test-results/dashboard-desktop.png"),
      fullPage: true,
    });
    await page.locator(".filter-menu summary").click();
    await page.getByLabel("Status", { exact: true }).selectOption("Completed");
    await page.waitForURL(/status=Completed/);
    await page
      .getByRole("cell", { name: "Completed", exact: true })
      .first()
      .waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow();
    const toggle = page.getByRole("button", { name: "Toggle sidebar" });
    await toggle.click();
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await page.locator(":focus").getAttribute("aria-label"),
      "Log out",
    );
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(":focus").getAttribute("class"), "brand");
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator(":focus").getAttribute("aria-label"),
      "Toggle sidebar",
    );
    await page.screenshot({
      path: path.join(root, "test-results/dashboard-mobile.png"),
      fullPage: true,
    });
    await page.goto(`${origin}/admin/users`);
    await page.getByRole("cell", { name: profile.email }).waitFor();
    await page.getByLabel("Search users", { exact: true }).fill("Person");
    await noOverflow();
    assert.equal(
      await page.getByRole("button", { name: "Previous" }).isDisabled(),
      true,
    );
    await page.addStyleTag({
      content:
        ".ui-button { border-radius: 11px; } .ui-input { border-radius: 13px; }",
    });
    assert.equal(
      await page
        .getByRole("button", { name: "Previous" })
        .evaluate((element) => getComputedStyle(element).borderRadius),
      "11px",
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Toggle sidebar" })
        .evaluate((element) => getComputedStyle(element).borderRadius),
      "11px",
    );
    assert.equal(
      await page
        .getByLabel("Search users")
        .evaluate((element) => getComputedStyle(element).borderRadius),
      "13px",
    );
    assert.equal(
      await page
        .locator(".navigation-search input")
        .evaluate((element) => getComputedStyle(element).borderRadius),
      "13px",
    );
    await page.goto(`${origin}/admin/faculty`);
    await page.getByText("Anjali Deshpande", { exact: true }).waitFor();
    await page.getByRole("button", { name: /^Pending/ }).click();
    await page.waitForURL(/filter=Pending/);
    await page.getByLabel("Filter subject").selectOption("Physics");
    await page.waitForURL(/subject=Physics/);
    await page.getByText("Anjali Deshpande", { exact: true }).waitFor();
    await noOverflow();
    await page.goto(`${origin}/admin/settings`);
    await page
      .locator("header").getByRole("heading", { name: "Settings", exact: true })
      .waitFor();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('.shell').evaluate(element => { element.dataset.persistence = 'retained'; });
    const destinations = [
      ['Dashboard', 'dashboard'], ['Users', 'users'], ['Faculty', 'faculty'],
      ['Categories & Content', 'categories'], ['Pricing', 'pricing'],
      ['Bookings', 'bookings'], ['Reviews', 'reviews'], ['Progress Reports', 'progress'],
      ['Reports', 'reports'], ['Payouts', 'payouts'], ['Settings', 'settings'],
    ];
    for (const [title, suffix] of destinations) {
      console.log('Checking admin destination:', title);
      await page.getByRole('navigation', { name: 'admin navigation', exact: true }).getByRole('link', { name: title, exact: true }).click();
      await page.waitForURL(`${origin}/admin/${suffix}`);
      await page.locator('header').getByRole('heading', { name: title, exact: true }).waitFor();
      assert.equal(await page.locator('nav [aria-current="page"]').count(), 1);
      assert.equal(await page.locator('.shell').getAttribute('data-persistence'), 'retained');
      await noOverflow();
    }
    await page.goBack();
    await page.waitForURL(`${origin}/admin/payouts`);
    await page.goForward();
    await page.waitForURL(`${origin}/admin/settings`);
    await page.reload();
    await page.locator('header').getByRole('heading', { name: 'Settings', exact: true }).waitFor();
    await page.goto(`${origin}/admin`);
    await page.waitForURL(`${origin}/admin/dashboard`);
    await page.goto(`${origin}/admin/unknown/deep`);
    await page.locator('main').getByRole('heading', { name: 'Page not found' }).waitFor();
    await page.getByRole("button", { name: "Use dark theme" }).click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.getByRole("button", { name: "Use light theme" }).click();
    assert.deepEqual(errors, [], "Client errors during UI checks");
    console.log(
      "Browser checks passed: auth validation/422/pending/success, CSRF headers, safe redirects, keyboard reveal, registration contract, recovery/settings, dashboard/faculty filters, drawer focus/Escape, table controls, theme switching, shared style propagation, desktop/mobile overflow.",
    );
  } catch (error) {
    console.error('Next server output:', output);
    if (page) {
      await fs.mkdir(path.join(root, "test-results"), { recursive: true });
      await page.screenshot({
        path: path.join(root, "test-results/failure.png"),
        fullPage: true,
      });
      console.error(await page.locator("body").ariaSnapshot());
    }
    throw error;
  } finally {
    await browser?.close();
    app?.kill();
    await new Promise((resolve) => backend.close(resolve));
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
