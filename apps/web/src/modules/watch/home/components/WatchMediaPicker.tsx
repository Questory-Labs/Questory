"use client";

import { SegmentedControl } from "@/components/SegmentedControl";
import type { WatchMediaFilter } from "../watch.home.types";

const OPTIONS: { value: WatchMediaFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "show", label: "TV" },
];

export const WatchMediaPicker = ({
  value,
  onChange,
}: {
  value: WatchMediaFilter;
  onChange: (type: WatchMediaFilter) => void;
}) => (
  <SegmentedControl
    label="Media type"
    value={value}
    onChange={onChange}
    options={OPTIONS}
  />
);
