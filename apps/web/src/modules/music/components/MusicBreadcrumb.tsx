import Link from "next/link";

export const MusicBreadcrumb = ({
  href,
  label,
  current,
}: {
  href: string;
  label: string;
  current: string;
}) => (
  <nav
    aria-label="Breadcrumb"
    className="q-in flex min-h-9 items-center gap-2 text-[13px] text-[var(--muted)]"
  >
    <Link href={href} className="inline-flex items-center gap-2 hover:text-[var(--ink)]">
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
    <span aria-hidden="true" className="text-[var(--dim)]">
      /
    </span>
    <span>{current}</span>
  </nav>
);
