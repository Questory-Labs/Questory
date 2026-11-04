export type ReadEnrichEvent = {
  readTitleId: string;
  status: string | null;
  volumesRead: number | null;
};

const STATUS_KEYS = {
  completed: "completed",
  dropped: "dropped",
  repeating: "repeating",
} as const;

export function enrichReadRewind(events: ReadEnrichEvent[]) {
  const titlesByStatus = {
    completed: new Set<string>(),
    dropped: new Set<string>(),
    repeating: new Set<string>(),
  };
  const volumesByTitle = new Map<string, number>();
  for (const e of events) {
    if (e.volumesRead) {
      volumesByTitle.set(
        e.readTitleId,
        Math.max(volumesByTitle.get(e.readTitleId) ?? 0, e.volumesRead),
      );
    }
    const status = e.status?.trim().toLowerCase();
    for (const [key, value] of Object.entries(STATUS_KEYS) as Array<
      [keyof typeof STATUS_KEYS, string]
    >) {
      if (status === value) titlesByStatus[key].add(e.readTitleId);
    }
  }
  return {
    statusBreakdown: {
      completed: titlesByStatus.completed.size,
      dropped: titlesByStatus.dropped.size,
      repeating: titlesByStatus.repeating.size,
    },
    volumesRead: [...volumesByTitle.values()].reduce((sum, v) => sum + v, 0),
  };
}
