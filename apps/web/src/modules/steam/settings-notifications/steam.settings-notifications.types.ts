import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  NotificationChannel,
  NotificationChannelCreate,
  NotificationChannelListResponse,
  NotificationChannelUpdate,
} from "@questorylabs/shared";

export type ChannelTestResult = { id: string; ok: boolean; error: string | null };

export type NotificationChannelsState = {
  channels: UseResourceResult<NotificationChannelListResponse>;
  create: UseActionResult<NotificationChannel, NotificationChannelCreate>;
  update: UseActionResult<NotificationChannel, { id: string; patch: NotificationChannelUpdate }>;
  remove: UseActionResult<unknown, string>;
  test: UseActionResult<{ ok: boolean; error: string | null }, string>;
  testResult: ChannelTestResult | null;
  resend: UseActionResult<{ ok: boolean; error: string | null }, string>;
  resendResult: ChannelTestResult | null;
  error: string | null;
  clearError: () => void;
};
