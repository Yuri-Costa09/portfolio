// Link preview image of every page that isn't a log.
import type { APIRoute } from 'astro';
import { site } from '../config';
import { siteCard } from '../lib/og';

export const GET: APIRoute = async () =>
  new Response(await siteCard(site), { headers: { 'Content-Type': 'image/png' } });
