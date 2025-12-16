import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

// These should be set via environment variables
const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || '';
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || 'production';
const apiVersion = '2024-01-01';

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Set to false for real-time data
});

// For authenticated requests (mutations, drafts)
export const sanityWriteClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: import.meta.env.SANITY_API_TOKEN || process.env.SANITY_API_TOKEN,
});

// Image URL builder
const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
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
  return sanityClient.fetch<T>(query, params);
}
