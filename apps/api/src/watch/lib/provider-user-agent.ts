const QUESTORY_UA =
  "Questory/1.0 (https://github.com/Questory-Labs/Questory)";

export function questoryUserAgent(): string {
  return QUESTORY_UA;
}

export function shikimoriUserAgent(appName?: string): string {
  const name = (appName || "Questory").trim();
  return `${name} (https://github.com/Questory-Labs/Questory)`;
}
