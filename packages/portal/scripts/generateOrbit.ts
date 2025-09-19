import { Client } from '@notionhq/client';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

import fs from 'fs';
import dotenv from 'dotenv';

import { queryDatabase, sendErrorToSlack } from '../.notion/utils';
import { createParser } from '.././.notion/parser';
import {
  Category,
  OrbitChain,
  EntityType,
  OrbitChainTeamMember,
} from '../common/types';
import { prepareJSON, publicFolder, validateOrbitEntities } from './utils';
import { validatedSlug, withImages } from './utils';
import { sortByRank } from '../common/sort';
import { generateEntityImage } from './generateOgImages';

dotenv.config({ path: '.env.local' });

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

function fetchOrbitChains(): Promise<PageObjectResponse[]> {
  return queryDatabase(notion, {
    database_id: process.env.NOTION_ORBIT_CHAINS_DATABASE_ID!,
  });
}

let valueInsideBracketsRegexp = /\(([^)]+)\)/;
function parseTeamMembers(commaSeparatedMembers: string, chainTitle?: string) {
  const members: OrbitChainTeamMember[] = [];

  try {
    commaSeparatedMembers.split(',').forEach((memberDetails) => {
      try {
        const memberName = memberDetails.split('(')[0].trim();
        let memberLinkMatches = valueInsideBracketsRegexp.exec(memberDetails);
        const memberLink = memberLinkMatches?.[1]?.trim();
        if (memberLink) {
          members.push({
            primaryText: memberName,
            link: memberLink,
          });
        }
      } catch (e) {
        console.log(
          `Error parsing a team member for Orbit chain: ${chainTitle}`,
        );
        // just skip the member
      }
    });
    return members;
  } catch (error) {
    console.log(`Error parsing team members for Orbit chain: ${chainTitle}`);
    return [];
  }
}

function parseOrbitChains(
  pageObjectResponse: PageObjectResponse,
  categories: Category[],
): OrbitChain & { entityType: EntityType.OrbitChain } {
  const parser = createParser(pageObjectResponse);
  const chainTitle = parser.parseTitleColumn('Title');

  try {
    let categoryId;

    if (parser.parseRelationRawColumn('Category')[0]) {
      categoryId = categories.find(
        (category) =>
          category.id === parser.parseRelationRawColumn('Category')[0].id,
      )?.slug;
    }

    if (!categoryId) {
      throw Error(
        `Category not found for Orbit Chain: ${parser.parseTitleColumn(
          'Title',
        )}`,
      );
    }

    return {
      id: pageObjectResponse.id,
      title: chainTitle,
      entityType: EntityType.OrbitChain,
      slug: validatedSlug(parser.parseRichTextColumn('Slug').toLowerCase()),
      categoryId,
      images: {
        logoUrl: parser.parseFileColumn('Logo', false),
        bannerUrl: parser.parseFileColumn('Banner', true),
      },
      description: parser.parseOptionalTextColumn('Description'),
      isFeaturedOnOrbitPage: parser.parseCheckboxColumn('Orbit Spotlight'),
      links: {
        website: parser.parseURLColumn('Website Link'),
        discord: parser.parseURLColumn('Discord Link'),
        twitter: parser.parseURLColumn('Twitter Link'),
        github: parser.parseURLColumn('GitHub Link'),
        news: parser.parseURLColumn('News Link'),
        docs: parser.parseURLColumn('Docs Link'),
      },
      chain: {
        chainId: parser.parseNumberColumn('Chain ID'),
        layer: parser.parseNumberColumn('Layer'),
        token: parser.parseOptionalTextColumn('Chain Token'),
        tokenAddress: parser.parseURLColumn('Chain Token Link'),
        parentChain: parser.parseOptionalSingleSelectColumn('Parent Chain'),
        deployerTeam: parser.parseOptionalSingleSelectColumn('Deployer Team'),
        status: parser.parseOptionalSingleSelectColumn('Chain Status'),
        type: parser.parseOptionalSingleSelectColumn('Chain Type'),
        bridgeUrl: parser.parseURLColumn('Bridge Link'),
        rpcUrl: parser.parseURLColumn('RPC Link'),
        blockExplorerUrl: parser.parseURLColumn('Block Explorer Link'),
        gasFee: parser.parseOptionalTextColumn('Gas Fee'),
      },
      color: {
        primary: parser.parseOptionalTextColumn('Primary Color'),
        secondary: parser.parseOptionalTextColumn('Secondary Color'),
      },
      teamMembers: parseTeamMembers(
        parser.parseOptionalTextColumn('Team Members Config') || '',
        chainTitle,
      ),
    };
  } catch (error) {
    console.log(`Error parsing the orbit chain: ${chainTitle}`);
    throw error;
  }
}

async function start() {
  // first fetch the categories already generated from the notion:generate script
  let categories: Category[] = [];
  try {
    const categoryJson = JSON.parse(
      fs.readFileSync(
        publicFolder('/__auto-generated-categories.json'),
        'utf8',
      ),
    );
    categories = categoryJson.content as Category[];
  } catch (e) {
    throw Error(
      'Error while fetching auto-generated-categories. Please ensure that categories are generated first.',
    );
  }

  console.log('Fetching orbit chains from Notion...');
  const orbitChainsWithoutImages = (await fetchOrbitChains()).map(
    (response: PageObjectResponse) => parseOrbitChains(response, categories),
  );

  // validate orbit project entities
  validateOrbitEntities(orbitChainsWithoutImages, categories);

  const orbitChainsWithImages = await Promise.all(
    orbitChainsWithoutImages.map((orbitChain: OrbitChain) =>
      withImages(orbitChain),
    ),
  );
  const orbitChains = orbitChainsWithImages.sort(sortByRank);
  console.log('Writing to __auto-generated-orbitChains.json...');
  fs.writeFileSync(
    publicFolder('/__auto-generated-orbitChains.json'),
    prepareJSON(orbitChains),
  );

  console.log('Generating OG Images...');
  for (const orbitChain of orbitChainsWithImages) {
    await generateEntityImage({
      entityType: EntityType.OrbitChain,
      title: orbitChain.title,
      slug: orbitChain.slug,
      logoUrl: orbitChain.images.logoUrl,
      bannerUrl: orbitChain.images.bannerUrl,
    });
  }
}

async function main() {
  try {
    await start();
  } catch (error: Error | any) {
    console.error('Error while fetching orbits from Notion');
    await sendErrorToSlack({
      title: 'Error in Orbit Notion generator (Github action)',
      error:
        error?.message ?? 'Check Github Actions for complete error details',
    });
    throw error;
  }
}

main();
