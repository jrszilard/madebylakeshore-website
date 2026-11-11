// www.fattamano.com sends its visitor to the same path on https://fattamano.com with a permanent (308) redirect,
// as vercel.json did before the move to Cloudflare. The bare domain is the site's address: the stickers print it,
// and Stripe's webhook calls it (a webhook doesn't follow redirects). The hostname is this Worker's custom domain
// (wrangler.jsonc beside this).
export default {
  fetch(request) {
    const { pathname, search } = new URL(request.url);
    return Response.redirect(`https://fattamano.com${pathname}${search}`, 308);
  },
};
