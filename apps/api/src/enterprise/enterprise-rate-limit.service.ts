import {
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { CacheService } from "../cache/cache.service";

export type EnterpriseRateLimitBucket =
  | "llm"
  | "recommendations"
  | "feedback"
  | "admin";

const LIMITS: Record<
  EnterpriseRateLimitBucket,
  { max: number; ttl: number }
> = {
  llm: { max: 20, ttl: 3600 },
  recommendations: { max: 120, ttl: 3600 },
  feedback: { max: 300, ttl: 3600 },
  admin: { max: 60, ttl: 3600 },
};

@Injectable()
export class EnterpriseRateLimitService {
  constructor(private readonly cache: CacheService) {}

  async assertAllowed(
    userId: string,
    bucket: EnterpriseRateLimitBucket,
  ): Promise<void> {
    const { max, ttl } = LIMITS[bucket];
    const key = `enterprise:rl:${bucket}:${userId}`;
    const count = await this.cache.incr(key, ttl);
    if (count > max) {
      throw new HttpException(
        "Too many enterprise requests. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
