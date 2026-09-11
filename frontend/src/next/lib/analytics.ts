import { useEffect } from 'react';
import { useLocation } from 'react-router';

export const GA_MEASUREMENT_ID = 'G-TVNKZWMBBC';

const DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isCollectionDisabled() {
  return Boolean((window as Window & Record<string, unknown>)[DISABLE_KEY]);
}

export type AnalyticsParams = Record<string, string | number | boolean>;

function canTrack() {
  if (typeof window === 'undefined') return false;
  if (isLocalHost(window.location.hostname) || isCollectionDisabled()) return false;
  return typeof window.gtag === 'function';
}

export function trackEvent(name: string, params?: AnalyticsParams) {
  if (!canTrack()) return;
  window.gtag!('event', name, params);
}

export function trackCountryPage(input: { name: string; iso?: string | null; slug?: string | null }) {
  const params: AnalyticsParams = { country_name: input.name };
  if (input.iso) params.country_iso = input.iso;
  if (input.slug) params.country_slug = input.slug;
  trackEvent('view_country', params);
}

export function trackExpandCountryCorridors(input: {
  name: string;
  iso?: string | null;
  corridor_count?: number;
}) {
  const params: AnalyticsParams = { country_name: input.name };
  if (input.iso) params.country_iso = input.iso;
  if (input.corridor_count != null) params.corridor_count = input.corridor_count;
  trackEvent('expand_country_corridors', params);
}

/**
 * Keep gtag's page fields in sync after React updates the document title.
 * Does not send a page_view — Enhanced Measurement already records History API navigations.
 */
export function useGoogleAnalytics() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (isLocalHost(window.location.hostname) || isCollectionDisabled()) return;
    if (typeof window.gtag !== 'function') return;

    const timer = window.setTimeout(() => {
      window.gtag?.('config', GA_MEASUREMENT_ID, {
        update: true,
        page_title: document.title,
        page_location: window.location.href,
        page_path: `${pathname}${search}`,
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname, search]);
}
