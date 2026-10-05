'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureCampaignAttribution, trackEvent } from '@/lib/analytics';

const SCROLL_DEPTHS = [25, 50, 75, 100];
const TIME_MILESTONES = [30, 60, 120];

// Fires per-page-view engagement events: `page_scroll` at depth thresholds and
// `time_on_page` at stay-duration milestones. Also captures campaign (UTM)
// attribution on first mount. Rendered once in the root layout.
export function EngagementTracker() {
  const pathname = usePathname();

  useEffect(() => {
    captureCampaignAttribution();
    // Only capture on the initial mount; route changes keep session attribution.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const reachedDepths = new Set<number>();

    const onScroll = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const percent = Math.min(
        100,
        Math.round((window.scrollY / scrollable) * 100),
      );
      for (const depth of SCROLL_DEPTHS) {
        if (percent >= depth && !reachedDepths.has(depth)) {
          reachedDepths.add(depth);
          trackEvent('page_scroll', {
            depth_percent: depth,
            page: pathname,
          });
        }
      }
    };

    const timers = TIME_MILESTONES.map((seconds) =>
      window.setTimeout(() => {
        trackEvent('time_on_page', { seconds, page: pathname });
      }, seconds * 1000),
    );

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [pathname]);

  return null;
}
