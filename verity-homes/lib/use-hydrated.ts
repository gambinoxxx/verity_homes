"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false in the server HTML and during hydration, true afterwards (and on every client-side
 * render). Use it to apply "hidden until revealed" styles only once JavaScript is running,
 * so content can never be left hidden if the app's JS fails to load.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
