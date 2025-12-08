// Document types
import person from './documents/person';
import service from './documents/service';
import caseStudy from './documents/caseStudy';
import portfolioProject from './documents/portfolioProject';
import testimonial from './documents/testimonial';
import blogPost from './documents/blogPost';

// DesignAndOtherStories documents
import artwork from './documents/artwork';
import artCollection from './documents/artCollection';

// Incubator documents
import digitalProject from './documents/digitalProject';
import buildLog from './documents/buildLog';

// Object types
import blockContent from './objects/blockContent';
import seo from './objects/seo';
import figure from './objects/figure';

export const schemaTypes = [
  // Documents
  person,
  service,
  caseStudy,
  portfolioProject,
  testimonial,
  blogPost,
  artwork,
  artCollection,
  digitalProject,
  buildLog,
  
  // Objects
  blockContent,
  seo,
  figure,
];
