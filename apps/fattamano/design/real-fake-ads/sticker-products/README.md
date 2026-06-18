# Real Fake Ads sticker products

Initial sticker-first product artwork for fake-company SKUs.

## Files

- `dead-people-wanted-sticker.html` / `.png` — 3.5" × 2.5" @ 300dpi-style export for Dead People Wanted.
- `samedeck-partners-sticker.html` / `.png` — 3.5" × 2.5" @ 300dpi-style export for SameDeck Partners.
- `qr-wewantdeadpeople.png` — real QR code to `https://fattamano.com/wewantdeadpeople`.
- `qr-samedeckpartners.png` — real QR code to `https://fattamano.com/samedeckpartners`.

## Product seed

A Sanity seed file for these two sticker SKUs lives at:

`studio/content/fattamano-real-fake-ads-products.json`

Dry run from the repo root:

```bash
npm --workspace=studio run seed:fattamano -- --file=content/fattamano-real-fake-ads-products.json --dry-run
```

Apply when inventory/print readiness is confirmed:

```bash
SANITY_API_TOKEN=... npm --workspace=studio run seed:fattamano -- --file=content/fattamano-real-fake-ads-products.json --apply --update-products
```

Then redeploy fattamano so the statically generated product pages include the new Sanity product documents.

## Print notes

The PNGs are product/mockup exports suitable for catalog images and print review. Before sending to a sticker printer, verify QR scannability on a physical-size proof and confirm bleed/cutline requirements with the printer.
