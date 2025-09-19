import { NextRequest, NextResponse } from 'next/server';
import { PROJECTS } from '@/common/projects';
import {
  filterByChains,
  filterByFeatured,
  filterBySubcategories,
} from '@/common/projectFilters';
import { VALID_CHAIN_SLUGS } from '@/common/chains';
import { VALID_CATEGORY_SLUGS } from '@/common/categories';
import { VALID_SUBCATEGORY_SLUGS } from '@/common/subcategories';

export const runtime = 'edge';

const baseUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:' + process.env.PORT
    : 'https://portal.arbitrum.io';

const mapImageToImageResponse = (images: (typeof PROJECTS)[0]['images']) => {
  return {
    logoUrl: images.logoUrl ? baseUrl + images.logoUrl : null,
    bannerUrl: images.bannerUrl ? baseUrl + images.bannerUrl : null,
  };
};

const mapSubcategoriesToSubcategoryResponse = (
  subcategories: (typeof PROJECTS)[0]['subcategories'],
) => {
  return subcategories.map((subcategory) => ({
    id: subcategory.slug,
    title: subcategory.title,
  }));
};

const mapProjectsToProjectResponse = (projects: typeof PROJECTS) => {
  return projects.map((project) => {
    return {
      id: project.slug,
      title: project.title,
      description: project.description,
      url: `${baseUrl}/?project=${project.slug}`,
      images: mapImageToImageResponse(project.images),
      subcategories: mapSubcategoriesToSubcategoryResponse(
        project.subcategories,
      ),
      chains: project.chains,
    };
  });
};

// Reusable sanitizer function
const sanitizeParam = (
  paramValue: string | null,
  validValues: string[],
  paramName: string,
) => {
  if (!paramValue) return null;

  const paramArray = paramValue.split('_');
  const invalidValues = paramArray.filter((val) => !validValues.includes(val));

  if (invalidValues.length > 0) {
    throw new Error(
      `Invalid search parameter: [${paramName}] - ${invalidValues.join(', ')}`,
    );
  }

  if (paramName === 'category' && paramArray.length > 1) {
    throw new Error(
      `Invalid search parameter: [${paramName}] - only one category can be selected at a time`,
    );
  }

  return paramArray;
};

// Validation for all search params
const validateSearchParams = (searchParams: URLSearchParams) => {
  const allowedParams = new Set([
    'featured',
    'category',
    'subcategories',
    'chains',
  ]);

  // @ts-expect-error - need to bump target to es2015+
  for (const [key] of searchParams.entries()) {
    if (!allowedParams.has(key)) {
      throw new Error(`Invalid search parameter: ${key}`);
    }
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    validateSearchParams(searchParams);

    const isFeatured = searchParams.get('featured') === 'true';

    // Sanitize and validate chains, categories, and subcategories
    const chainsParam = sanitizeParam(
      searchParams.get('chains'),
      VALID_CHAIN_SLUGS,
      'chains',
    );
    const categoryParam = sanitizeParam(
      searchParams.get('category'),
      VALID_CATEGORY_SLUGS,
      'category',
    );
    const subcategoriesParam = sanitizeParam(
      searchParams.get('subcategories'),
      VALID_SUBCATEGORY_SLUGS,
      'subcategories',
    );

    let projects = PROJECTS;

    // Filter by chains
    projects = filterByChains(projects, chainsParam || []);

    // Filter by categories and subcategories
    projects = filterBySubcategories(
      projects,
      categoryParam?.[0] || '', // Single category
      subcategoriesParam || [], // Array of subcategories
    );

    // Filter by featured
    projects = filterByFeatured(projects, isFeatured);

    const projectPayload = mapProjectsToProjectResponse(projects);

    const response = NextResponse.json(projectPayload, { status: 200 });

    // Set cache control headers for 1 day (86400 seconds)
    response.headers.set('Cache-Control', 'public, s-maxage=86400');
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=86400');
    response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=86400');

    // add the CORS headers to the response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET');

    return response;
  } catch (error) {
    console.error('Error in GET /api/projects:', error);

    if (error instanceof Error) {
      // Check if it's a validation error
      if (error.message.startsWith('Invalid search parameter')) {
        return NextResponse.json(
          { error: 'Bad Request', message: error.message },
          { status: 400 },
        );
      }
      // Other known errors
      return NextResponse.json(
        { error: 'Internal Server Error', message: error.message },
        { status: 500 },
      );
    }

    // Unknown errors
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
