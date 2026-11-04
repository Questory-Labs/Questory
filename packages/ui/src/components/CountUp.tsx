import type { ReactNode } from "react";
import { cn } from "../cn";
import { useCountUp } from "./useCountUp";

const formatter = (decimals: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const CountUp = ({
  value,
  decimals = 0,
  dimDecimals = false,
  prefix,
  suffix,
  duration,
  className,
}: {
  value: number;
  decimals?: number;
  dimDecimals?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  duration?: number;
  className?: string;
}) => {
  const current = useCountUp(value, duration);
  const fmt = formatter(decimals);
  const shown = fmt.format(current);
  const [whole, fraction] = shown.split(".");
  return (
    <span className={cn("tabular-nums", className)}>
      <span className="sr-only">
        {prefix}
        {fmt.format(value)}
        {suffix}
      </span>
      <span aria-hidden="true">
        {prefix}
        {whole}
        {fraction !== undefined ? (
          <span className={dimDecimals ? "num-dim" : undefined}>.{fraction}</span>
        ) : null}
        {suffix}
      </span>
    </span>
  );
};
