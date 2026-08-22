# `@questorylabs/ui`

Shared React primitives and design tokens for Questory web apps.

## Use in an app

1. Depend on the workspace package: `"@questorylabs/ui": "workspace:*"`.
2. Import tokens once in global CSS:

   ```css
   @import "tailwindcss";
   @import "@questorylabs/ui/styles.css";
   ```

3. For Next.js, transpile the source package:

   ```ts
   const nextConfig = { transpilePackages: ["@questorylabs/ui"] };
   ```

4. Load display/body/mono fonts (or override `--font-display`, `--font-body`, `--font-mono`).

```ts
import { Button, PageHeader, Panel, buttonVariants, cn } from "@questorylabs/ui";
```

Variants are CVA recipes. Compose extra classes with `cn` (clsx + tailwind-merge):

```ts
<Button variant="secondary" size="sm" className="w-full" />
<Panel variant="outline" />
cn(buttonVariants({ variant: "ghost" }), "px-0")
```

Keep product-specific chrome (gates, Q-mark, rotating quotes) in the app.

## Scripts

```bash
pnpm --filter @questorylabs/ui test
pnpm --filter @questorylabs/ui build
```
