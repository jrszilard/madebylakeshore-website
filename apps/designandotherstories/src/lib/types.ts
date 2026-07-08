export type DaosProductType = 'artwork' | 'shopProduct';

export interface StyleOption {
  label: string;
}

export interface ShippingZone {
  label: string;
  countryCodes: string[];
  rateCents: number;
  // When the cart subtotal (cents) reaches this, the zone ships free. Omit to
  // always charge the flat rate.
  freeShippingThresholdCents?: number;
}

export interface DaosShopSettings {
  shippingZones?: ShippingZone[];
}

// One line in the cart (client). `type` is convenience for the UI; the server
// re-derives it authoritatively from Sanity rows.
export interface CartItem {
  productId: string; // Sanity _id
  type: DaosProductType;
  slug: string;
  title: string;
  priceCents: number;
  qty: number;
  styleLabel?: string; // selected style variant (e.g. "Red")
}

// Authoritative product row fetched server-side at checkout/webhook.
// `price` is USD dollars (converted to cents in buildOrderLines). `available`
// is normalized in GROQ. `stock` is numeric for limited shopProducts, null for
// unlimited shopProducts, and absent/null for artwork.
export interface ProductRow {
  _id: string;
  _type: DaosProductType;
  title: string;
  price?: number;
  available: boolean;
  stock?: number | null;
}
