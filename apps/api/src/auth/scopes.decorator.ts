import { SetMetadata } from "@nestjs/common";
import type { PublicApiScope } from "@questorylabs/shared";

export const PUBLIC_API_SCOPES_KEY = "publicApiScopes";

export const Scopes = (...scopes: PublicApiScope[]) =>
  SetMetadata(PUBLIC_API_SCOPES_KEY, scopes);
