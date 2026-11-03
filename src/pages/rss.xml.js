import rss from '@astrojs/rss';
import { getLogs } from '../lib/content';
import { site } from '../config';

export async function GET(context) {
  const logs = await getLogs();
  return rss({
    title: site.title,
    description: site.description,
    site: context.site,
    items: logs.map((l) => ({
      title: l.title,
      description: l.summary,
      pubDate: l.date,
      link: l.href,
      categories: [l.kind],
    })),
  });
}
