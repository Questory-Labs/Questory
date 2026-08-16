function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(title: string, body: string, href: string): { text: string; html: string } {
  const safeHref = escapeHtml(href);
  return {
    text: `${title}\n\n${body}\n\n${href}\n`,
    html: `<p>${escapeHtml(body)}</p><p><a href="${safeHref}">${escapeHtml(title)}</a></p><p style="color:#666;font-size:12px">${safeHref}</p>`,
  };
}

export function verifyEmailContent(href: string) {
  const copy = wrap(
    "Verify your email",
    "Confirm this address to finish setting up your Questory account.",
    href,
  );
  return { subject: "Verify your Questory email", ...copy };
}

export function magicLinkContent(href: string) {
  const copy = wrap(
    "Sign in to Questory",
    "Use this one-time link to sign in. It expires shortly and can only be used once.",
    href,
  );
  return { subject: "Your Questory sign-in link", ...copy };
}

export function resetPasswordContent(href: string) {
  const copy = wrap(
    "Reset your password",
    "Use this one-time link to choose a new password. If you did not ask for this, you can ignore the email.",
    href,
  );
  return { subject: "Reset your Questory password", ...copy };
}
