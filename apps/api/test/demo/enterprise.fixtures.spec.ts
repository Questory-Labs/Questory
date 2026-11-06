import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_CURATE_QUESTIONS,
  DEMO_READ_POST_PATHS,
  isDemoReadPost,
} from "@questorylabs/shared";
import { findDemoRoute } from "../../src/demo/demo.routes";
import type { DemoRoute } from "../../src/demo/demo.types";
import { adminEnterpriseRoutes } from "../../src/demo/fixtures/admin-enterprise";
import { enterpriseRoutes } from "../../src/demo/fixtures/enterprise";
import { DEMO_GAMES, steamHeaderUrl } from "../../src/demo/fixtures/helpers";
import {
  BudgetSchema,
  SHAPED_ROUTES,
} from "./enterprise.schemas";

const ROUTES: readonly DemoRoute[] = [...enterpriseRoutes, ...adminEnterpriseRoutes];
const GAME_NAMES = new Set<string>(DEMO_GAMES.map((game) => game.name));

function call(
  method: "GET" | "POST",
  path: string,
  options: { body?: unknown; query?: Record<string, unknown> } = {},
) {
  const match = findDemoRoute(method, path, ROUTES);
  if (!match) throw new Error(`no route for ${method} ${path}`);
  const payload = match.route.respond({
    exp: Date.now() + 60_000,
    params: match.params,
    query: options.query ?? {},
    body: options.body,
  });
  return JSON.parse(JSON.stringify(payload));
}

const POST_PATHS = ROUTES.filter((route) => route.method === "POST").map(
  (route) => route.pattern,
);

afterEach(() => {
  vi.useRealTimers();
});

