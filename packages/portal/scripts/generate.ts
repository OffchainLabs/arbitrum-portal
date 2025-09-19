import { Client } from '@notionhq/client';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';

import {
  queryDatabase,
  downloadImage,
  sendErrorToSlack,
} from '../.notion/utils';
import { createParser } from '.././.notion/parser';

import {
  Subcategory,
  Project,
  ProjectWithSubcategories,
  Category,
  SubcategoryWithoutAppCount,
  AppCount,
  CommunityTalk,
  EcosystemMission,
  EntityType,
} from '../common/types';
import {
  prepareJSON,
  publicFolder,
  validatedSlug,
  withImagesInBatches,
  validateProjectEntities,
} from './utils';
import {
  formatDate,
  formatOptionalDate,
  DISPLAY_DATETIME_FORMAT_WITH_YEAR,
} from '../common/dateUtils';
import { sortByRank } from '../common/sort';
import { generateEntityImage } from './generateOgImages';

dotenv.config({ path: '.env.local' });

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

function fetchCategories(): Promise<PageObjectResponse[]> {
  return queryDatabase(notion, {
    database_id: process.env.NOTION_CATEGORIES_DATABASE_ID!,
  });
}

function fetchSubcategories(): Promise<PageObjectResponse[]> {
  return queryDatabase(notion, {
    database_id: process.env.NOTION_SUBCATEGORIES_DATABASE_ID!,
  });
}

function fetchProjects(): Promise<PageObjectResponse[]> {
  return queryDatabase(notion, {
    database_id: process.env.NOTION_PROJECTS_DATABASE_ID!,
  });
}

function fetchCommunityTalks(): Promise<PageObjectResponse[]> {
  return queryDatabase(notion, {
    database_id: process.env.NOTION_COMMUNITY_TALKS_DATABASE_ID!,
  });
}

function fetchEcosystemMissions(): Promise<PageObjectResponse[]> {
  return queryDatabase(notion, {
    database_id: process.env.NOTION_ECOSYSTEM_MISSIONS_DATABASE_ID!,
  });
}

function parseCategory(
  pageObjectResponse: PageObjectResponse,
  allSubcategories: Subcategory[] = [],
): Category {
  const parser = createParser(pageObjectResponse);

  if (!allSubcategories) {
    throw "Couldn't find subcategories";
  }

  const subcategoriesIdOnly = parser
    .parseRelationRawColumn('Subcategories')
    .map((subcategory) => subcategory.id);

  const subcategories = allSubcategories.filter((subcategory) =>
    subcategoriesIdOnly.includes(subcategory.id),
  );

  return {
    id: pageObjectResponse.id,
    title: parser.parseTitleColumn('Title'),
    slug: validatedSlug(parser.parseRichTextColumn('Slug').toLowerCase()),
    rank: parser.parseNumberColumn('Rank') ?? undefined,
    subcategories,
  };
}

function parseSubcategory(
  pageObjectResponse: PageObjectResponse,
): SubcategoryWithoutAppCount {
  const parser = createParser(pageObjectResponse);

  return {
    id: pageObjectResponse.id,
    title: parser.parseTitleColumn('Title'),
    slug: validatedSlug(parser.parseRichTextColumn('Slug').toLowerCase()),
    rank: parser.parseNumberColumn('Rank in Category') ?? undefined,
  };
}

function parseProject(pageObjectResponse: PageObjectResponse): Project {
  const parser = createParser(pageObjectResponse);
  const subcategoryIds = parser
    .parseRelationRawColumn('Category')
    .map((subcategory) => subcategory.id);
  try {
    const chains = parser.parseMultiSelectColumn('Chains');
    const chainsMap = chains.reduce((prev, curr) => {
      return { ...prev, [curr]: true };
    }, {});

    const liveIncentiveTimeFrame = parser.parseOptionalDateRangeColumn(
      'Incentive date range',
    );
    return {
      id: pageObjectResponse.id,
      title: parser.parseTitleColumn('Title'),
      slug: validatedSlug(parser.parseRichTextColumn('Slug').toLowerCase()),
      subcategoryIds,
      chains,
      rank: parser.parseOptionalNumberColumn('Rank'),
      chainsMap,
      images: {
        logoUrl: parser.parseFileColumn('Logo', false),
        bannerUrl: parser.parseFileColumn('Banner', true),
      },
      description: parser.parseOptionalTextColumn('description'),
      links: {
        website: parser.parseURLColumn('Website Link'),
        discord: parser.parseURLColumn('Discord Link'),
        twitter: parser.parseURLColumn('Twitter Link'),
        github: parser.parseURLColumn('GitHub Link'),
        coingecko: parser.parseURLColumn('Coingecko link'),
        news: parser.parseURLColumn('tweet/press support'),
        fundingNews: parser.parseURLColumn('crunchbase/fundraise'),
        video: parser.parseURLColumn('Demo video'),
        audit: parser.parseURLColumn('Audit Link'),
        opensea: parser.parseURLColumn('Main Marketplace'),
      },
      meta: {
        isLive: parser.parseCheckboxColumn('Live'),
        isArbitrumNative: parser.parseCheckboxColumn('Arbitrum Native'),
        isFeaturedOnHomePage: parser.parseCheckboxColumn('Homepage spotlight'),
        isFeaturedOnHomePageBanner:
          parser.parseCheckboxColumn('Home Page Banner'),
        isFeaturedOnCategoryPage:
          parser.parseCheckboxColumn('Category spotlight'),
        isTrending: parser.parseCheckboxColumn('Trending'),
        isPublicallyAudited: parser.parseCheckboxColumn('Public Audit'),
        auditReportDate: formatOptionalDate(
          parser.parseOptionalDateColumn('Audit Report Date'),
          DISPLAY_DATETIME_FORMAT_WITH_YEAR,
        ),
        supportedPlatforms: parser.parseMultiSelectColumn('Platform'),
        editorsNotes: parser.parseOptionalTextColumn('Editors notes'),
        nftMintDate: formatOptionalDate(
          parser.parseOptionalDateColumn('Mint Date'),
          DISPLAY_DATETIME_FORMAT_WITH_YEAR,
        ),
        foundedDate: formatOptionalDate(
          parser.parseOptionalDateColumn('Founded Time'),
          DISPLAY_DATETIME_FORMAT_WITH_YEAR,
        ),
        createdTime: formatDate(
          pageObjectResponse.created_time,
          DISPLAY_DATETIME_FORMAT_WITH_YEAR,
        ),
      },
      liveIncentives: {
        startDate: liveIncentiveTimeFrame[0],
        endDate: liveIncentiveTimeFrame[1],
        rewards: parser.parseOptionalNumberColumn('Allocated ARB Rewards'),
      },
    };
  } catch (error) {
    console.log(`Error project: ${parser.parseTitleColumn('Title')}`);
    throw error;
  }
}

