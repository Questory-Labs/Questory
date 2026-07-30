export type SketchDatum = {
  label: string;
  value: number;
};

export type ChartSize = "sm" | "md" | "lg";

export type SeriesConfig = {
  key: string;
  name: string;
  color?: string;
  yAxisId?: string;
  variant?: "line" | "area";
  strokeDasharray?: string;
};

export type YAxisConfig = {
  id: string;
  side: "left" | "right";
  formatTick?: (n: number) => string;
};

export type ChartPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type LinePoint = {
  x: number;
  y: number;
  label: string;
  value: number;
};

export type DonutDatum = {
  name: string;
  value: number;
  color?: string;
};

export type HeatmapCell = {
  day: number;
  hour: number;
  value: number;
};

export type ScatterPoint = {
  x: number;
  y: number;
  label?: string;
};
