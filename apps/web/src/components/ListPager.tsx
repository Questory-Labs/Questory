"use client";

import { Button } from "@/components/ui";

export type ListPagerProps = {
  page: number;
  total: number;
  pageSize: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  className?: string;
};

export const ListPager = ({
  page,
  total,
  pageSize,
  disabled = false,
  onPageChange,
  className = "mt-6",
}: ListPagerProps) => {
  if (total <= pageSize) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <Button
        variant="secondary"
        disabled={page <= 1 || disabled}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="px-3 py-1.5"
      >
        Previous
      </Button>
      <span className="font-mono text-xs text-[var(--muted)]">
        {page} / {totalPages}
      </span>
      <Button
        variant="secondary"
        disabled={page >= totalPages || disabled}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="px-3 py-1.5"
      >
        Next
      </Button>
    </div>
  );
};
