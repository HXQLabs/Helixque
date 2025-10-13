import LinkifyIt from 'linkify-it';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import LRU from 'lru-cache';

const linkify = new LinkifyIt();

export type LinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
};

const cache = new LRU<string, LinkPreview>({ max: 500, ttl: 1000 * 60 * 60 * 24 }); // 24h TTL

async function fetchHTML(url: string, timeout = 7000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Helixque-Link-Preview/1.0' },
    });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function absoluteUrl(base: string, maybe?: string) {
  if (!maybe) return undefined;
  try {
    return new URL(maybe, base).toString();
  } catch {
    return undefined;
  }
}

export async function extractLinkPreviewFromText(text: string): Promise<LinkPreview | null> {
  const matches = linkify.match(text);
  if (!matches || matches.length === 0) return null;

  const first = matches[0].url;
  const cached = cache.get(first);
  if (cached) return cached;

  const html = await fetchHTML(first);
  if (!html) {
    const minimal: LinkPreview = { url: first };
    cache.set(first, minimal);
    return minimal;
  }

  const $ = cheerio.load(html);

  const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content');
  const ogDescription =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content');
  const ogImage =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content');

  const title = ogTitle || $('title').text() || undefined;
  const description = ogDescription || undefined;
  const image = absoluteUrl(first, ogImage);

  const preview: LinkPreview = { url: first, title, description, image };
  cache.set(first, preview);
  return preview;
}

export function hasUrl(text: string): boolean {
  return !!linkify.match(text);
}
