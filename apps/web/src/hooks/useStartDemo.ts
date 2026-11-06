"use client";

import { useAction, useStore } from "@questorylabs/qhttp/react";
import { useRouter } from "next/navigation";
import { apiOnce } from "@/lib/api";
import { APP_STATUS_RESOURCE_ID } from "@/lib/app-status";
import { parseApiError } from "@/lib/auth-api";
import { useStatus } from "@/providers/StatusProvider";

export function useStartDemo() {
  const router = useRouter();
  const store = useStore();
  const { status } = useStatus();

  const start = useAction({
    run: () => apiOnce("/auth/demo", { method: "POST" }),
    onSuccess: async () => {
      await Promise.all([
        store.touch(["me"]),
        store.touch([...APP_STATUS_RESOURCE_ID]),
        store.touch(["enterprise-status"]),
      ]);
      router.replace("/dashboard");
    },
  });

  return {
    showDemo: status.value?.demo?.enabled === true,
    demoPending: start.busy,
    demoError: start.error
      ? parseApiError(start.error).message || "Could not start the demo."
      : null,
    startDemo: () => start.submit(),
  };
}
