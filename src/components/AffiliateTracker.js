'use client';
import { useEffect } from 'react';

const COOKIE_NAME = 'sl_ref';
const CLICK_ID_COOKIE = 'sl_click_id';
const COOKIE_DAYS = 30;

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getAffiliateCode() {
  if (typeof document === 'undefined') return null;
  return getCookie(COOKIE_NAME);
}

export function getAffiliateClickId() {
  if (typeof document === 'undefined') return null;
  return getCookie(CLICK_ID_COOKIE);
}

export default function AffiliateTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (!ref) return;

    const code = ref.toUpperCase().trim().slice(0, 50);

    // Set/refresh cookie for 30 days
    setCookie(COOKIE_NAME, code, COOKIE_DAYS);

    // Record the click server-side
    fetch('/api/affiliate/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        landing_page: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.click_id) {
          setCookie(CLICK_ID_COOKIE, data.click_id, COOKIE_DAYS);
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
