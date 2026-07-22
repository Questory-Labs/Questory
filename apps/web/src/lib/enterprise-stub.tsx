/**
 * No-op fallback for `@enterprise/web`. Used whenever the private enterprise
 * tree is absent (community checkouts, public Docker images) — see the alias
 * in next.config.ts. Must mirror the export surface of
 * enterprise/packages/web-ui/src/index.tsx: TypeScript always resolves
 * `@enterprise/web` to this file (tsconfig paths), even when the bundler
 * swaps in the real components.
 */

export function RecommendationsPanel(): React.ReactNode {
  return null;
}

export function RecommendationsWidget(_props: {
  limit?: number;
}): React.ReactNode {
  return null;
}
