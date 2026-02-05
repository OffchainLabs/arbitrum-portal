import { Metadata } from 'next';

import { Blog } from '@/portal/common/types';
import { AdvancedDocs } from '@/portal/components/Learn/AdvancedDocs';
import { Blogs } from '@/portal/components/Learn/Blogs';
import { HeroBanner } from '@/portal/components/Learn/HeroBanner';
import { IntroDocs } from '@/portal/components/Learn/IntroDocs';
import { LearnStats } from '@/portal/components/Learn/LearnStats';

const metadataContent = {
  title: 'Learn about Arbitrum',
  description: 'Nitro, Chains, Stylus, One, Nova - learn what makes all of this tech so impressive',
};

// Generate server-side metadata for this page
export function generateMetadata(): Metadata {
  return {
    title: metadataContent.title,
    description: metadataContent.description,
    openGraph: {
      title: metadataContent.title,
      description: metadataContent.description,
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: metadataContent.title,
      description: metadataContent.description,
    },
  };
}

const sortBlogs = (blogs: Blog[]) => {
  return blogs.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
};

const fetchBlogs = async () => {
  try {
    const data = await fetch('https://arbitrum.io/__blog.json');
    const blogs = sortBlogs((await data.json()).content);

    return blogs;
  } catch (e) {
    return [] as Blog[];
  }
};

export default async function LearnPage() {
  const blogs = await fetchBlogs();

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <HeroBanner />

      <LearnStats />

      <IntroDocs />

      <AdvancedDocs />

      <Blogs blogs={blogs} />
    </div>
  );
}
