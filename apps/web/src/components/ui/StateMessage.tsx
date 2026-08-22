import type { ReactNode } from "react";
import {
  StateMessage as UiStateMessage,
  type StateMessageProps,
} from "@questorylabs/ui";
import { RotatingTagline } from "@/components/RotatingTagline";

export const StateMessage = ({
  variant,
  children,
  className,
}: StateMessageProps) => {
  const content: ReactNode =
    children ??
    (variant === "loading" ? (
      <RotatingTagline context="loading" variant="compact" />
    ) : null);

  return (
    <UiStateMessage variant={variant} className={className}>
      {content}
    </UiStateMessage>
  );
};
