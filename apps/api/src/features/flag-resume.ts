import { FEATURE_FLAGS_TTL_MS } from "./features.constants";
import type { FeatureFlagsService } from "./feature-flags.service";

/**
 * Retries a background drain when feature flags change, including on other
 * API processes after the L1 TTL expires.
 */
export class FlagResume {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly unsub: () => void;

  constructor(
    flags: FeatureFlagsService,
    private readonly resume: () => void,
  ) {
    this.unsub = flags.onChange(() => this.resume());
  }

  schedule(delayMs = FEATURE_FLAGS_TTL_MS) {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.resume();
    }, delayMs);
    this.timer.unref?.();
  }

  dispose() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.unsub();
  }
}
