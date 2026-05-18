import * as Sentry from '@sentry/react';
import { Providers } from './providers/Providers';
import { AppRoutes } from './routes';

// PHI scrubber patterns — strip Indian mobile numbers and common name-like keys
const PHI_KEY_RE = /\b(name|mobile|phone|email|dob|address|allerg)/i;
const MOBILE_RE = /\b[6-9]\d{9}\b/g;

function scrubPhiFromObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PHI_KEY_RE.test(k)) {
      result[k] = '[Redacted]';
    } else if (typeof v === 'string') {
      result[k] = v.replace(MOBILE_RE, '[mobile]');
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      result[k] = scrubPhiFromObject(v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result;
}

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
  environment: import.meta.env.MODE,
  // Constitution I: PHI MUST NOT appear in monitoring pipelines
  beforeSend(event) {
    if (event.extra) {
      event.extra = scrubPhiFromObject(event.extra as Record<string, unknown>);
    }
    if (event.contexts) {
      event.contexts = scrubPhiFromObject(
        event.contexts as Record<string, unknown>,
      ) as typeof event.contexts;
    }
    if (event.request?.url) {
      // Strip query strings (may contain PHI per Constitution I)
      event.request.url = event.request.url.split('?')[0] ?? event.request.url;
    }
    return event;
  },
});

export default function App() {
  return (
    <Providers>
      <AppRoutes />
    </Providers>
  );
}