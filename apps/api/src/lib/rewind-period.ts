import { BadRequestException } from "@nestjs/common";
import { getRewindAiPeriodError } from "@questorylabs/shared";

export function assertRewindAiPeriodAllowed(period: string): void {
  const error = getRewindAiPeriodError(period);
  if (error) {
    throw new BadRequestException(error);
  }
}
