"use client";

import type { MusicRange } from "@questorylabs/shared";
import { SegmentedControl } from "@/components/SegmentedControl";

const PERIOD_RANGES: { value: MusicRange; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const ALL_RANGE: { value: MusicRange; label: string } = {
  value: "all",
  label: "All",
};

export function MusicRangePicker({
  value,
  onChange,
  includeAll = false,
}: {
  value: MusicRange;
  onChange: (range: MusicRange) => void;
  includeAll?: boolean;
}) {
  const ranges = includeAll ? [...PERIOD_RANGES, ALL_RANGE] : PERIOD_RANGES;
  return (
    <SegmentedControl
      label="Time range"
      value={value}
      onChange={onChange}
      options={ranges}
    />
  );
}
