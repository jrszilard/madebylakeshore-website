import type { APIRoute } from 'astro';
import { getServerSanityClient, queries } from '../../lib/sanity';
import {
  isRateLimited,
  passwordMatches,
  buildCookieHeader,
} from '../../lib/case-study-auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  try {
    // Rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many attempts. Try again in a minute.' }),
        { status: 429, headers: jsonHeaders },
      );
    }

    // Parse and validate body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const { slug, password } = body;
    if (typeof slug !== 'string' || !slug || typeof password !== 'string' || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Slug and password are required' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // Fetch stored password from Sanity (server-side, no CDN)
    const serverClient = getServerSanityClient();
    const study = await serverClient.fetch<{
      isProtected: boolean | null;
      password: string | null;
    }>(queries.caseStudyAuthCheck, { slug });

    // Don't reveal whether the study exists or is protected
    if (!study || !study.isProtected || !study.password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not found' }),
        { status: 404, headers: jsonHeaders },
      );
    }

    // Timing-safe password comparison
    if (!passwordMatches(password, study.password)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Incorrect password' }),
        { status: 401, headers: jsonHeaders },
      );
    }

    // Set session cookie and return success
    const cookieHeader = buildCookieHeader(slug, study.password);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...jsonHeaders,
        'Set-Cookie': cookieHeader,
      },
    });
  } catch (error) {
    console.error('Case study auth error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: jsonHeaders },
    );
  }
};
