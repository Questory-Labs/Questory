"use client";

import { useState } from "react";

export const useWishlistEdit = () => {
  const [editing, setEditing] = useState<string | null>(null);
  const [target, setTarget] = useState("");

  const startEdit = (key: string, current: string) => {
    setEditing(key);
    setTarget(current);
  };

  const stopEdit = () => {
    setEditing(null);
    setTarget("");
  };

  return { editing, target, setTarget, startEdit, stopEdit };
};
