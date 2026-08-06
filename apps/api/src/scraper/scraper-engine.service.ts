import { Injectable, Logger } from "@nestjs/common";
import { CheerioCrawler } from "@crawlee/cheerio";
import { PlaywrightCrawler } from "@crawlee/playwright";
import {
  renderScraperTemplate,
  type ScraperDefinition,
  type ScraperMacroContext,
} from "@questorylabs/shared";
import {
  ensureScraperCrawleeConfig,
  withIsolatedRequestQueue,
} from "./scraper-crawlee-config";
import { extractPageItems, type ScraperDom } from "./scraper-extract";

export type ScraperPageAction = "continue" | "stop";

export type ScraperRunOptions = {
  maxPages?: number;
  onPage: (
    rows: Record<string, string | null>[],
    page: number,
    url: string,
  ) => Promise<ScraperPageAction>;
};

type RequestUserData = {
  page: number;
};

@Injectable()
export class ScraperEngineService {
  private readonly logger = new Logger(ScraperEngineService.name);

  async run(
    definition: ScraperDefinition,
    macros: ScraperMacroContext,
    options: ScraperRunOptions,
  ): Promise<void> {
    ensureScraperCrawleeConfig();
    const maxPages = Math.min(
      options.maxPages ?? definition.limits.maxPages,
      definition.limits.maxPages,
    );

    if (definition.engine === "playwright") {
      await this.runPlaywright(definition, macros, maxPages, options.onPage);
      return;
    }
    await this.runCheerio(definition, macros, maxPages, options.onPage);
  }

  private buildHeaders(definition: ScraperDefinition): Record<string, string> {
    const headers: Record<string, string> = { ...(definition.headers ?? {}) };
    if (definition.userAgent) {
      headers["User-Agent"] = definition.userAgent;
    }
    return headers;
  }

  private pageUrl(
    definition: ScraperDefinition,
    macros: ScraperMacroContext,
    page: number,
  ): string {
    const ctx = { ...macros, page };
    if (definition.pagination.type === "urlTemplate") {
      return renderScraperTemplate(definition.pagination.urlTemplate, ctx);
    }
    return renderScraperTemplate(definition.startUrl, ctx);
  }

  private async runCheerio(
    definition: ScraperDefinition,
    macros: ScraperMacroContext,
    maxPages: number,
    onPage: ScraperRunOptions["onPage"],
  ): Promise<void> {
    let shouldStop = false;
    const headers = this.buildHeaders(definition);
    const delayMs = definition.limits.requestDelayMs;

    await withIsolatedRequestQueue(async (requestQueue) => {
      const crawler = new CheerioCrawler({
        requestQueue,
        maxRequestsPerMinute: definition.limits.maxRequestsPerMinute,
        maxRequestRetries: definition.limits.maxRetries,
        minConcurrency: 1,
        maxConcurrency: 1,
        requestHandlerTimeoutSecs: 120,
        preNavigationHooks: [
          async ({ request }) => {
            request.headers = { ...request.headers, ...headers };
          },
        ],
        async requestHandler({ $, request }) {
          if (shouldStop) return;
          const userData = request.userData as RequestUserData;
          const page = userData.page;
          const rows = extractPageItems(
            $ as unknown as ScraperDom,
            definition.itemSelector,
            definition.fields,
          );
          const action = await onPage(rows, page, request.url);
          if (action === "stop") {
            shouldStop = true;
            return;
          }

          if (page >= maxPages || shouldStop) return;

          if (definition.pagination.type === "nextLink") {
            const href = $(definition.pagination.nextSelector)
              .first()
              .attr("href");
            if (!href) return;
            const nextUrl = new URL(href, request.url).href;
            await crawler.addRequests([
              {
                url: nextUrl,
                userData: { page: page + 1 } satisfies RequestUserData,
              },
            ]);
            return;
          }

          if (definition.pagination.type === "urlTemplate") {
            const nextPage = page + 1;
            const nextUrl = renderScraperTemplate(
              definition.pagination.urlTemplate,
              { ...macros, page: nextPage },
            );
            await crawler.addRequests([
              {
                url: nextUrl,
                userData: { page: nextPage } satisfies RequestUserData,
              },
            ]);
          }
        },
      });

      const startUrl = this.pageUrl(definition, macros, 1);
      await crawler.run([
        { url: startUrl, userData: { page: 1 } satisfies RequestUserData },
      ]);
    });

    if (delayMs > 0) {
      this.logger.debug(`Cheerio crawl finished (delay config ${delayMs}ms)`);
    }
  }

  private async runPlaywright(
    definition: ScraperDefinition,
    macros: ScraperMacroContext,
    maxPages: number,
    onPage: ScraperRunOptions["onPage"],
  ): Promise<void> {
    let shouldStop = false;
    const headers = this.buildHeaders(definition);

    await withIsolatedRequestQueue(async (requestQueue) => {
      const crawler = new PlaywrightCrawler({
        requestQueue,
        maxRequestsPerMinute: definition.limits.maxRequestsPerMinute,
        maxRequestRetries: definition.limits.maxRetries,
        minConcurrency: 1,
        maxConcurrency: 1,
        requestHandlerTimeoutSecs: 120,
        launchContext: {
          launchOptions: {
            headless: true,
          },
        },
        preNavigationHooks: [
          async ({ page, request }) => {
            if (definition.userAgent) {
              await page.setExtraHTTPHeaders({
                ...headers,
                "User-Agent": definition.userAgent,
              });
            } else if (Object.keys(headers).length) {
              await page.setExtraHTTPHeaders(headers);
            }
            request.headers = { ...request.headers, ...headers };
          },
        ],
        async requestHandler({ page, request, parseWithCheerio }) {
          if (shouldStop) return;
          const userData = request.userData as RequestUserData;
          const pageNum = userData.page;
          const $ = await parseWithCheerio();
          const rows = extractPageItems(
            $ as unknown as ScraperDom,
            definition.itemSelector,
            definition.fields,
          );
          const action = await onPage(rows, pageNum, request.url);
          if (action === "stop") {
            shouldStop = true;
            return;
          }

          if (pageNum >= maxPages || shouldStop) return;

          if (definition.pagination.type === "nextLink") {
            const href = await page
              .locator(definition.pagination.nextSelector)
              .first()
              .getAttribute("href");
            if (!href) return;
            const nextUrl = new URL(href, request.url).href;
            await crawler.addRequests([
              {
                url: nextUrl,
                userData: { page: pageNum + 1 } satisfies RequestUserData,
              },
            ]);
            return;
          }

          if (definition.pagination.type === "urlTemplate") {
            const nextPage = pageNum + 1;
            const nextUrl = renderScraperTemplate(
              definition.pagination.urlTemplate,
              { ...macros, page: nextPage },
            );
            await crawler.addRequests([
              {
                url: nextUrl,
                userData: { page: nextPage } satisfies RequestUserData,
              },
            ]);
          }
        },
        failedRequestHandler({ request, error }) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (
            message.includes("Executable doesn't exist") ||
            message.includes("browserType.launch")
          ) {
            throw new Error(
              "Playwright browser not installed. Run: pnpm --filter @questorylabs/api exec playwright install chromium",
            );
          }
          throw error;
        },
      });

      const startUrl = this.pageUrl(definition, macros, 1);
      await crawler.run([
        { url: startUrl, userData: { page: 1 } satisfies RequestUserData },
      ]);
    });
  }
}
