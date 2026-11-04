export const LOGIN_LOCKOUT_TIERS = [
  { failures: 5, pauseSec: 60 },
  { failures: 10, pauseSec: 5 * 60 },
  { failures: 20, pauseSec: 15 * 60 },
] as const;

export const LOGIN_FAILURE_WINDOW_SEC = 15 * 60;
