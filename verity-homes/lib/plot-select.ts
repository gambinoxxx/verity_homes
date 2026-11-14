// "Select" on a plot (Unit 17b) → the property page's enquiry form gets that plot (message +
// hidden plotId) and the WhatsApp links name it. A window event, like lib/invest-plan-select.ts,
// so the plot table, the form and the WhatsApp buttons stay independent components.
const EVENT = "verity:select-plot";

export type PlotSelection = {
  propertyId: string;
  plotId: string;
  /** Pre-filled enquiry message naming the plot. */
  message: string;
  /** WhatsApp text naming the plot. */
  whatsappText: string;
};

export function selectPlot(selection: PlotSelection): void {
  window.dispatchEvent(new CustomEvent<PlotSelection>(EVENT, { detail: selection }));
}

/** Calls `cb` each time a plot is picked. Returns a cleanup. */
export function onPlotSelected(cb: (selection: PlotSelection) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<PlotSelection>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
