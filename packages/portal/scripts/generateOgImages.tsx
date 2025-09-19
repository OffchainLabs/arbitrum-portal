import fs from 'fs';
import sharp from 'sharp';
import satori, { Font } from 'satori';
import { EntityType } from '../common/types';

const dimensions = {
  width: 1200,
  height: 627,
} as const;

async function getFonts(): Promise<Font[]> {
  const unica77_regular = fs.readFileSync('./font/Unica77LL-Regular.otf');
  const unica77_medium = fs.readFileSync('./font/Unica77LL-Medium.otf');

  return [
    {
      name: 'Unica77',
      data: unica77_regular,
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Unica77',
      data: unica77_medium,
      weight: 500,
      style: 'normal',
    },
  ];
}

export const generateEntityImage = async ({
  logoUrl,
  bannerUrl,
  title,
  slug,
  entityType,
}: {
  title: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  entityType: EntityType;
}) => {
  if (!logoUrl || !bannerUrl) {
    return;
  }

  try {
    const fonts = await getFonts();

    const mainLogo = await sharp(fs.readFileSync(`./public${logoUrl}`))
      .resize({ height: dimensions.height })
      .png()
      .toBuffer();

    const bgBanner = await sharp(fs.readFileSync(`./public${bannerUrl}`))
      .resize({ height: dimensions.height })
      .png()
      .toBuffer();

    const arbitrumLogo = await sharp(
      fs.readFileSync(
        entityType === EntityType.Project
          ? './public/images/arbitrum-logo-white.svg'
          : './public/images/orbit/orbitLogo.svg',
      ),
    )
      .resize({
        fit: 'contain',
        background: 'transparent',
        height: 123,
        width: 620,
      })
      .toBuffer();

    const imageData = (
      <div
        style={{
          background: 'black',
          width: dimensions.width + 'px',
          height: dimensions.height + 'px',
          display: 'flex',
          flexDirection: 'column',
          gap: '50px',
          position: 'relative',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '50px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            height: '100vw',
            width: '100vw',
            top: 0,
            left: 0,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundImage: `url(data:image/png;base64,${bgBanner.toString(
              'base64',
            )})`,
            filter: 'blur(5px)',
          }}
        />

        {/* Black overlay */}
        <div
          style={{
            position: 'absolute',
            height: '100vh',
            width: '100vw',
            top: 0,
            left: 0,
            background: '#000000CC',
          }}
        />

        {/* Project logo and title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${mainLogo.toString('base64')}`}
            alt={`${title} Logo`}
            width={250}
            style={{
              borderRadius: '20px',
              overflow: 'hidden',
            }}
          />

          <span
            style={{
              fontSize: 50,
              fontFamily: 'Unica77',
              color: 'white',
              fontWeight: '500',
            }}
          >
            {title}
          </span>
        </div>

        {/* Arbitrum logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${arbitrumLogo.toString('base64')}`}
          alt="Arbitrum Logo"
          width={280}
        />
      </div>
    );

    const svg = await satori(imageData, { ...dimensions, fonts });

    const filePath = `./public/images/__auto-generated/open-graph/${entityType}-${slug}.jpg`;

    await sharp(Buffer.from(svg))
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(filePath);

    console.log(`Generated ${filePath}`);
  } catch (e) {
    console.log(`Error in generating image for ${entityType}: `, title, e);
  }
};
