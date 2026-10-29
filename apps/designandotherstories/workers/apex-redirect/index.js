// The bare domain sends its visitor to the same path on https://www.designandotherstories.com with a permanent
// (308) redirect, as Vercel did before the move to Cloudflare. www is the site's address: Stripe's webhook calls it,
// and a webhook doesn't follow redirects. The hostname is this Worker's custom domain (wrangler.jsonc beside this).
export default {
  fetch(request) {
    const { pathname, search } = new URL(request.url);
    return Response.redirect(`https://www.designandotherstories.com${pathname}${search}`, 308);
  },
};
