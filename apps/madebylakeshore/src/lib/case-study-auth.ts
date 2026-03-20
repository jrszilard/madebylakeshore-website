import { createHmac, timingSafeEqual } from 'node:crypto';

// --- Environment ---

function getSecret(): string {
  const secret =
    import.meta.env.CASE_STUDY_SECRET ||
    (typeof process !== 'undefined' ? process.env.CASE_STUDY_SECRET : '');
  if (!secret) {
    throw new Error('CASE_STUDY_SECRET environment variable is not set.');
  }
  return secret;
}

// --- HMAC ---

export function computeHmac(slug: string, password: string): string {
  const secret = getSecret();
  return createHmac('sha256', secret).update(`${slug}:${password}`).digest('hex');
}

export function verifyCookie(slug: string, password: string, cookieValue: string): boolean {
  // Validate cookie is a valid 64-char hex string before comparing
  if (!/^[0-9a-f]{64}$/.test(cookieValue)) return false;
  const expected = computeHmac(slug, password);
  // Use timing-safe comparison to prevent timing attacks
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(cookieValue, 'hex');
  return timingSafeEqual(a, b);
}

// --- Cookie helpers ---

export function getCookieName(slug: string): string {
  return `cs_access_${slug}`;
}

export function buildCookieHeader(slug: string, password: string): string {
  const name = getCookieName(slug);
  const value = computeHmac(slug, password);
  const secure = typeof process !== 'undefined' && process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${name}=${value}; Path=/; HttpOnly${secure}; SameSite=Strict`;
}

// --- Timing-safe password comparison ---

export function passwordMatches(submitted: string, stored: string): boolean {
  // Compare HMAC digests rather than raw strings for constant-time comparison
  const secret = getSecret();
  const a = createHmac('sha256', secret).update(submitted).digest();
  const b = createHmac('sha256', secret).update(stored).digest();
  return timingSafeEqual(a, b);
}

// --- Rate limiting ---

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10; // 10 attempts per IP per minute globally

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}
