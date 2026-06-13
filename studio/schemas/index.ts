// Document types
import studioSettings from './documents/studioSettings';
import person from './documents/person';
import service from './documents/service';
import caseStudy from './documents/caseStudy';
import portfolioProject from './documents/portfolioProject';
import testimonial from './documents/testimonial';
import blogPost from './documents/blogPost';

// DesignAndOtherStories documents
import banner from './documents/banner';
import artwork from './documents/artwork';
import artCollection from './documents/artCollection';
import book from './documents/book';
import writingPiece from './documents/writingPiece';
import event from './documents/event';
import artistProfile from './documents/artistProfile';

// Incubator documents
import digitalProject from './documents/digitalProject';
import buildLog from './documents/buildLog';

// fattamano documents
import fattamanoProduct from './documents/fattamanoProduct';
import fattamanoSettings from './documents/fattamanoSettings';
import fattamanoCheckoutSession from './documents/fattamanoCheckoutSession';

// Object types
import blockContent from './objects/blockContent';
import codeBlock from './objects/codeBlock';
import seo from './objects/seo';
import figure from './objects/figure';

export const schemaTypes = [
  // Documents
  studioSettings,
  person,
  service,
  caseStudy,
  portfolioProject,
  testimonial,
  blogPost,
  banner,
  artwork,
  artCollection,
  book,
  writingPiece,
  event,
  artistProfile,
  digitalProject,
  buildLog,

  // fattamano documents
  fattamanoProduct,
  fattamanoSettings,
  fattamanoCheckoutSession,

  // Objects
  blockContent,
  codeBlock,
  seo,
  figure,
];
