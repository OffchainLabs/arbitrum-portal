import Image from 'next/image';
import { PlayCircleIcon } from '@heroicons/react/24/solid';
import { FullProject } from '@/common/types';
import { Card } from '@/components/Card';

// get youtube video id from a url provided
function getYoutubeVideoId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function getYoutubeLink(providedVideoLink: string) {
  const link = providedVideoLink.toLowerCase().trim();

  // check if its a youtube embed link, if not return false
  if (link.includes('you') && link.includes('embed')) return link;

  // if its a youtube link but not embed link, try and get id from it to generate it's embed link
  const youtubeVideoId = getYoutubeVideoId(providedVideoLink);
  if (youtubeVideoId) return `https://www.youtube.com/embed/${youtubeVideoId}`;

  // else, it's most likely non-youtube, or YT playlist or page, not a video that can be embedded
  return false;
}

export const VideoWidget = ({ project }: { project: FullProject }) => {
  if (!project.links.video) return null;

  // detect if it's a youtube video, then show a YT embed
  const youtubeLink = getYoutubeLink(project.links.video);

  if (!youtubeLink) {
    return (
      <Card
        cardType="externalLink"
        className="relative col-span-1 h-[350px] gap-4 bg-default-black p-4 sm:col-span-4 lg:row-span-4 lg:text-xl"
        href={project.links.video}
        analyticsProps={{
          eventName: 'Project Panel Clicks',
          eventProperties: { Link: 'Video' },
        }}
      >
        <span className="text-lg">Product Demo</span>

        <Image
          alt="preview image"
          src={project.images.bannerUrl ?? project.images.logoUrl}
          fill
          className="filer opacity-70 blur-lg"
        />

        <Image
          alt="logo"
          className="absolute left-3 top-3 overflow-hidden rounded-full"
          src={project.images.logoUrl}
          width={30}
          height={30}
        />

        <div className="pointer-events-none relative m-auto -mt-4 flex h-full w-full flex-col items-center justify-center">
          <PlayCircleIcon className="h-16 w-16 opacity-30" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative col-span-1 m-auto flex h-[350px] flex-col gap-4 rounded-lg bg-default-black p-4 sm:col-span-4 lg:row-span-4 lg:text-xl">
      <span className="text-lg">Product Demo</span>

      <iframe
        width="100%"
        height="100%"
        src={youtubeLink}
        title={`${project.title} - YouTube video`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </Card>
  );
};
