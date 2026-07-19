import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { UsersService } from "../users/users.service";
import { hashToken } from "../lib/tokens";

export type AuthedRequest = Request & {
  musicUser?: { id: string; username: string };
};

@Injectable()
export class TokenGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedException({
        code: 401,
        error: "Invalid authorization token supplied",
      });
    }

    const user = await this.users.findByTokenHash(hashToken(token));
    if (!user) {
      throw new UnauthorizedException({
        code: 401,
        error: "Invalid authorization token supplied",
      });
    }

    req.musicUser = {
      id: user.id,
      username: user.username,
    };
    return true;
  }
}

export function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header) {
    const match = /^Token\s+(.+)$/i.exec(header.trim());
    if (match?.[1]) return match[1].trim();
  }
  // Query-string tokens are rejected (leak via logs/Referer).
  return null;
}
