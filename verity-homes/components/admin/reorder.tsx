"use client";

// Reordering for admin lists (Unit 17: plans, FAQs): drag a row, or use the up/down buttons
// (keyboard). The new order shows at once and is saved through `save(ids)`; if saving fails,
// the old order comes back with an error toast.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { moveItem } from "@/lib/reorder";
import { AdminIcon } from "./icons";
import ui from "./ui.module.css";

type Result = { ok: true } | { ok: false; error: string };

export function useReorder<T extends { id: string }>(
  items: T[],
  save: (ids: string[]) => Promise<Result>,
) {
  const router = useRouter();
  const [order, setOrder] = useState(items);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [pending, start] = useTransition();

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const before = order;
    const next = moveItem(order, from, to);
    setOrder(next);
    start(async () => {
      const res = await save(next.map((i) => i.id));
      if (!res.ok) {
        setOrder(before);
        toast.error(res.error);
        return;
      }
      toast.success("Order saved.");
      router.refresh();
    });
  };

  /** Props for a draggable row at position `i`. */
  const dragProps = (i: number) => ({
    draggable: true,
    "data-dragging": dragFrom === i ? "true" : undefined,
    onDragStart: (e: React.DragEvent) => {
      setDragFrom(i);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(i));
    },
    onDragOver: (e: React.DragEvent) => {
      if (dragFrom === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    onDrop: (e: React.DragEvent) => {
      if (dragFrom === null) return;
      e.preventDefault();
      move(dragFrom, i);
      setDragFrom(null);
    },
    onDragEnd: () => setDragFrom(null),
  });

  return { order, move, dragProps, pending };
}

/** "Move <label> up / down" buttons for row `index` of `count`. */
export function MoveButtons({
  index,
  count,
  label,
  onMove,
  disabled,
}: {
  index: number;
  count: number;
  label: string;
  onMove: (from: number, to: number) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <button
        type="button"
        className={ui.iconBtn}
        aria-label={`Move ${label} up`}
        disabled={disabled || index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <AdminIcon name="up" />
      </button>
      <button
        type="button"
        className={ui.iconBtn}
        aria-label={`Move ${label} down`}
        disabled={disabled || index === count - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <AdminIcon name="down" />
      </button>
    </>
  );
}
