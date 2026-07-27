/** Hidden honeypot fields — must stay empty for real humans. */
export function AuthFormAbuseFields() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
    >
      <label>
        Website
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </label>
      <label>
        Company
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </label>
      <label>
        Username
        <input
          type="text"
          name="username"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </label>
    </div>
  );
}

export function readAbuseFields(form: HTMLFormElement) {
  const fd = new FormData(form);
  return {
    website: String(fd.get("website") || ""),
    company: String(fd.get("company") || ""),
    username: String(fd.get("username") || ""),
  };
}