function parseCommunityTalks(
  pageObjectResponse: PageObjectResponse,
): CommunityTalk {
  const parser = createParser(pageObjectResponse);

  return {
    id: pageObjectResponse.id,
    title: parser.parseTitleColumn('Topic'),
    date: parser.parseDateColumn('Scheduled Date'),
    description: parser.parseRichTextColumn('Summary') ?? '',
    link: parser.parseURLColumn('Link') ?? '',
  };
}

function parseEcosystemMissions(
  pageObjectResponse: PageObjectResponse,
): EcosystemMission {
  const parser = createParser(pageObjectResponse);

  const timeFrame = parser.parseOptionalDateRangeColumn('Time Frame');

  return {
    id: pageObjectResponse.id,
    rank: parser.parseNumberColumn('Display Rank') ?? undefined,
    title: parser.parseTitleColumn('Campaign Name'),
    status: parser.parseSingleSelectColumn('Portal Status'),
    teamsInvolved: parser.parseMultiSelectColumn('Teams Involved') ?? [],
    link: parser.parseURLColumn('Campaign Link') ?? '',
    coverImage: parser.parseFileColumn('Campaign Cover', true) || undefined,
    startDate: timeFrame[0],
    endDate: timeFrame[1],
  };
}

const missionsImageFolder = '/images/missions/';
async function downloadAndMinifyMissionImages(
  mission: EcosystemMission,
): Promise<EcosystemMission> {
  const notionImageUrl = mission.coverImage;

  if (!notionImageUrl) return mission;

  const originalsFolder = missionsImageFolder + '__originals/';

  if (!fs.existsSync(publicFolder(originalsFolder))) {
    fs.mkdirSync(publicFolder(originalsFolder), { recursive: true });
  }

  const missionsImagePath =
    missionsImageFolder + `__originals/mission-${mission.id}`;

  console.log(`Downloading images for ${mission.title}...`);
  const originalImageFile = await downloadImage({
    fromUrl: notionImageUrl,
    toPath: publicFolder(missionsImagePath),
  });
  const originalImageFileLocation = publicFolder(
    missionsImageFolder + `__originals/${originalImageFile.fileName}`,
  );
  console.log(`Minifying images for ${mission.title}...`);
  const minifiedImage = await imagemin([originalImageFileLocation], {
    destination: publicFolder(missionsImageFolder),
    plugins: [
      imageminWebp({
        // 20 kB
        size: 20_480,
        method: 1,
      }),
    ],
  });

  console.log(`Removing original images for ${mission.title}...`);

  fs.rmSync(originalImageFileLocation, { recursive: true });

  return {
    ...mission,
    coverImage:
      missionsImageFolder + path.basename(minifiedImage[0].destinationPath),
  };
}

function withSubcategories(
  project: Project,
  {
    subcategories: allSubcategories,
  }: { subcategories: SubcategoryWithoutAppCount[] },
): ProjectWithSubcategories {
  const subcategories = project.subcategoryIds.map((subCatId) => {
    const subcategory = allSubcategories.find((c) => c.id === subCatId);
    if (!subcategory) {
      throw new Error(
        `Couldn't find subcategory with id ${project.subcategoryIds}`,
      );
    }
    return subcategory;
  });

  // Omit "subcategoryIds"
  const { subcategoryIds, ...rest } = project;

  return { ...rest, subcategories };
}

