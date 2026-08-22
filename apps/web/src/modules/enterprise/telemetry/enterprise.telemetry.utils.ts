import type { OtelSpan, OtelUsage } from "@/lib/enterprise-api";
import type { SpanNode } from "./enterprise.telemetry.types";

export const formatDurationNs = (ns?: number): string => {
  if (ns == null || Number.isNaN(ns)) return "—";
  if (ns < 1_000_000) return `${Math.round(ns / 1_000)}µs`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(1)}ms`;
  return `${(ns / 1_000_000_000).toFixed(2)}s`;
};

export const formatCompact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
};

export const formatUsd = (amount: number | undefined): string => {
  if (amount == null || !Number.isFinite(amount)) return "—";
  if (amount === 0) return "$0";
  if (Math.abs(amount) < 0.0001) return "<$0.0001";
  if (Math.abs(amount) >= 1) {
    return `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${amount.toFixed(4)}`;
};

export const formatBucketLabel = (iso: string, granularity?: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (granularity === "day") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

export const usageNumber = (
  usage: OtelUsage,
  keys: string[],
): number | undefined => {
  for (const key of keys) {
    const v = usage[key];
    if (typeof v === "number") return v;
  }
  return undefined;
};

export const statusTone = (status?: string): string => {
  const s = (status || "").toUpperCase();
  if (s === "ERROR" || s === "2") return "text-[var(--danger)]";
  if (s === "OK" || s === "1") return "text-[var(--accent)]";
  return "text-[var(--muted)]";
};

export const attrString = (
  span: OtelSpan,
  key: string,
): string | number | boolean | null => {
  const fromAttrs = span.attributes?.[key];
  if (
    typeof fromAttrs === "string" ||
    typeof fromAttrs === "number" ||
    typeof fromAttrs === "boolean"
  ) {
    return fromAttrs;
  }
  const direct = span[key];
  if (
    typeof direct === "string" ||
    typeof direct === "number" ||
    typeof direct === "boolean"
  ) {
    return direct;
  }
  return null;
};

export const formatAttrValue = (value: unknown): string => {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const buildSpanTree = (spans: OtelSpan[]): SpanNode[] => {
  const byId = new Map<string, SpanNode>();
  const roots: SpanNode[] = [];

  for (const span of spans) {
    const id = String(span.span_id || "");
    byId.set(id || `anon-${byId.size}`, { span, depth: 0, children: [] });
  }

  for (const node of byId.values()) {
    const parentId = node.span.parent_span_id
      ? String(node.span.parent_span_id)
      : "";
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const assignDepth = (nodes: SpanNode[], depth: number) => {
    for (const n of nodes) {
      n.depth = depth;
      n.children.sort(
        (a, b) =>
          (a.span.start_time_unix_nano ?? 0) -
          (b.span.start_time_unix_nano ?? 0),
      );
      assignDepth(n.children, depth + 1);
    }
  };
  roots.sort(
    (a, b) =>
      (a.span.start_time_unix_nano ?? 0) - (b.span.start_time_unix_nano ?? 0),
  );
  assignDepth(roots, 0);
  return roots;
};

export const flattenTree = (nodes: SpanNode[]): SpanNode[] => {
  const out: SpanNode[] = [];
  const walk = (list: SpanNode[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
};
