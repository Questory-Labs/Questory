function isEnvTrue(value: string | undefined): boolean {
  const v = (value || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

export type SmtpStatus = {
  configured: boolean;
  enabled: boolean;
  active: boolean;
  config: SmtpConfig | null;
};

export function resolveSmtpConfig(
  env: NodeJS.ProcessEnv = process.env,
): SmtpStatus {
  const enabled = isEnvTrue(env.SMTP_ENABLED);
  const host = (env.SMTP_HOST || "").trim();
  const from = (env.SMTP_FROM || "").trim();
  const portRaw = Number(env.SMTP_PORT || 587);
  const port = Number.isFinite(portRaw) && portRaw > 0 ? portRaw : 587;
  const secureEnv = env.SMTP_SECURE;
  const secure =
    secureEnv === undefined || secureEnv === ""
      ? port === 465
      : isEnvTrue(secureEnv);
  const user = (env.SMTP_USER || "").trim() || undefined;
  const pass = env.SMTP_PASS || undefined;
  const configured = Boolean(host && from);
  const config: SmtpConfig | null = configured
    ? { host, port, secure, user, pass, from }
    : null;
  return {
    configured,
    enabled,
    active: configured && enabled,
    config,
  };
}

export function isMailerActive(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveSmtpConfig(env).active;
}
