import type { Dispatch, SetStateAction } from "react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";

export type MigrationItem = {
  key: string;
  name: string;
  description: string;
  hasRun: boolean;
  status: string;
  runCount: number;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastError: string | null;
  lastResult: string | null;
  canRun: boolean;
};

export type MigrationsResponse = {
  migrations: MigrationItem[];
};

export type AdminMigrationsViewProps = {
  confirmKey: string | null;
  setConfirmKey: Dispatch<SetStateAction<string | null>>;
  migrations: UseResourceResult<MigrationsResponse>;
  run: UseActionResult<unknown, string>;
};
