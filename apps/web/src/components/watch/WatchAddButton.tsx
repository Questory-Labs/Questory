"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { WatchLogDialog } from "@/components/watch/WatchLogDialog";

export function WatchAddButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add</Button>
      <WatchLogDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
