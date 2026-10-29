#!/usr/bin/env bash
# Deploy Design & Other Stories as committed (HEAD) to Cloudflare, built from a clean export of the repo, never from
# the working tree: that holds .env (real keys, which a build would inline) and other work's untracked files.
#   apps/designandotherstories/scripts/deploy-cloudflare.sh             the site Worker (daos)
#   apps/designandotherstories/scripts/deploy-cloudflare.sh apex        the bare-domain redirect Worker; at the
#                                                                       cutover only, as it takes that DNS over
#   ... --dry-run                                                       build and check, upload nothing
# The build needs the Stripe publishable key, which goes into the checkout page (it's public, the pk_ key):
#   PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... apps/designandotherstories/scripts/deploy-cloudflare.sh
set -euo pipefail
app=apps/designandotherstories
what=site
dry=()
for arg in "$@"; do
  case $arg in
    apex) what=apex ;;
    --dry-run) dry=(--dry-run) ;;
    *) echo "usage: $0 [apex] [--dry-run]" >&2; exit 2 ;;
  esac
done
if [ "$what" = site ]; then
  : "${PUBLIC_STRIPE_PUBLISHABLE_KEY:?set PUBLIC_STRIPE_PUBLISHABLE_KEY, the pk_ key the checkout page uses}"
fi
repo=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
echo "deploying $what from $(git -C "$repo" log --oneline -1 HEAD)"
git -C "$repo" archive HEAD | tar -x -C "$out"
cd "$out"
# With a system libvips installed (the workshop computer has one), sharp tries to compile itself against it
# instead of using its prebuilt binary, and the install fails.
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci --no-audit --no-fund
cd "$app"
if [ "$what" = apex ]; then
  npx wrangler deploy "${dry[@]}" --config workers/apex-redirect/wrangler.jsonc
else
  PUBLIC_SANITY_PROJECT_ID=pp3625pq PUBLIC_SANITY_DATASET=production npm run build
  npx wrangler deploy "${dry[@]}"
fi
