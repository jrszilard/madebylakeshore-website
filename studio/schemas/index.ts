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
import book from './documents/book';
import writingPiece from './documents/writingPiece';
import event from './documents/event';
import artistProfile from './documents/artistProfile';

// Incubator documents
import digitalProject from './documents/digitalProject';
import buildLog from './documents/buildLog';

// Object types
import blockContent from './objects/blockContent';
import codeBlock from './objects/codeBlock';
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
  book,
  writingPiece,
  event,
  artistProfile,
  digitalProject,
  buildLog,
  
  // Objects
  blockContent,
  codeBlock,
  seo,
  figure,
];
