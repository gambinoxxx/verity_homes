"use client";

// Status buttons for the open enquiry (Unit 16): Mark contacted / Close / Reopen. Each runs the
// server action, then refreshes, so the table, tab counts, sidebar badge and dashboard update.
// Reopen puts a closed enquiry back to "Contacted" (it was handled before — not unread).
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { setEnquiryStatus } from "@/lib/actions/enquiry-admin";
import ui from "../ui.module.css";

type Status = "NEW" | "CONTACTED" | "CLOSED";

export function EnquiryStatusButtons({ id, status }: { id: string; status: Status }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const set = (next: Status) =>
    start(async () => {
      const res = await setEnquiryStatus(id, next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.data.message);
      router.refresh();
    });

  return (
    <>
      {status === "NEW" ? (
        <button
          type="button"
          className={`${ui.btn} ${ui.navy}`}
          onClick={() => set("CONTACTED")}
          disabled={pending}
        >
          Mark contacted
        </button>
      ) : null}
      {status === "CLOSED" ? (
        <button
          type="button"
          className={`${ui.btn} ${ui.navy}`}
          onClick={() => set("CONTACTED")}
          disabled={pending}
        >
          Reopen
        </button>
      ) : (
        <button
          type="button"
          className={`${ui.btn} ${ui.ghost}`}
          onClick={() => set("CLOSED")}
          disabled={pending}
        >
          Close
        </button>
      )}
    </>
  );
}
