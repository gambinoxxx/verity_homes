// Usage: node scripts/compare-design.mjs <route> <design-file>
//   e.g. node scripts/compare-design.mjs /properties properties.html
// Needs the app running (npm run dev). Writes side-by-side PNGs to test-results/compare/.
// Signed-in admin pages: COMPARE_STORAGE_STATE=playwright/.auth/admin.json (saved by the e2e
// admin-setup project, TESTING.md §6) opens the app side as that Clerk test user.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [route = "/", designFile = "index.html"] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3000";
const designUrl = pathToFileURL(path.resolve("design", designFile)).href;
const out = path.resolve("test-results/compare");
mkdirSync(out, { recursive: true });

// PW_CHANNEL=chrome uses the installed Google Chrome (see testing/TESTING.md).
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
for (const [w, h, label] of [
  [1440, 900, "desktop"],
  [390, 844, "mobile"],
]) {
  const shots = [];
  for (const [url, name] of [
    [designUrl, "design"],
    [base + route, "app"],
  ]) {
    const page = await browser.newPage({
      viewport: { width: w, height: h },
      reducedMotion: "reduce",
      storageState: name === "app" ? process.env.COMPARE_STORAGE_STATE || undefined : undefined,
    });
    await page.goto(url, { waitUntil: "networkidle" }).catch(() => {});
    // make scroll-reveal content visible in both
    await page.evaluate(() =>
      document.querySelectorAll(".reveal,.reveal-img").forEach((e) => e.classList.add("in")),
    );
    await page.waitForTimeout(800);
    shots.push({ name, buf: await page.screenshot({ fullPage: true }) });
    await page.close();
  }
  // compose side by side in a page (no image libraries needed)
  const page = await browser.newPage({ viewport: { width: w * 2 + 40, height: 900 } });
  const img = (b) => `data:image/png;base64,${b.toString("base64")}`;
  await page.setContent(`<body style="margin:0;display:flex;gap:40px;background:#888;font:bold 20px sans-serif">
    ${shots.map((s) => `<div><div style="padding:8px;background:#000;color:#fff">${s.name.toUpperCase()} · ${label}</div><img src="${img(s.buf)}" style="display:block;width:${w}px"></div>`).join("")}</body>`);
  const file = path.join(out, `${route.replaceAll("/", "_") || "_home"}-${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
  await page.close();
}
await browser.close();