function createCategoryToSubcategory(categories: Category[]) {
  let categoryToSubcategory: { [name: string]: string[] } = {};
  categories.forEach((category) => {
    categoryToSubcategory[category.slug] = category.subcategories
      .sort(sortByRank)
      .map((subCat) => subCat.slug);
  });
  return categoryToSubcategory;
}

async function start() {
  console.log('Fetching subcategories from Notion...');
  const subcategoriesWithoutAppCount = (await fetchSubcategories())
    .map((response: PageObjectResponse) => parseSubcategory(response))
    .sort(sortByRank);

  console.log('Fetching projects from Notion...');

  const parsedProjects = (await fetchProjects()).map(
    (response: PageObjectResponse) => parseProject(response),
  );

  // validate project entities
  validateProjectEntities(parsedProjects);

  const projectsWithSubcategories = parsedProjects.map((project: Project) =>
    withSubcategories(project, {
      subcategories: subcategoriesWithoutAppCount,
    }),
  );

  console.log('Processing project images in batches...');
  const projects = (await withImagesInBatches(projectsWithSubcategories))
    // Sort by title
    .sort((a, b) => a.title.localeCompare(b.title));

  console.log('Writing to __auto-generated-projects.json...');
  fs.writeFileSync(
    publicFolder('/__auto-generated-projects.json'),
    prepareJSON(projects),
  );

  const subcategoriesAppCount = projects.reduce<{
    [key: string]: AppCount;
  }>((subcategoriesAppCount, project) => {
    project.subcategories.forEach((subcategory) => {
      if (!subcategoriesAppCount[subcategory.id]) {
        subcategoriesAppCount[subcategory.id] = {
          Total: 0,
        };
      }

      project.chains.forEach((chain) => {
        if (!subcategoriesAppCount[subcategory.id][chain as keyof AppCount]) {
          subcategoriesAppCount[subcategory.id][chain as keyof AppCount] = 0;
        }
        subcategoriesAppCount[subcategory.id][chain as keyof AppCount]++;
      });

      if (project.chains.length > 0) {
        subcategoriesAppCount[subcategory.id]['Total']++;
      }
    });

    return subcategoriesAppCount;
  }, {});

  // Add app count to subcategories before writing to file
  const subcategories = subcategoriesWithoutAppCount.map((subcategory) => {
    return {
      ...subcategory,
      appCount: subcategoriesAppCount[subcategory.id] || { Total: 0 },
    };
  });

  console.log('Writing to __auto-generated-subcategories.json...');
  fs.writeFileSync(
    publicFolder('/__auto-generated-subcategories.json'),
    prepareJSON(subcategories),
  );

  console.log('Fetching categories from Notion...');
  const categories = (await fetchCategories())
    .map((response: PageObjectResponse) =>
      parseCategory(response, subcategories),
    )
    .sort(sortByRank);

  console.log('Writing to __auto-generated-categories.json...');
  fs.writeFileSync(
    publicFolder('/__auto-generated-categories.json'),
    prepareJSON(categories),
  );

  const categoriesToSubcategories = createCategoryToSubcategory(categories);

  console.log(
    'Writing to __auto-generated-categories-to-subcategories.json...',
  );
  fs.writeFileSync(
    publicFolder('/__auto-generated-categories-to-subcategories.json'),
    prepareJSON(categoriesToSubcategories),
  );

  console.log('Fetching community talks from Notion...');
  const CommunityTalks = (await fetchCommunityTalks()).map(
    (response: PageObjectResponse) => parseCommunityTalks(response),
  );

  console.log('Writing to __auto-generated-community-talks.json...');
  fs.writeFileSync(
    publicFolder('/__auto-generated-community-talks.json'),
    prepareJSON(CommunityTalks),
  );

  console.log('Fetching ecosystem missions from Notion...');
  const missions = (await fetchEcosystemMissions())
    .map((response: PageObjectResponse) => parseEcosystemMissions(response))
    .filter((row: EcosystemMission) => row.status === 'Live in portal'); // only get live projects

  fs.rmSync(publicFolder(missionsImageFolder), { recursive: true }); // clear the missions image folder before downloading
  const missionsWithImages = await Promise.all(
    missions.map(
      async (mission) => await downloadAndMinifyMissionImages(mission),
    ),
  );
  console.log('Writing to __auto-generated-ecosystem-missions.json...');
  fs.writeFileSync(
    publicFolder('/__auto-generated-ecosystem-missions.json'),
    prepareJSON(missionsWithImages.sort(sortByRank)),
  );

  console.log('Generating OG Images...');
  for (const project of projects) {
    await generateEntityImage({
      entityType: EntityType.Project,
      title: project.title,
      slug: project.slug,
      logoUrl: project.images.logoUrl,
      bannerUrl: project.images.bannerUrl,
    });
  }
}

async function main() {
  try {
    await start();
  } catch (error: Error | any) {
    console.log('Error while fetching projects from Notion');
    await sendErrorToSlack({
      title: 'Error in Projects Notion generator (Github action)',
      error:
        error?.message ?? 'Check Github Actions for complete error details',
    });
    throw error;
  }
}

main();
