// Link preview image of each log: /og/<slug>.png, and /og/<slug>/<lang>.png for translations.
import type { APIRoute } from 'astro';
import { getLogs, getTranslations } from '../../lib/content';
import { fmtDate, localize, type Log, type Translation } from '../../lib/logs';
import { logCard } from '../../lib/og';

export async function getStaticPaths() {
  const logs = await getLogs();
  const translations = await getTranslations();
  return logs.flatMap((log) => [
    { params: { slug: log.id }, props: { log, translation: undefined } },
    ...translations
      .filter((t) => t.of === log.id)
      .map((translation) => ({ params: { slug: `${log.id}/${translation.lang}` }, props: { log, translation } })),
  ]);
}

export const GET: APIRoute = async ({ props }) => {
  const { log, translation } = props as { log: Log; translation?: Translation };
  const page = localize(log, translation);
  const body = await logCard({ title: page.title, date: fmtDate(log.date), kind: log.kind, meta: page.meta });
  return new Response(body, { headers: { 'Content-Type': 'image/png' } });
};
