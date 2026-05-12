import type { StructureResolver } from 'sanity/structure';

export const fattamanoStructure: StructureResolver = (S) =>
  S.list()
    .title('fattamano')
    .items([
      S.listItem()
        .title('Settings')
        .child(
          S.document()
            .schemaType('fattamanoSettings')
            .documentId('fattamanoSettings')
            .title('Settings')
        ),
      S.divider(),
      S.listItem()
        .title('Products')
        .schemaType('fattamanoProduct')
        .child(
          S.documentTypeList('fattamanoProduct')
            .title('Products')
            .defaultOrdering([{ field: 'dateAdded', direction: 'desc' }])
        ),
    ]);
