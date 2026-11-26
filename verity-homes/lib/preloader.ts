// Shared by the client Preloader and the server-rendered SiteChrome (plain module, no
// "use client", so the server can read these strings).

/** sessionStorage key set once the intro has played in this visit (tab session). */
export const PRELOADER_SEEN_KEY = "verity:intro-seen";
export const PRELOADER_ID = "vh-preloader";

/**
 * Inline script rendered (by the server) just before the preloader: on a later full page load
 * in the same visit it hides the preloader before the first paint. It adds a <style> to <head>
 * rather than touching <html>/<body> or the preloader element, so hydration sees no mismatch.
 */
export const PRELOADER_SKIP_SCRIPT = `try{if(sessionStorage.getItem(${JSON.stringify(
  PRELOADER_SEEN_KEY,
)})){var s=document.createElement("style");s.textContent="#${PRELOADER_ID}{display:none}";document.head.appendChild(s)}}catch(e){}`;
