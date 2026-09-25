type SiteToolingEventProperties = Record<
  string,
  string | number | boolean | undefined
>;

declare global {
  interface Window {
    siteTooling?: {
      trackEvent: (
        name: string,
        properties?: SiteToolingEventProperties,
      ) => void;
    };
  }
}

// Wraps the SiteTooling (STS) tracker loaded in the root layout. Safe to call
// anywhere on the client — no-ops on the server, when the script is blocked,
// or before it has loaded.
export function trackEvent(
  name: string,
  properties?: SiteToolingEventProperties,
): void {
  if (typeof window === 'undefined') return;
  if (typeof window.siteTooling?.trackEvent !== 'function') return;
  window.siteTooling.trackEvent(name, properties);
}
