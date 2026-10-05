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
// anywhere on the client — no-ops on the server. The script loads with
// strategy="afterInteractive", so events fired during the first moments after
// hydration are queued briefly and flushed once the tracker appears; if it
// never loads (blocked/failed), the queue is dropped after ~10s.
const pendingQueue: Array<[string, SiteToolingEventProperties | undefined]> = [];
let flushTimer: number | null = null;

function flushQueue() {
  if (typeof window.siteTooling?.trackEvent !== 'function') return;
  while (pendingQueue.length > 0) {
    const [name, properties] = pendingQueue.shift()!;
    window.siteTooling.trackEvent(name, properties);
  }
}

function scheduleFlush() {
  if (flushTimer !== null || typeof window === 'undefined') return;
  let attempts = 0;
  flushTimer = window.setInterval(() => {
    attempts += 1;
    if (typeof window.siteTooling?.trackEvent === 'function') {
      if (flushTimer !== null) window.clearInterval(flushTimer);
      flushTimer = null;
      flushQueue();
    } else if (attempts >= 20) {
      if (flushTimer !== null) window.clearInterval(flushTimer);
      flushTimer = null;
      pendingQueue.length = 0;
    }
  }, 500);
}

export function trackEvent(
  name: string,
  properties?: SiteToolingEventProperties,
): void {
  if (typeof window === 'undefined') return;
  if (typeof window.siteTooling?.trackEvent === 'function') {
    window.siteTooling.trackEvent(name, properties);
    return;
  }
  pendingQueue.push([name, properties]);
  scheduleFlush();
}

const CAMPAIGN_STORAGE_KEY = 'sts_campaign';
const CAMPAIGN_FIRED_KEY = 'sts_campaign_fired';
const UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

function readStoredCampaign(): SiteToolingEventProperties {
  try {
    const raw = window.sessionStorage.getItem(CAMPAIGN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SiteToolingEventProperties) : {};
  } catch {
    return {};
  }
}

// Captures UTM parameters + referrer on the first landing of a session, fires a
// `campaign_landing` event once, and persists the values so later conversion
// events (sign_up, begin_checkout, purchase) can be attributed to the campaign.
export function captureCampaignAttribution(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const fromUrl: SiteToolingEventProperties = {};
  for (const key of UTM_PARAMS) {
    const value = params.get(key);
    if (value) fromUrl[key] = value;
  }

  if (Object.keys(fromUrl).length > 0) {
    if (document.referrer) fromUrl.referrer = document.referrer;
    try {
      window.sessionStorage.setItem(
        CAMPAIGN_STORAGE_KEY,
        JSON.stringify(fromUrl),
      );
    } catch {
      // storage unavailable — attribution just won't persist
    }

    try {
      if (!window.sessionStorage.getItem(CAMPAIGN_FIRED_KEY)) {
        window.sessionStorage.setItem(CAMPAIGN_FIRED_KEY, '1');
        trackEvent('campaign_landing', {
          ...fromUrl,
          page: window.location.pathname,
        });
      }
    } catch {
      trackEvent('campaign_landing', {
        ...fromUrl,
        page: window.location.pathname,
      });
    }
  }
}

// Returns the campaign properties captured this session, or {} when the visit
// was not campaign-driven. Spread into conversion events for attribution.
export function getCampaignProperties(): SiteToolingEventProperties {
  if (typeof window === 'undefined') return {};
  return readStoredCampaign();
}
