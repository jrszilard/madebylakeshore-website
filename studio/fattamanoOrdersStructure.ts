import type { StructureBuilder, StructureResolver } from 'sanity/structure';

const orderList = (S: StructureBuilder, title: string, filter: string) =>
  S.documentList()
    .title(title)
    .schemaType('fattamanoCheckoutSession')
    .filter(`_type == "fattamanoCheckoutSession" && (${filter})`)
    .defaultOrdering([{ field: 'createdAt', direction: 'desc' }]);

export const fattamanoOrdersStructure: StructureResolver = (S) =>
  S.list()
    .title('fattamano Orders')
    .items([
      S.listItem()
        .title('New — needs attention')
        .child(orderList(S, 'New orders', 'paymentStatus == "paid" && coalesce(fulfillmentStatus, "new") == "new"')),
      S.listItem()
        .title('Packing')
        .child(orderList(S, 'Packing', 'fulfillmentStatus == "packing"')),
      S.listItem()
        .title('Shipped')
        .child(orderList(S, 'Shipped', 'fulfillmentStatus == "shipped"')),
      S.listItem()
        .title('Notification failures')
        .child(orderList(S, 'Notification failures', 'notificationStatus == "failed"')),
      S.divider(),
      S.listItem()
        .title('All orders')
        .child(orderList(S, 'All orders', 'true')),
      S.listItem()
        .title('Aggregate funnel counters')
        .schemaType('fattamanoAnalyticsDaily')
        .child(
          S.documentTypeList('fattamanoAnalyticsDaily')
            .title('Aggregate funnel counters')
            .defaultOrdering([{ field: 'day', direction: 'desc' }]),
        ),
    ]);
