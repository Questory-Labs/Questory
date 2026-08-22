import type { ReactNode } from "react";
import { HatchShadow } from "./HatchShadow";
import { QMark } from "./QMark";

export type StateMessageVariant = "loading" | "error";

export type StateMessageProps = {
  variant: StateMessageVariant;
  children?: ReactNode;
  className?: string;
};

export const StateMessage = ({
  variant,
  children,
  className = "",
}: StateMessageProps) => {
  const isError = variant === "error";

  return (
    <HatchShadow
      size="sm"
      className={`mt-8 ${className}`.trim()}
      faceClassName="panel px-5 py-6 text-center"
    >
      <div className="mb-3 flex justify-center">
        <QMark variant={variant} />
      </div>

      <p
        className={`text-xs font-semibold uppercase tracking-wider ${
          isError ? "text-[var(--danger)]" : "text-[var(--muted)]"
        }`}
      >
        {isError ? "Error" : "Loading"}
      </p>

      {children ? (
        <p className="mt-2 text-sm text-[var(--faint)]">{children}</p>
      ) : null}
    </HatchShadow>
  );
};
