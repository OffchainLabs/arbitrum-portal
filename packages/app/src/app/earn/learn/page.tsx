'use client';

import { Card } from '@/components/ui/card';
import { mockBlogPosts, mockEducationCards } from '@/lib/earn/mock-data';

function EducationCardItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="cursor-pointer border-gray-800 bg-gray-900/50 p-6 transition-colors hover:bg-gray-800/50">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </Card>
  );
}

function BlogPostCard({
  title,
  image,
  tag,
}: {
  title: string;
  image: string;
  tag: string;
}) {
  return (
    <Card className="cursor-pointer overflow-hidden border-gray-800 bg-gray-900/50 transition-transform hover:scale-[1.02]">
      {/* Placeholder Image */}
      <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800">
        <div className="flex h-full items-center justify-center">
          <p className="text-xs text-gray-500">Image Placeholder</p>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-3 inline-block rounded bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300">
          {tag}
        </div>
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="mt-4 flex gap-2">
          {/* Logo placeholders */}
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
            <span className="text-xs">A</span>
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500">
            <span className="text-xs">E</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function LearnPage() {
  const educationCards = mockEducationCards;
  const blogPosts = mockBlogPosts;

  const introCards = educationCards.filter((c) => c.category === 'intro');
  const advancedCards = educationCards.filter((c) => c.category === 'advanced');

  return (
    <div className="space-y-12">
      {/* Intro Docs Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Intro Docs</h2>
          <button className="text-sm text-gray-400 hover:text-white">
            view all
          </button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {introCards.map((card) => (
            <EducationCardItem
              key={card.id}
              title={card.title}
              description={card.description}
            />
          ))}
        </div>
      </div>

      {/* Dive Deeper Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dive Deeper</h2>
          <button className="text-sm text-gray-400 hover:text-white">
            view all
          </button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {advancedCards.map((card) => (
            <EducationCardItem
              key={card.id}
              title={card.title}
              description={card.description}
            />
          ))}
        </div>
      </div>

      {/* Blog Posts Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Blog Posts</h2>
          <button className="text-sm text-gray-400 hover:text-white">
            view all
          </button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <BlogPostCard
              key={post.id}
              title={post.title}
              image={post.image}
              tag={post.tag}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