describe("enterprise demo fixtures", () => {
  it.each(SHAPED_ROUTES)("%s %s matches its shape", (method, path, schema) => {
    expect(() => schema.parse(call(method, path))).not.toThrow();
  });

  it("registers exactly the required write-free POST paths", () => {
    for (const path of POST_PATHS) {
      expect(DEMO_READ_POST_PATHS).toContain(path);
      expect(isDemoReadPost(path)).toBe(true);
    }
    for (const denied of [
      "/recommendations/goals/ai/reroll",
      "/enterprise/dossier/refresh",
      "/recommendations/feedback",
      "/recommendations/clusters/save",
      "/recommendations/clusters/collections",
    ]) {
      expect(findDemoRoute("POST", denied, ROUTES)).toBeNull();
    }
  });

  it("leaves /enterprise/status to its owner", () => {
    expect(findDemoRoute("GET", "/enterprise/status", ROUTES)).toBeNull();
  });

  describe("curate", () => {
    it.each(DEMO_CURATE_QUESTIONS.map((question, index) => [question, index] as const))(
      "%s selects slate %i",
      (mood, index) => {
        const job = call("POST", "/recommendations/curate", {
          body: { context: { mood } },
        });
        expect(job.jobId).toBe(`demo-${index}`);
        expect(job.status).toBe("done");
        expect(job.events).toEqual([]);
        expect(job.result.moodSummary).toBeTruthy();
        expect(job.result.items.length).toBeGreaterThan(0);
      },
    );

    it("returns tailored and distinct slates", () => {
      const [cozy, coop, story] = DEMO_CURATE_QUESTIONS.map((mood) =>
        call("POST", "/recommendations/curate", { body: { context: { mood } } }),
      );
      const names = (job: { result: { items: { name: string }[] } }) =>
        job.result.items.map((item) => item.name);
      expect(names(cozy)).toContain("Stardew Valley");
      expect(names(coop)).toContain("Deep Rock Galactic");
      expect(names(coop)).not.toContain("It Takes Two");
      expect(names(coop)).not.toContain("Portal 2");
      expect(names(story)[0]).toBe("Disco Elysium");
      expect(new Set([cozy, coop, story].map((job) => job.result.moodSummary)).size).toBe(3);
    });

    it("keeps plan steps pointed at real items", () => {
      for (const mood of DEMO_CURATE_QUESTIONS) {
        const { result } = call("POST", "/recommendations/curate", {
          body: { context: { mood } },
        });
        for (const step of result.plan.steps) {
          expect(result.items[step.itemIndex]).toBeDefined();
        }
      }
    });

    it.each([
      ["other text", { context: { mood: "something else" } }],
      ["padded question", { context: { mood: ` ${DEMO_CURATE_QUESTIONS[1]}` } }],
      ["non-string mood", { context: { mood: 1 } }],
      ["array context", { context: [DEMO_CURATE_QUESTIONS[1]] }],
      ["missing context", {}],
      ["undefined", undefined],
      ["string", "junk"],
      ["null", null],
    ])("falls back to slate 0 for %s", (_label, body) => {
      expect(call("POST", "/recommendations/curate", { body }).jobId).toBe("demo-0");
    });

    it.each([0, 1, 2])("job poll returns the same job for demo-%i", (index) => {
      const posted = call("POST", "/recommendations/curate", {
        body: { context: { mood: DEMO_CURATE_QUESTIONS[index] } },
      });
      const polled = call("GET", `/recommendations/curate/demo-${index}`);
      expect(polled.jobId).toBe(posted.jobId);
      expect(polled.result.items).toEqual(posted.result.items);
    });

    it.each(["demo-3", "__proto__", "constructor", "x"])(
      "job poll falls back to demo-0 for %s",
      (id) => {
        const polled = call("GET", `/recommendations/curate/${id}`);
        expect(polled.jobId).toBe("demo-0");
      },
    );
  });

  describe("untrusted input", () => {
    const JUNK: readonly unknown[] = [
      undefined,
      null,
      "a string",
      42,
      [],
      [{ context: 1 }],
      {
        context: { mood: { nested: ["<script>"] } },
        limit: { a: 1 },
        domains: "games",
        targetCount: "many",
        q: ["<script>"],
      },
      { limit: -1, targetCount: 1e12, domains: [1, null, {}] },
    ];

    it("does not throw on malformed POST bodies", () => {
      for (const path of POST_PATHS) {
        for (const body of JUNK) {
          expect(() => call("POST", path, { body })).not.toThrow();
        }
      }
    });

    it("does not throw on malformed query values", () => {
      const query = {
        since: ["7d"],
        limit: { a: 1 },
        offset: "-5",
        days: "abc",
        status: "bogus",
      };
      for (const route of ROUTES.filter((item) => item.method === "GET")) {
        const path = route.pattern.replace(/:[a-zA-Z]+/, "x");
        expect(() => call("GET", path, { query })).not.toThrow();
      }
    });

    it("never echoes request input", () => {
      const marker = "ECHO_MARKER_7f3a";
      const body = {
        q: marker,
        timeframe: marker,
        context: { mood: marker, timeZone: marker },
      };
      for (const path of POST_PATHS) {
        expect(JSON.stringify(call("POST", path, { body }))).not.toContain(marker);
      }
      const detail = call("GET", `/enterprise/otel/traces/${marker}`);
      expect(JSON.stringify(detail)).not.toContain(marker);
    });
  });

  describe("request-sensitive reads", () => {
    it("honors recommendation limit and domain filters", () => {
      expect(
        call("POST", "/recommendations", { body: { limit: 3 } }).items,
      ).toHaveLength(3);
      expect(
        call("POST", "/recommendations", { body: { domains: ["music"] } }).items,
      ).toEqual([]);
      expect(
        call("POST", "/recommendations", { body: { domains: ["games"] } }).items.length,
      ).toBeGreaterThan(0);
    });

    it("honors goal target count", () => {
      for (const targetCount of [1, 3, 5, 10]) {
        const result = call("POST", "/recommendations/goals", { body: { targetCount } });
        expect(result.suggestions).toHaveLength(targetCount);
      }
    });

    it("keeps suggestions separate from AI goals and the listed goals' games", () => {
      const ai = call("POST", "/recommendations/goals/ai").goals;
      const smart = call("POST", "/recommendations/goals", { body: { targetCount: 10 } }).suggestions;
      const names = [...ai, ...smart].map((goal: { name: string }) => goal.name);
      expect(new Set(names).size).toBe(names.length);
      for (const taken of ["Cyberpunk 2077", "Hollow Knight", "Celeste"]) {
        expect(names).not.toContain(taken);
      }
    });

    it.each([
      ["1h", "hour"],
      ["6h", "hour"],
      ["24h", "hour"],
      ["7d", "day"],
      ["30d", "day"],
    ])("usage for %s is %s-grained with consistent totals", (since, granularity) => {
      const usage = call("GET", "/enterprise/otel/usage", { query: { since } });
      expect(usage.timeseries_granularity).toBe(granularity);
      const sum = usage.timeseries.reduce(
        (total: number, bucket: { request_count: number }) => total + bucket.request_count,
        0,
      );
      expect(usage.request_count).toBe(sum);
      expect(usage.total_tokens).toBe(usage.input_tokens + usage.output_tokens);
      expect(usage.request_count).toBeGreaterThan(0);
    });

    it("prices every model reported by usage", () => {
      const pricing = call("GET", "/enterprise/otel/pricing");
      const usage = call("GET", "/enterprise/otel/usage");
      const priced = new Set(pricing.models.map((row: { model: string }) => row.model));
      for (const row of usage.by_model) expect(priced.has(row.model)).toBe(true);
    });

    it("paginates traces and resolves each listed trace", () => {
      const first = call("GET", "/enterprise/otel/traces", {
        query: { since: "30d", limit: "15", offset: "0" },
      });
      const second = call("GET", "/enterprise/otel/traces", {
        query: { since: "30d", limit: "15", offset: "15" },
      });
      expect(first.total).toBeGreaterThan(15);
      expect(first.traces).toHaveLength(15);
      expect(second.traces.length).toBe(first.total - 15);
      for (const trace of [...first.traces, ...second.traces]) {
        const detail = call("GET", `/enterprise/otel/traces/${trace.trace_id}`);
        expect(detail.trace_id).toBe(trace.trace_id);
        expect(detail.spans).toHaveLength(trace.span_count);
        const ids = new Set(detail.spans.map((span: { span_id: string }) => span.span_id));
        expect(ids.size).toBe(trace.span_count);
        for (const span of detail.spans) {
          if (span.parent_span_id) expect(ids.has(span.parent_span_id)).toBe(true);
        }
      }
    });

    it("narrows traces by time range", () => {
      const totals = ["1h", "24h", "7d", "30d"].map(
        (since) => call("GET", "/enterprise/otel/traces", { query: { since } }).total,
      );
      expect(totals).toEqual([...totals].sort((a, b) => a - b));
      expect(totals[0]).toBeGreaterThan(0);
    });
  });

  describe("data rules", () => {
    it("uses only demo catalog titles and Steam header URLs", () => {
      const validUrls = new Set(DEMO_GAMES.map((game) => steamHeaderUrl(game.appId)));
      for (const job of [0, 1, 2].map((i) => call("GET", `/recommendations/curate/demo-${i}`))) {
        for (const item of job.result.items) {
          expect(GAME_NAMES.has(item.name)).toBe(true);
          expect(validUrls.has(item.imageUrl)).toBe(true);
        }
      }
      for (const path of ["/recommendations", "/recommendations/search"]) {
        for (const item of call("POST", path).items) {
          expect(GAME_NAMES.has(item.name)).toBe(true);
          expect(validUrls.has(item.imageUrl)).toBe(true);
        }
      }
      const digest = call("POST", "/recommendations/weekly-digest");
      for (const item of digest.result.items) expect(GAME_NAMES.has(item.name)).toBe(true);
      for (const slate of call("GET", "/recommendations/history").slates) {
        for (const item of slate.items) expect(GAME_NAMES.has(item.name)).toBe(true);
      }
    });

    it("emits no URLs except Steam headers", () => {
      const allowed = /https:\/\/cdn\.cloudflare\.steamstatic\.com\/steam\/apps\/\d+\/header\.jpg/g;
      for (const [method, path] of SHAPED_ROUTES) {
        const text = JSON.stringify(call(method, path)).replace(allowed, "");
        expect(text).not.toMatch(/https?:\/\//);
      }
    });

    it("keeps prompt text out of traces", () => {
      const { traces } = call("GET", "/enterprise/otel/traces", { query: { since: "30d" } });
      for (const trace of traces) {
        const detail = call("GET", `/enterprise/otel/traces/${trace.trace_id}`);
        for (const span of detail.spans) {
          for (const key of Object.keys(span.attributes)) {
            expect(key).not.toMatch(/prompt|ask|message|completion|content/i);
          }
        }
      }
    });

    it("computes dates at call time", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-11T12:00:00.000Z"));
      const march = call("POST", "/recommendations/weekly-digest");
      const marchBudget = call("GET", "/enterprise/llm/budget");
      expect(march.result.weekId).toBe("2026-W11");
      expect(march.result.from).toBe("2026-03-09");
      expect(march.result.to).toBe("2026-03-15");
      expect(marchBudget.periodStart).toBe("2026-03-01");
      expect(marchBudget.periodEnd).toBe("2026-03-31");
      expect(marchBudget.trend).toHaveLength(31);

      vi.setSystemTime(new Date("2027-01-01T12:00:00.000Z"));
      const january = call("POST", "/recommendations/weekly-digest");
      expect(january.result.weekId).toBe("2026-W53");
    });

    it("keeps the budget sane on every day of a month", () => {
      vi.useFakeTimers();
      for (let day = 1; day <= 31; day += 1) {
        vi.setSystemTime(new Date(Date.UTC(2026, 11, day, 12)));
        const budget = call("GET", "/enterprise/llm/budget");
        expect(() => BudgetSchema.parse(budget)).not.toThrow();
        expect(budget.total.exhausted).toBe(false);
        expect(budget.total.remainingUsd).toBeGreaterThan(0);
        expect(budget.models.some((row: { exhausted: boolean }) => row.exhausted)).toBe(false);
        const today = budget.trend[day - 1];
        expect(today.spentUsd).toBe(budget.total.spentUsd);
        expect(today.projectedUsd).toBe(budget.total.spentUsd);
      }
    });
  });
});
