import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { PlaySessionItem, PlaySessionPage } from "@questorylabs/shared";
import type { DayGroup } from "@/lib/dates";

export type SessionsViewProps = {
  sessions: UseResourceResult<PlaySessionPage>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  dayGroups: DayGroup<PlaySessionItem>[];
};
