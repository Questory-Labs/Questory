"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { WatchLogDialog } from "@/components/watch/WatchLogDialog";

export const LogWatchButton = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="header-control" onClick={() => setOpen(true)}>
        Log a watch
      </Button>
      <WatchLogDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};
