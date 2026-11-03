import rss from '@astrojs/rss';
import { getPosts } from '../lib/content';
import { site } from '../config';

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: site.title,
    description: site.description,
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/writing/${p.id}/`,
    })),
  });
}
