import type { StructureResolver } from 'sanity/structure';

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      // MadeByLakeshore Section
      S.listItem()
        .title('MadeByLakeshore')
        .child(
          S.list()
            .title('MadeByLakeshore')
            .items([
              S.listItem()
                .title('Studio Settings')
                .child(
                  S.document()
                    .schemaType('studioSettings')
                    .documentId('studioSettings')
                    .title('Studio Settings')
                ),
              S.listItem()
                .title('Team')
                .schemaType('person')
                .child(S.documentTypeList('person').title('Team Members')),
              S.listItem()
                .title('Services')
                .schemaType('service')
                .child(S.documentTypeList('service').title('Services')),
              S.listItem()
                .title('Case Studies')
                .schemaType('caseStudy')
                .child(S.documentTypeList('caseStudy').title('Case Studies')),
              S.listItem()
                .title('Portfolio')
                .schemaType('portfolioProject')
                .child(S.documentTypeList('portfolioProject').title('Portfolio Projects')),
              S.listItem()
                .title('Testimonials')
                .schemaType('testimonial')
                .child(S.documentTypeList('testimonial').title('Testimonials')),
              S.listItem()
                .title('Blog')
                .schemaType('blogPost')
                .child(S.documentTypeList('blogPost').title('Blog Posts')),
            ])
        ),

      S.divider(),

      // Design & Other Stories Section
      S.listItem()
        .title('Design & Other Stories')
        .child(
          S.list()
            .title('Design & Other Stories')
            .items([
              S.listItem()
                .title('Books')
                .schemaType('book')
                .child(
                  S.documentTypeList('book')
                    .title('Books')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }])
                ),
              S.listItem()
                .title('Writing Pieces')
                .schemaType('writingPiece')
                .child(
                  S.documentTypeList('writingPiece')
                    .title('Writing Pieces')
                    .defaultOrdering([{ field: 'publishedDate', direction: 'desc' }])
                ),
              S.listItem()
                .title('Events')
                .schemaType('event')
                .child(
                  S.documentTypeList('event')
                    .title('Events')
                    .defaultOrdering([{ field: 'startDate', direction: 'desc' }])
                ),
              S.listItem()
                .title('Artwork')
                .schemaType('artwork')
                .child(
                  S.documentTypeList('artwork')
                    .title('All Artwork')
                    .defaultOrdering([{ field: 'year', direction: 'desc' }])
                ),
              S.listItem()
                .title('By Type')
                .child(
                  S.list()
                    .title('By Type')
                    .items([
                      S.listItem()
                        .title('Originals')
                        .child(
                          S.documentList()
                            .title('Originals')
                            .filter('_type == "artwork" && (artworkType == "original" || !defined(artworkType))')
                            .defaultOrdering([{ field: 'year', direction: 'desc' }])
                        ),
                      S.listItem()
                        .title('Photography')
                        .child(
                          S.documentList()
                            .title('Photography')
                            .filter('_type == "artwork" && artworkType == "photography"')
                            .defaultOrdering([{ field: 'year', direction: 'desc' }])
                        ),
                    ])
                ),
              S.listItem()
                .title('Featured')
                .child(
                  S.documentList()
                    .title('Featured Artwork')
                    .filter('_type == "artwork" && featured == true')
                    .defaultOrdering([{ field: 'year', direction: 'desc' }])
                ),
              S.listItem()
                .title('By Collection')
                .child(
                  S.documentTypeList('artCollection')
                    .title('Collections')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }])
                    .child((collectionId: string) =>
                      S.documentList()
                        .title('Artwork in Collection')
                        .filter('_type == "artwork" && collection._ref == $collectionId')
                        .params({ collectionId })
                        .defaultOrdering([{ field: 'year', direction: 'desc' }])
                    )
                ),
              S.listItem()
                .title('Collections')
                .schemaType('artCollection')
                .child(S.documentTypeList('artCollection').title('Collections')),
              S.listItem()
                .title('Artist Profile')
                .child(
                  S.document()
                    .schemaType('artistProfile')
                    .documentId('artistProfile')
                    .title('Artist Profile')
                ),
            ])
        ),

      S.divider(),

      // Incubator Section
      S.listItem()
        .title('Incubator')
        .child(
          S.list()
            .title('Incubator at Lakeshore')
            .items([
              S.listItem()
                .title('All Projects')
                .schemaType('digitalProject')
                .child(S.documentTypeList('digitalProject').title('Digital Projects')),
              S.listItem()
                .title('By Status')
                .child(
                  S.list()
                    .title('Project Status')
                    .items([
                      S.listItem()
                        .title('🚀 Launched')
                        .child(
                          S.documentList()
                            .title('Launched Projects')
                            .filter('_type == "digitalProject" && status == "launched"')
                        ),
                      S.listItem()
                        .title('🔨 In Development')
                        .child(
                          S.documentList()
                            .title('In Development')
                            .filter('_type == "digitalProject" && status == "in-development"')
                        ),
                      S.listItem()
                        .title('🧪 Beta')
                        .child(
                          S.documentList()
                            .title('Beta Projects')
                            .filter('_type == "digitalProject" && status == "beta"')
                        ),
                      S.listItem()
                        .title('💡 Concepts')
                        .child(
                          S.documentList()
                            .title('Concept Projects')
                            .filter('_type == "digitalProject" && status == "concept"')
                        ),
                    ])
                ),
              S.listItem()
                .title('Build Logs')
                .schemaType('buildLog')
                .child(S.documentTypeList('buildLog').title('Build Logs')),
            ])
        ),
    ]);
