import { ABUSE_LIMIT_LABELS } from "./admin.settings.constants";

export const limitLabel = (key: string) => ABUSE_LIMIT_LABELS[key] ?? key;

export const windowLabel = (seconds: number) => {
  if (seconds % 86400 === 0) return seconds === 86400 ? "day" : `${seconds / 86400} days`;
  if (seconds % 3600 === 0) return seconds === 3600 ? "hour" : `${seconds / 3600} h`;
  if (seconds % 60 === 0) return seconds === 60 ? "min" : `${seconds / 60} min`;
  return `${seconds} s`;
};
