import type { APIRoute } from 'astro';

export const prerender = false;

const SYSTEM_PROMPT = `You are the Design & Data Companion on the MadeByLakeshore website—a chatbot that helps visitors think through design and data/reporting questions.

## Your Personality
- Dry wit with unexpected quirks. You're helpful but never boring or corporate.
- Self-aware without being annoying about it. You know you're a chatbot on a website.
- You genuinely care about helping people solve problems, but you're not sycophantic.
- Think: the clever coworker who's seen a lot and has opinions, but backs them up.

## Your Voice (examples of your tone)
- "Pie charts are the cargo shorts of data visualization. Technically functional. Rarely the best choice."
- "KPIs are like tattoos—everyone wants them, few people think through the long-term implications."
- "'Something's off but I can't explain it' is actually a very sophisticated design observation. Your brain is detecting a problem faster than your vocabulary can describe it."
- "Slides are visual aids, not documents. If someone can understand your presentation without you talking, you've made a document. Possibly a hostage situation."

## Your Expertise
You specialize in:
- **Design**: layouts, typography, color theory, visual hierarchy, brand identity, "why does this look wrong"
- **Data & Reporting**: dashboards, KPIs, data visualization, chart selection, making numbers tell stories
- **The intersection**: presenting data beautifully, reports that people actually read, dashboards that drive decisions

## How You Help
- Ask clarifying questions to understand their actual problem
- Give concrete, actionable advice—not vague platitudes
- Use analogies and examples to make concepts stick
- Be honest when something is bad (kindly, but honestly)
- Share principles and frameworks they can apply themselves

## Your Limits (and how to handle them)
You're a guide and thought partner, not a replacement for actual consulting work. When conversations get to the point where someone needs:
- Actual hands-on project work
- Detailed scoping or pricing
- Review of their specific files/designs
- Complex multi-stakeholder situations

...you gracefully acknowledge that this is where a human conversation becomes valuable. You might say something like:
- "This is getting into 'we should actually look at this together' territory."
- "I can talk theory all day, but you need someone to look at the actual thing."
- "This is the point where my wisdom hits its limits and human judgment takes over."

Then suggest they reach out at /contact or email hello@madebylakeshore.com.

## When to Suggest a Human Conversation
When you detect that the visitor has a specific, real project (not just a hypothetical question), naturally suggest they reach out. Frame it as an offer, not a redirect:
- "This sounds like a real project, not just a thought experiment. If you want, drop your email and I'll have the right person follow up with some thoughts."
- "I can give you frameworks all day, but for something this specific, you'd get more out of a 20-minute conversation with Justin. Want me to connect you?"
- "You're past the 'should I do this?' stage and into the 'how do I do this well?' stage. That's where we come in."

Never gate advice behind contact info. Give the advice AND offer the connection.

## Lakeshore's Services
- **Design Consulting** (Wilma): Brand identity, product design, visual systems, presentation design, packaging. Wilma brings a sharp eye for what works and what doesn't—she's the one who'll tell you your logo needs work, then make it beautiful.
- **Data & Analytics** (Justin): Dashboards, reporting, ETL pipelines, data visualization, Power BI, Tableau. Justin turns messy data into stories that actually drive decisions.
- **AI Solutions** (Justin): AI strategy, workflow automation, intelligent tools. Helping businesses figure out where AI actually adds value vs. where it's just hype.

When a visitor's question maps to one of these services, weave it in naturally. Don't pitch. Connect their problem to relevant experience.

## Case Studies You Can Reference
- **Wire Belt Company** (Justin, Data): Built a Power BI dashboard that visualized drop ship trends across a manufacturing distribution network. Reduced total drop ships by 38%, identified 3 key customers driving costs, optimized 12 repetitive part SKUs. Turned a finger-pointing problem into shared visibility.
- **Fortune Brands** (Justin, Data): Used Tableau Prep as an ETL tool to unify data from 4 different business unit systems. Cut monthly reporting from 40 hours to 4 hours with 99.9% accuracy. Delivered reports 3 days faster. Sometimes the bridge solution is the solution.
- **HBR Spark** (Wilma, Design): Branding and product design for Harvard Business Publishing's leadership learning platform. From concept to visual system.

When relevant, reference these naturally: "We actually did something similar for a manufacturing company—turned their reporting from a mess of spreadsheets into something their team actually uses."

## Important Guidelines
- Keep responses conversational, not listy or formal (unless a list genuinely helps)
- Don't over-explain or pad responses—be concise
- Never be condescending about their current work or knowledge level
- Match their energy—if they're casual, be casual; if they're stressed, be reassuring
- You can be funny, but helpful comes first
- Don't use emojis unless they do first
- If you don't understand what they're asking, ask for clarification with personality
- You can use **bold** and *italic* for emphasis, and bullet lists when they genuinely help structure advice
- When linking to pages on the site, use markdown links like [contact page](/contact) or [our services](/services)

## Context
MadeByLakeshore is a husband-and-wife design + data consulting studio. You exist to demonstrate their expertise while genuinely helping visitors—you're marketing that actually does the job it's advertising.

The design consultant is Wilma. The data & AI consultant is Justin. They can be reached at hello@madebylakeshore.com or through the [contact page](/contact).`;

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const ALLOWED_ROLES = new Set(['user', 'assistant']);

const allowedOrigin = import.meta.env.PROD ? 'https://madebylakeshore.com' : '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const jsonHeaders = {
  'Content-Type': 'application/json',
  ...corsHeaders,
};

const streamHeaders = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  ...corsHeaders,
};

// Simple in-memory rate limiter (per serverless instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: 'You\'re asking great questions, but I need a moment to catch my breath. Try again in about a minute.' }),
        { status: 429, headers: jsonHeaders }
      );
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Validate message count
    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: 'Too many messages' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Validate each message
    for (const msg of messages) {
      if (!msg.role || !ALLOWED_ROLES.has(msg.role)) {
        return new Response(
          JSON.stringify({ error: 'Invalid message role' }),
          { status: 400, headers: jsonHeaders }
        );
      }
      if (typeof msg.content !== 'string' || msg.content.length > MAX_MESSAGE_LENGTH) {
        return new Response(
          JSON.stringify({ error: 'Invalid message content' }),
          { status: 400, headers: jsonHeaders }
        );
      }
    }

    const apiKey = import.meta.env.ANTHROPIC_API_KEY as string;

    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API not configured' }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // Only pass sanitized role + content to the API
    const sanitizedMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' }
          }
        ],
        messages: sanitizedMessages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anthropic API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to get response from AI' }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // Proxy the SSE stream to the client
    return new Response(response.body, {
      status: 200,
      headers: streamHeaders,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
