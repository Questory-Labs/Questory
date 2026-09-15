export type DashboardOccupancyInput = {
  steamLinked: boolean;
  statsFailed: boolean;
  statsEmpty: boolean;
  hasContinue: boolean;
  playNextFailed: boolean;
  playNextEmpty: boolean;
};

export type DashboardOccupancy = {
  /** Paint the continue cover from recentlyPlayed[0]. */
  showContinue: boolean;
  /** Stats are in flight and we do not yet have a continue game. */
  continueSkeleton: boolean;
  /** Stats failed — never promote a play-next pick as last-played. */
  statsError: boolean;
  /** Play-next failed is not "unlinked". */
  playNextError: boolean;
  /** Only when there is no continue and Steam is not linked. */
  showUnlinked: boolean;
};

/**
 * Two-resource occupancy. Never gate the page on `stats.empty || playNext.empty`.
 */
export const dashboardOccupancy = (
  input: DashboardOccupancyInput,
): DashboardOccupancy => {
  const {
    steamLinked,
    statsFailed,
    statsEmpty,
    hasContinue,
    playNextFailed,
    playNextEmpty,
  } = input;

  if (statsFailed) {
    return {
      showContinue: false,
      continueSkeleton: false,
      statsError: true,
      playNextError: playNextFailed,
      showUnlinked: false,
    };
  }

  if (hasContinue) {
    return {
      showContinue: true,
      continueSkeleton: false,
      statsError: false,
      playNextError: playNextFailed,
      showUnlinked: false,
    };
  }

  if (statsEmpty) {
    return {
      showContinue: false,
      continueSkeleton: true,
      statsError: false,
      playNextError: playNextFailed,
      showUnlinked: false,
    };
  }

  // Stats ready, no recent. Play-next still empty → hero skeleton, not Connections.
  if (playNextEmpty && !playNextFailed) {
    return {
      showContinue: false,
      continueSkeleton: true,
      statsError: false,
      playNextError: false,
      showUnlinked: false,
    };
  }

  return {
    showContinue: false,
    continueSkeleton: false,
    statsError: false,
    playNextError: playNextFailed,
    showUnlinked: !steamLinked,
  };
};
