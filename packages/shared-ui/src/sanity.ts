import { createClient, type SanityClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

// Get environment variables - supports multiple patterns for different build systems
function getProjectId(): string {
  // Check various env var locations
  const projectId =
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SANITY_PROJECT_ID) ||
    (typeof process !== 'undefined' && process.env?.PUBLIC_SANITY_PROJECT_ID) ||
    (typeof process !== 'undefined' && process.env?.SANITY_PROJECT_ID) ||
    '';

  return projectId;
}

function getDataset(): string {
  const dataset =
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SANITY_DATASET) ||
    (typeof process !== 'undefined' && process.env?.PUBLIC_SANITY_DATASET) ||
    (typeof process !== 'undefined' && process.env?.SANITY_DATASET) ||
    'production';

  return dataset;
}

const apiVersion = '2024-01-01';

// Lazy-initialized clients
let _sanityClient: SanityClient | null = null;
let _sanityWriteClient: SanityClient | null = null;
let _imageBuilder: ReturnType<typeof imageUrlBuilder> | null = null;

// Get or create the read client
export function getSanityClient(): SanityClient {
  if (!_sanityClient) {
    const projectId = getProjectId();
    const dataset = getDataset();

    if (!projectId) {
      throw new Error(
        'Sanity projectId is required. Please set PUBLIC_SANITY_PROJECT_ID environment variable.'
      );
    }

    _sanityClient = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
    });
  }
  return _sanityClient;
}

// Legacy export for backwards compatibility - creates client on first access
export const sanityClient: SanityClient = new Proxy({} as SanityClient, {
  get(_, prop) {
    return (getSanityClient() as any)[prop];
  },
});

// Get or create the write client
export function getSanityWriteClient(): SanityClient {
  if (!_sanityWriteClient) {
    const projectId = getProjectId();
    const dataset = getDataset();
    const token =
      (typeof import.meta !== 'undefined' && import.meta.env?.SANITY_API_TOKEN) ||
      (typeof process !== 'undefined' && process.env?.SANITY_API_TOKEN) ||
      '';

    if (!projectId) {
      throw new Error(
        'Sanity projectId is required. Please set PUBLIC_SANITY_PROJECT_ID environment variable.'
      );
    }

    _sanityWriteClient = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false,
      token,
    });
  }
  return _sanityWriteClient;
}

// Legacy export for backwards compatibility
export const sanityWriteClient: SanityClient = new Proxy({} as SanityClient, {
  get(_, prop) {
    return (getSanityWriteClient() as any)[prop];
  },
});

// Image URL builder - lazy initialized
function getImageBuilder() {
  if (!_imageBuilder) {
    _imageBuilder = imageUrlBuilder(getSanityClient());
  }
  return _imageBuilder;
}

export function urlFor(source: SanityImageSource) {
  return getImageBuilder().image(source);
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

  allCaseStudies: `*[_type == "caseStudy"] | order(publishedAt desc) {
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

  featuredCaseStudies: `*[_type == "caseStudy" && featured == true] | order(publishedAt desc)[0...3] {
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

// Helper to fetch data
export async function fetchSanity<T>(query: string, params = {}): Promise<T> {
  return getSanityClient().fetch<T>(query, params);
}
