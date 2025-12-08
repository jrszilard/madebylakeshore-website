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
                .title('Artwork')
                .schemaType('artwork')
                .child(
                  S.documentTypeList('artwork')
                    .title('All Artwork')
                    .defaultOrdering([{ field: 'year', direction: 'desc' }])
                ),
              S.listItem()
                .title('By Category')
                .child(
                  S.list()
                    .title('Categories')
                    .items([
                      S.listItem()
                        .title('Paintings')
                        .child(
                          S.documentList()
                            .title('Paintings')
                            .filter('_type == "artwork" && category == "painting"')
                        ),
                      S.listItem()
                        .title('Drawings')
                        .child(
                          S.documentList()
                            .title('Drawings')
                            .filter('_type == "artwork" && category == "drawing"')
                        ),
                      S.listItem()
                        .title('Writing')
                        .child(
                          S.documentList()
                            .title('Writing')
                            .filter('_type == "artwork" && category == "writing"')
                        ),
                      S.listItem()
                        .title('Mixed Media')
                        .child(
                          S.documentList()
                            .title('Mixed Media')
                            .filter('_type == "artwork" && category == "mixed-media"')
                        ),
                    ])
                ),
              S.listItem()
                .title('Collections')
                .schemaType('artCollection')
                .child(S.documentTypeList('artCollection').title('Collections')),
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
