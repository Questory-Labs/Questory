"use client";

import { Button } from "@questorylabs/ui";

export const RoiPagination = ({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <Button
        variant="secondary"
        disabled={page <= 1}
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
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="px-3 py-1.5"
      >
        Next
      </Button>
    </div>
  );
};
