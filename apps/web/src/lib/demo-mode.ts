import {
  DEMO_READ_ONLY_CODE,
  DEMO_READ_ONLY_MESSAGE,
  isDemoAllowedRequest,
} from "@questorylabs/shared";
import type { MappedHttpError } from "@/lib/qhttp-client";
import { getApiUrl } from "@/lib/runtime-env";

type DemoBlockedListener = () => void;

let demoActive = false;
const listeners = new Set<DemoBlockedListener>();

export function setDemoModeActive(active: boolean) {
  demoActive = active;
}

export function isDemoModeActive(): boolean {
  return demoActive;
}

export function subscribeDemoBlocked(listener: DemoBlockedListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyDemoBlocked() {
  for (const listener of listeners) listener();
}

function apiBase(): string {
  return getApiUrl().replace(/\/+$/, "");
}

function requestPath(url: string): string {
  const base = apiBase();
  const relative = url.startsWith(base) ? url.slice(base.length) : url;
  return new URL(relative, "http://demo.invalid").pathname;
}

export function assertDemoWriteAllowed(method: string, url: string) {
  if (!demoActive || isDemoAllowedRequest(method, requestPath(url))) return;
  notifyDemoBlocked();
  const error = new Error(DEMO_READ_ONLY_MESSAGE) as MappedHttpError;
  error.status = 403;
  error.data = {
    statusCode: 403,
    code: DEMO_READ_ONLY_CODE,
    message: DEMO_READ_ONLY_MESSAGE,
  };
  throw error;
}

export function isDemoBlockedHref(href: string): boolean {
  return demoActive && href.startsWith(apiBase());
}
