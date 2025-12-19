import { createClient, type SanityClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

export interface SanityConfig {
  projectId: string;
  dataset?: string;
  apiVersion?: string;
  token?: string;
}

const DEFAULT_API_VERSION = '2024-01-01';

// Factory function to create a Sanity client with explicit config
export function createSanityClientWithConfig(config: SanityConfig) {
  if (!config.projectId) {
    throw new Error(
      'Sanity projectId is required. Please set PUBLIC_SANITY_PROJECT_ID environment variable.'
    );
  }

  const client = createClient({
    projectId: config.projectId,
    dataset: config.dataset || 'production',
    apiVersion: config.apiVersion || DEFAULT_API_VERSION,
    useCdn: true,
  });

  const writeClient = createClient({
    projectId: config.projectId,
    dataset: config.dataset || 'production',
    apiVersion: config.apiVersion || DEFAULT_API_VERSION,
    useCdn: false,
    token: config.token,
  });

  const builder = imageUrlBuilder(client);

  function urlFor(source: SanityImageSource) {
    return builder.image(source);
  }

  async function fetchSanity<T>(query: string, params = {}): Promise<T> {
    return client.fetch<T>(query, params);
  }

  return {
    client,
    writeClient,
    urlFor,
    fetchSanity,
  };
}

// Common GROQ queries
export const queries = {
  // MadeByLakeshore queries
  allServices: `*[_type == "service"] | order(order asc) {
    _id,
    title,
    slug,
    tagline,
    description,
    icon,
    offerings,
    "consultant": consultant->{ name, slug, image, calendlyUrl }
  }`,

  serviceBySlug: `*[_type == "service" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    tagline,
    description,
    icon,
    offerings,
    "consultant": consultant->{ name, slug, image, calendlyUrl, shortBio }
  }`,

  allCaseStudies: `*[_type == "caseStudy"] | order(coalesce(order, 100) asc, publishedAt desc) {
    _id,
    title,
    slug,
    client,
    category,
    excerpt,
    featuredImage,
    metrics,
    "author": author->{ name, slug, image }
  }`,

  featuredCaseStudies: `*[_type == "caseStudy" && featured == true] | order(coalesce(order, 100) asc, publishedAt desc)[0...3] {
    _id,
    title,
    slug,
    client,
    category,
    excerpt,
    featuredImage,
    metrics,
    "author": author->{ name, slug, image }
  }`,

  caseStudyBySlug: `*[_type == "caseStudy" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    client,
    clientLogo,
    category,
    featuredImage,
    gallery,
    excerpt,
    challenge,
    solution,
    results,
    metrics,
    "author": author->{ name, slug, image, bio },
    "testimonial": testimonial->{ quote, authorName, authorTitle, company },
    seo
  }`,

  allPeople: `*[_type == "person"] {
    _id,
    name,
    slug,
    role,
    image,
    shortBio,
    calendlyUrl
  }`,

  // DesignAndOtherStories queries
  allArtwork: `*[_type == "artwork"] | order(year desc) {
    _id,
    title,
    slug,
    category,
    images,
    medium,
    dimensions,
    price,
    originalAvailable,
    printsAvailable,
    "collection": collection->{ title, slug }
  }`,

  artworkByCategory: `*[_type == "artwork" && category == $category] | order(year desc) {
    _id,
    title,
    slug,
    category,
    images,
    medium,
    price,
    originalAvailable
  }`,

  artworkBySlug: `*[_type == "artwork" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    category,
    images,
    description,
    story,
    medium,
    dimensions,
    year,
    price,
    originalAvailable,
    printsAvailable,
    printOptions,
    "collection": collection->{ title, slug },
    seo
  }`,

  allCollections: `*[_type == "artCollection"] | order(order asc) {
    _id,
    title,
    slug,
    description,
    coverImage,
    "artworkCount": count(*[_type == "artwork" && references(^._id)])
  }`,

  // Incubator queries
  allProjects: `*[_type == "digitalProject"] | order(launchDate desc) {
    _id,
    title,
    slug,
    tagline,
    status,
    projectType,
    icon,
    featuredImage,
    techStack,
    liveUrl,
    githubUrl
  }`,

  projectsByStatus: `*[_type == "digitalProject" && status == $status] | order(launchDate desc) {
    _id,
    title,
    slug,
    tagline,
    status,
    techStack,
    liveUrl
  }`,

  projectBySlug: `*[_type == "digitalProject" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    tagline,
    status,
    projectType,
    icon,
    featuredImage,
    screenshots,
    description,
    techStack,
    liveUrl,
    githubUrl,
    launchDate,
    seo
  }`,

  allBuildLogs: `*[_type == "buildLog"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    publishedAt,
    "project": project->{ title, slug }
  }`,
};

// Re-export types for convenience
export type { SanityImageSource };
