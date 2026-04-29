#!/bin/bash
# Ping search engines to re-crawl the sitemap after a deploy.
# Add to Vercel post-deploy hook or run manually.
#
# Usage: ./scripts/ping-search-engines.sh [site_url]

SITE_URL="${1:-https://designandotherstories.com}"
SITEMAP_URL="${SITE_URL}/sitemap-index.xml"

echo "Pinging search engines with sitemap: ${SITEMAP_URL}"

# Google
curl -s "https://www.google.com/ping?sitemap=${SITEMAP_URL}" > /dev/null 2>&1 && \
  echo "  ✓ Google pinged" || echo "  ✗ Google ping failed"

# Bing (also powers DuckDuckGo, Yahoo)
curl -s "https://www.bing.com/ping?sitemap=${SITEMAP_URL}" > /dev/null 2>&1 && \
  echo "  ✓ Bing pinged" || echo "  ✗ Bing ping failed"

# IndexNow (Bing, Yandex, Seznam, Naver — one ping covers all)
# Requires an API key file at public/indexnow-key.txt
# Uncomment when key is set up:
# INDEXNOW_KEY="your-key-here"
# curl -s "https://api.indexnow.org/indexnow?url=${SITE_URL}&key=${INDEXNOW_KEY}" > /dev/null 2>&1 && \
#   echo "  ✓ IndexNow pinged" || echo "  ✗ IndexNow ping failed"

echo "Done."
