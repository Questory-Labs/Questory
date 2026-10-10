export type ApplyCounts = { accepted: number; skipped: number };

/** Running totals for a whole profile import, read by the progress flusher. */
export class ImportProgress {
  accepted = 0;
  skipped = 0;
}

/** Per-section counts that also feed the import-wide progress (when given). */
export class ApplyTally {
  accepted = 0;
  skipped = 0;

  constructor(private readonly progress?: ImportProgress) {}

  accept() {
    this.accepted += 1;
    if (this.progress) this.progress.accepted += 1;
  }

  skip() {
    this.skipped += 1;
    if (this.progress) this.progress.skipped += 1;
  }

  counts(): ApplyCounts {
    return { accepted: this.accepted, skipped: this.skipped };
  }
}
