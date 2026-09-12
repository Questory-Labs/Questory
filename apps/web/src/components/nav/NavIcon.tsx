import type { NavIconName } from "./nav-config";

export const NavIcon = ({ name }: { name: NavIconName }) => {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      aria-hidden
    >
      {glyph(name)}
    </svg>
  );
};

const glyph = (name: NavIconName) => {
  switch (name) {
    case "dashboard":
      return <path d="M2.5 2.5h5v5h-5zM8.5 2.5h5v3h-5zM8.5 7.5h5v6h-5zM2.5 9.5h5v4h-5z" />;
    case "library":
      return <path d="M3 2.5h7.5v11H3zM10.5 4.5H13v9H10.5" />;
    case "wishlist":
      return <path d="M8 13.5 3.5 9.2A3.2 3.2 0 0 1 8 4.8a3.2 3.2 0 0 1 4.5 4.4z" />;
    case "cost":
      return (
        <>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 5v6M6.2 6.4h2.4a1.3 1.3 0 0 1 0 2.6H6.8" />
        </>
      );
    case "friends":
      return (
        <>
          <circle cx="6" cy="6" r="2.2" />
          <circle cx="10.5" cy="6.5" r="1.8" />
          <path d="M2.5 13c.4-2.2 2-3.5 3.5-3.5S9.1 10.8 9.5 13M9.2 9.6c.9-.4 1.9-.4 2.8.1.9.5 1.5 1.5 1.7 2.8" />
        </>
      );
    case "trending":
      return <path d="M2 11.5 6 7l2.5 2.5 5.5-6M12 3.5h2.5V6" />;
    case "collections":
      return <path d="M3 4.5h10v8H3zM5.5 2.5h5v2" />;
    case "sessions":
      return (
        <>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 5v3.5l2.5 1.5" />
        </>
      );
    case "family":
      return <path d="M8 3.5 13 7v6.5H3V7zM6.5 13.5v-4h3v4" />;
    case "multiplayer":
      return <path d="M3 11.5h4v2H3zM9 11.5h4v2H9zM5 5.5a2 2 0 1 1 0 .01M11 5.5a2 2 0 1 1 0 .01M5 8.5v3M11 8.5v3" />;
    case "music":
      return (
        <>
          <path d="M6 12.5a2 2 0 1 1 0 .01M12 10.5a2 2 0 1 1 0 .01" />
          <path d="M8 12.5V4.5l6-1.5v7.5" />
        </>
      );
    case "watch":
      return (
        <>
          <rect x="2.5" y="4" width="11" height="8" rx="1.2" />
          <path d="M6.5 7 10 8.5 6.5 10z" />
        </>
      );
    case "read":
      return <path d="M3 3.5h4.5v9H3zM8.5 3.5H13v9H8.5M8 4v8" />;
    case "recs":
      return <path d="M8 2.5 9.7 6.2 13.5 6.6 10.8 9.3 11.5 13 8 11.1 4.5 13l.7-3.7L2.5 6.6l3.8-.4z" />;
  }
};
