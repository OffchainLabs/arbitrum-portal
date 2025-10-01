import { formatDate } from '@/common/dateUtils';
import { Blog } from '@/common/types';
import { Card } from '@/components/Card';
import { ExternalLink } from '@/components/ExternalLink';
import { ResponsiveHorizontalScrollableLayout } from '@/components/ResponsiveHorizontalScrollableLayout';

export const Blogs = ({ blogs }: { blogs: Blog[] }) => {
  if (!blogs?.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-end justify-between">
        <div className="text-2xl">Blog Posts</div>
        {blogs.length > 4 && (
          <ExternalLink
            href="https://blog.arbitrum.io/"
            className="text-xs underline underline-offset-4"
          >
            See More
          </ExternalLink>
        )}
      </div>
      <hr className="border-white/40" />
      <ResponsiveHorizontalScrollableLayout>
        {blogs.slice(0, 4).map((blog) => (
          <Card
            cardType="externalLink"
            href={blog.url}
            key={blog.title}
            className="flex h-[270px] w-[250px] flex-col gap-2 p-0 lg:w-full"
            analyticsProps={{
              eventName: `Learn Page - Blogs Clicks`,
              eventProperties: {
                Title: blog.title,
              },
            }}
          >
            <div
              className="h-[140px] w-full shrink-0 overflow-hidden bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${blog.feature_image})` }}
            />

            <div className="flex flex-grow flex-col justify-between gap-3 p-4">
              <div className="line-clamp-2 text-sm font-semibold">{blog.title}</div>
              <div className="flex flex-row gap-2 text-xs opacity-75">
                <div>{formatDate(blog.published_at, 'MMM DD, YYYY')}</div>
                &bull;
                <div>{blog.reading_time} min read</div>
              </div>
            </div>
          </Card>
        ))}
      </ResponsiveHorizontalScrollableLayout>
    </div>
  );
};
