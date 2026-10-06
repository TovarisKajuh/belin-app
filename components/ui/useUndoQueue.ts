"use client";
import { useEffect, useRef } from "react";
import { createUndoQueue, type UndoQueue } from "@/lib/undo-queue";

// A pending approval is never silently dropped: leaving the screen or the
// page fires it at once rather than forgetting it.
export function useUndoQueue(): UndoQueue {
  const ref = useRef<UndoQueue | null>(null);
  if (ref.current === null) ref.current = createUndoQueue();
  useEffect(() => {
    const queue = ref.current!;
    const flush = () => queue.flushAll();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      queue.flushAll();
    };
  }, []);
  return ref.current;
}
