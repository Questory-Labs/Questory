import { afterEach, describe, expect, it } from "vitest";
import { discordPayload } from "../../src/notifications/delivery/discord.sender";
import { ntfyRequest } from "../../src/notifications/delivery/ntfy.sender";
import { emailMessage } from "../../src/notifications/delivery/email.sender";
import { absoluteHref } from "../../src/notifications/delivery/notification-delivery.constants";

const message = {
  type: "deal",
  title: "Target price hit",
  body: "Hades looks like a good buy right now.",
  href: "/wishlist",
};

describe("notification senders", () => {
  const prev = { ...process.env };
  afterEach(() => {
    process.env.PUBLIC_WEB_URL = prev.PUBLIC_WEB_URL;
    process.env.WEB_ORIGIN = prev.WEB_ORIGIN;
    process.env.SMTP_FROM = prev.SMTP_FROM;
  });

  it("builds absolute links from PUBLIC_WEB_URL", () => {
    process.env.PUBLIC_WEB_URL = "https://app.example.com/";
    expect(absoluteHref("/wishlist")).toBe("https://app.example.com/wishlist");
    expect(absoluteHref("https://x.test/a")).toBe("https://x.test/a");
    expect(absoluteHref(null)).toBeNull();
  });

  it("discord embed carries title, body and link", () => {
    process.env.PUBLIC_WEB_URL = "https://app.example.com";
    const payload = discordPayload(message);
    expect(payload.embeds[0]).toMatchObject({
      title: "Target price hit",
      description: message.body,
      url: "https://app.example.com/wishlist",
    });
  });

  it("ntfy request targets server/topic with Title, Click and Bearer", () => {
    process.env.PUBLIC_WEB_URL = "https://app.example.com";
    const req = ntfyRequest(
      { server: "https://ntfy.example.com/", topic: "questory", token: "tk_1" },
      { ...message, title: "Recap — ready" },
    );
    expect(req.url).toBe("https://ntfy.example.com/questory");
    expect(req.headers).toMatchObject({
      Title: "Recap ? ready",
      Click: "https://app.example.com/wishlist",
      Authorization: "Bearer tk_1",
    });
    expect(req.body).toBe(message.body);
  });

  it("email escapes html and uses SMTP_FROM", () => {
    process.env.PUBLIC_WEB_URL = "https://app.example.com";
    process.env.SMTP_FROM = "Questory <no-reply@example.com>";
    const mail = emailMessage(
      { address: "me@example.com" },
      { ...message, body: "<b>bold</b> & co" },
    );
    expect(mail.from).toBe("Questory <no-reply@example.com>");
    expect(mail.to).toBe("me@example.com");
    expect(mail.subject).toBe("Questory: Target price hit");
    expect(mail.html).toContain("&lt;b&gt;bold&lt;/b&gt; &amp; co");
    expect(mail.text).toContain("https://app.example.com/wishlist");
  });
});
