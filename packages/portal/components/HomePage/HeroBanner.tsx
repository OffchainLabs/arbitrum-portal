import Image from 'next/image';
import { Card } from '@/components/Card';
import { PROJECTS } from '@/common/projects';

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i]!;
    array[i] = array[j]!;
    array[j] = temp;
  }
  return array;
}

// if the number of projects are less, then we can inflate the array to a certain size to fill up the space
function inflateArrayToSize<T>(array: T[], size: number): T[] {
  for (let i = array.length - 1; i < size; i++) {
    const randomIndex = Math.floor(array.length * Math.random());
    array.push(array[randomIndex]!);
  }
  return array;
}

// Shuffle and inflate the array to 90 projects
const projectsToHighlight = inflateArrayToSize(
  shuffleArray(
    PROJECTS.filter((project) => project.meta.isFeaturedOnHomePageBanner),
  ),
  90,
);

export const HeroBanner = () => {
  return (
    <Card className="relative flex h-[300px] flex-col justify-end bg-[#491BCA] p-6 lg:flex-row lg:items-center lg:justify-start lg:p-[50px]">
      <div className="z-20 flex shrink-0 flex-col gap-2 lg:max-w-sm lg:gap-6">
        <h1 className="text-4xl">Ethereum’s Leading Ecosystem</h1>
        <div className="text-base">
          Step into the Arbitrum Portal and discover one of the{' '}
          {Math.floor(PROJECTS.length / 100) * 100}+ applications built on
          Arbitrum
        </div>
      </div>

      <div className="absolute left-0 top-0 z-10 h-full w-full bg-gradient-to-t from-[#491BCA] from-[65%] to-transparent md:from-[35%] lg:bg-gradient-to-r lg:to-[90%]" />

      <div className="absolute left-[-30px] top-[-10px] flex h-full min-w-[600px] scale-110 flex-wrap gap-2 lg:left-auto lg:right-[-50px]">
        {projectsToHighlight.map((project) => {
          return (
            <Image
              key={project.slug}
              alt={`${project.title} logo`}
              src={project.images.logoUrl}
              width={60}
              height={60}
              className="h-[60px] w-[60px] overflow-hidden rounded-full bg-white/10"
            />
          );
        })}
      </div>
    </Card>
  );
};
