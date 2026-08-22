import type { ReactNode } from "react";

export type ResourceStatusProps = {
  failed: boolean;
  empty: boolean;
  loading: ReactNode;
  error: ReactNode;
  children: ReactNode;
};

export const ResourceStatus = ({
  failed,
  empty,
  loading,
  error,
  children,
}: ResourceStatusProps) => {
  if (failed) return error;
  if (empty) return loading;
  return children;
};
