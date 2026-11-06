import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { SHOTS, type Shot } from "./shots";

const OUT_DIR = resolve(
  process.env.SCREENSHOT_OUT_DIR ||
    resolve(__dirname, "../../../../questory-labs.github.io/assets/screenshots"),
);
const WEBP_QUALITY = 0.9;
const LOADING_SELECTOR = '.animate-pulse, [aria-busy="true"], [data-loading="true"]';
const ERROR_TEXT = /something went wrong|server error|not available in the demo/i;

let context: BrowserContext;

async function signIn(page: Page) {
  await page.goto("/");
  const demo = page.getByRole("button", { name: /view demo/i });
  await expect(demo, "No View demo button: enable Demo in Admin → Settings").toBeVisible({
    timeout: 30_000,
  });
  await demo.click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator(LOADING_SELECTOR)).toHaveCount(0, { timeout: 30_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((image) => {
        image.loading = "eager";
        return image.complete
          ? undefined
          : new Promise((done) => {
              image.addEventListener("load", done, { once: true });
              image.addEventListener("error", done, { once: true });
            });
      }),
    );
  });
  await page.waitForTimeout(600);
}

async function hideDemoChrome(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  const banner = page.getByRole("status").filter({ hasText: "Read-only demo" });
  if (await banner.count()) {
    await banner.evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
  }
}

async function toWebp(png: Buffer): Promise<Buffer> {
  const page = await context.newPage();
  try {
    const dataUrl = await page.evaluate(
      async ({ source, quality }) => {
        const bitmap = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${source}`)).blob(),
        );
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
        return canvas.toDataURL("image/webp", quality);
      },
      { source: png.toString("base64"), quality: WEBP_QUALITY },
    );
    return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  } finally {
    await page.close();
  }
}

async function openShot(page: Page, shot: Shot) {
  await page.goto(shot.path);
  if (!shot.linkFrom) return;
  await settle(page);
  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
  const href = hrefs.find((value) => shot.linkFrom?.test(value));
  expect(href, `No link matching ${shot.linkFrom} on ${shot.path}`).toBeTruthy();
  await page.goto(href as string);
}

async function capture(page: Page, shot: Shot) {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    const type = response.request().resourceType();
    if ((type === "fetch" || type === "xhr") && response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  await openShot(page, shot);
  await settle(page);
  await hideDemoChrome(page);
  await expect(page.locator("body")).not.toContainText(ERROR_TEXT);
  expect(failures, `Failed requests on ${shot.id}`).toEqual([]);

  const write = async (id: string, fullPage: boolean) => {
    const png = await page.screenshot({ fullPage, animations: "disabled" });
    writeFileSync(resolve(OUT_DIR, `${id}.webp`), await toWebp(png));
  };
  await write(shot.id, false);
  if (shot.fullPage) await write(`${shot.id}-full`, true);
}

test.beforeAll(async ({ browser, baseURL }) => {
  mkdirSync(OUT_DIR, { recursive: true });
  const { viewport, deviceScaleFactor, colorScheme, contextOptions } = test.info().project.use;
  context = await browser.newContext({
    baseURL,
    viewport,
    deviceScaleFactor,
    colorScheme,
    reducedMotion: contextOptions?.reducedMotion,
  });
  const page = await context.newPage();
  await signIn(page);
  await page.close();
});

test.afterAll(async () => {
  await context?.close();
});

for (const shot of SHOTS) {
  test(shot.id, async () => {
    const page = await context.newPage();
    try {
      await capture(page, shot);
    } finally {
      await page.close();
    }
  });
}
