"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { track, type AnalyticsEvent, type AnalyticsParams } from "@/lib/analytics";
import { readConsent, subscribeConsent } from "@/lib/consent";

/**
 * Sends one page-view style event (view_item on a property, view_plan on a plan) once per page,
 * as soon as the visitor has accepted cookies. Renders nothing. No-op without an analytics ID.
 */
export function TrackView({ event, params }: { event: AnalyticsEvent; params: AnalyticsParams }) {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);
  const sent = useRef(false);
  const latest = useRef(params);
  useEffect(() => {
    latest.current = params;
  });
  useEffect(() => {
    if (sent.current || consent !== "granted") return;
    sent.current = track(event, latest.current);
  }, [event, consent]);
  return null;
}
