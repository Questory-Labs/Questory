"use client";

import { useEffect } from "react";
import { useGlobalSearch } from "./GlobalSearchProvider";

export function useGlobalSearchShortcut() {
  const { setOpen } = useGlobalSearch();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);
}
