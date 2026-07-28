import { afterEach, describe, expect, it } from "vitest";
import {
  getApiUrl,
  getEnterpriseUrl,
  runtimeEnv,
} from "@/lib/runtime-env";

describe("runtime-env", () => {
  const prevApi = process.env.NEXT_PUBLIC_API_URL;
  const prevEnt = process.env.NEXT_PUBLIC_ENTERPRISE_URL;

  afterEach(() => {
    if (prevApi === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = prevApi;
    if (prevEnt === undefined) delete process.env.NEXT_PUBLIC_ENTERPRISE_URL;
    else process.env.NEXT_PUBLIC_ENTERPRISE_URL = prevEnt;
    if (typeof window !== "undefined") {
      delete window.__QUESTORY_RUNTIME__;
    }
  });

  it("reads API URL from process.env via dynamic key", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://192.168.1.111:4000";
    expect(runtimeEnv("NEXT_PUBLIC_API_URL")).toBe(
      "http://192.168.1.111:4000",
    );
    expect(getApiUrl()).toBe("http://192.168.1.111:4000");
  });

  it("prefers window.__QUESTORY_RUNTIME__ when set", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
    window.__QUESTORY_RUNTIME__ = {
      NEXT_PUBLIC_API_URL: "http://192.168.1.111:4000",
    };
    expect(getApiUrl()).toBe("http://192.168.1.111:4000");
  });

  it("strips trailing slashes from enterprise URL", () => {
    process.env.NEXT_PUBLIC_ENTERPRISE_URL = "http://192.168.1.111:4030/";
    expect(getEnterpriseUrl()).toBe("http://192.168.1.111:4030");
  });
});
