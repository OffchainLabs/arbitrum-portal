import Image from 'next/image';
import { FullProject } from '@/common/types';
import { ProjectWidget } from './ProjectWidget';

export const NFTWidget = ({ project }: { project: FullProject }) => {
  const isNFTInfoAvailable = project.meta.nftMintDate || project.links.opensea;
  const isNFT = project.categoryIds.includes('nfts');

  if (!isNFT) return null;
  if (!isNFTInfoAvailable) return null;

  return (
    <ProjectWidget>
      <ProjectWidget.Title>Minting</ProjectWidget.Title>

      {project.meta.nftMintDate && (
        <>
          <ProjectWidget.DataKey>Date of mint</ProjectWidget.DataKey>
          <ProjectWidget.DataValue>
            {project.meta.nftMintDate}
          </ProjectWidget.DataValue>
        </>
      )}

      <ProjectWidget.CTA
        link={
          project.links.opensea ??
          `https://opensea.io/assets?search[query]=${encodeURI(project.title)}`
        }
        analyticsTitle="Opensea"
      >
        <Image
          src={'/images/opensea.svg'}
          width={20}
          height={20}
          alt="OpenSea"
        />
        Get NFT
      </ProjectWidget.CTA>
    </ProjectWidget>
  );
};
