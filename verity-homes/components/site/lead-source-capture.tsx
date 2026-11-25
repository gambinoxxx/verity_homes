"use client";

import { useEffect } from "react";
import { captureFirstTouch } from "@/lib/lead-source";

/**
 * Notes where this visit came from (UTM tags, click IDs, landing page, referrer) on its first
 * page, in sessionStorage, so enquiries sent later in the visit can say so. Renders nothing.
 */
export function LeadSourceCapture() {
  useEffect(() => {
    captureFirstTouch();
  }, []);
  return null;
}
