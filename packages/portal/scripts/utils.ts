import fs from 'fs';
import path from 'path';
import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';
import { Category, EntityType, OrbitChain, Project } from '../common/types';
import { downloadImage } from '../.notion/utils';

export function publicFolder(path: string = '') {
  return 'public' + path;
}

export function prepareJSON(content: any) {
  return (
    JSON.stringify(
      {
        meta: {
          timestamp: new Date().toISOString(),
        },
        content,
      },
      null,
      2,
    ) + '\n'
  );
}

type Sortable = {
  title: string;
  rank?: number;
};

export function validatedSlug(slug: string): string {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (!slugRegex.test(slug)) {
    throw new Error(`Invalid slug: ${slug}`);
  }

  return slug;
}

type Imageable<T> = T & {
  entityType?: EntityType;
  title: string;
  slug: string;
  images: {
    logoUrl: string;
    bannerUrl: string | null;
  };
};

export async function withImages<T>(entity: Imageable<T>): Promise<T> {
  try {
    const entityType = (entity.entityType ?? EntityType.Project).toLowerCase();

    const imagesFolder = `/images/${entityType}s/`;
    const originalsFolder = imagesFolder + '__originals/';

    if (!fs.existsSync(publicFolder(originalsFolder))) {
      fs.mkdirSync(publicFolder(originalsFolder), { recursive: true });
    }

    // slug will be prechecked so it won't be null here
    const logoPath = imagesFolder + `__originals/${entity.slug}-logo`;
    const bannerPath = imagesFolder + `__originals/${entity.slug}-banner`;

    const getDownloadImagePromises = () => {
      const promises = [
        downloadImage({
          fromUrl: entity.images.logoUrl,
          toPath: publicFolder(logoPath),
        }),
      ];

      if (entity.images.bannerUrl) {
        promises.push(
          downloadImage({
            fromUrl: entity.images.bannerUrl,
            toPath: publicFolder(bannerPath),
          }),
        );
      }

      return promises;
    };

    console.log(`Downloading images for ${entity.title}...`);
    const originalImages = (await Promise.all(getDownloadImagePromises()))
      //
      .map((image) =>
        publicFolder(imagesFolder + `__originals/${image.fileName}`),
      );

    console.log(`Minifying images for ${entity.title}...`);
    const minifiedImages = await imagemin(originalImages, {
      destination: publicFolder(imagesFolder),
      plugins: [
        imageminWebp({
          // 20 kB
          size: 20_480,
          method: 1,
        }),
      ],
    });

    console.log(`Removing original images for ${entity.title}...`);
    for (const image of originalImages) {
      fs.rmSync(image);
    }

    const getImages = () => {
      const banner = minifiedImages.length === 2;

      let minifiedLogoFileName = path.basename(
        minifiedImages[0].destinationPath,
      );
      let minifiedBannerFileName = null;

      if (banner) {
        minifiedBannerFileName = path.basename(
          minifiedImages[1].destinationPath,
        );
      }

      return {
        logoUrl: imagesFolder + minifiedLogoFileName,
        bannerUrl: banner ? imagesFolder + minifiedBannerFileName : null,
      };
    };

    return {
      ...entity,
      images: getImages(),
    };
  } catch (e) {
    console.log(`Error processing images for ${entity.title}`);
    throw e;
  }
}

async function processImageBatch<T>(entities: Imageable<T>[]): Promise<T[]> {
  const results: T[] = [];
  console.log(`Processing batch of ${entities.length} entities...`);

  const promises = entities.map((entity) => {
    try {
      return withImages(entity);
    } catch (e) {
      console.error(`Error processing images for ${entity.title}:`, e);
      throw e;
    }
  });

  const batchResults = await Promise.all(promises);
  results.push(...batchResults);

  return results;
}

export async function withImagesInBatches<T>(
  entities: Imageable<T>[],
  batchSize: number = 10,
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    console.log(
      `Processing batch ${i / batchSize + 1} of ${Math.ceil(
        entities.length / batchSize,
      )}...`,
    );
    const batchResults = await processImageBatch(batch);
    results.push(...batchResults);
  }

  return results;
}

function validateProjectEntity(
  project: Project,
  set: Set<string>,
  errors: string[],
) {
  if (project.subcategoryIds.length == 0) {
    errors.push(
      `\n ${errors.length + 1}. Missing subcategoryIds: ${project.title}`,
    );
  }

  if (set.has(project.slug)) {
    errors.push(`\n ${errors.length + 1}. Duplicate slug ${project.title}`);
  } else {
    set.add(project.slug);
  }
}

export function validateProjectEntities(projects: Project[]) {
  const errors: string[] = [];
  const uniqueSlugsSet = new Set<string>();
  projects.map((project: Project) =>
    validateProjectEntity(project, uniqueSlugsSet, errors),
  );
  if (errors.length !== 0) {
    throw new Error(
      `${
        errors.length
      } error(s) found while validating projects: ${errors.toString()}`,
    );
  }
}

function validateOrbitEntity(
  orbitChain: OrbitChain,
  set: Set<string>,
  categories: Category[],
  errors: string[],
) {
  const categoryId = categories.find(
    (category) => category.slug === orbitChain.categoryId,
  )?.slug;

  if (!categoryId) {
    errors.push(
      `\n ${errors.length + 1}. Category not found for Orbit Chain: ${
        orbitChain.title
      }`,
    );
  }

  if (set.has(orbitChain.slug)) {
    errors.push(`\n ${errors.length + 1}. Duplicate slug: ${orbitChain.title}`);
  } else {
    set.add(orbitChain.slug);
  }
}

export function validateOrbitEntities(
  orbitChains: OrbitChain[],
  categories: Category[],
) {
  const errors: string[] = [];
  const uniqueSlugsSet = new Set<string>();
  orbitChains.map((orbitChain: OrbitChain) =>
    validateOrbitEntity(orbitChain, uniqueSlugsSet, categories, errors),
  );
  if (errors.length !== 0) {
    throw new Error(
      `${
        errors.length
      } error(s) found while validating orbit chains: ${errors.toString()}`,
    );
  }
}
