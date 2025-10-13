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

const cache = new LRU<string, LinkPreview>({ max: 500, ttl: 1000 * 60 * 60 * 24 }); // 24h

// --- IP Utilities (safe) ---
function ipToInt(ip: string): number | null {
  const octets = ip.split('.');
  if (octets.length !== 4) return null;
  let ipInt = 0;
  for (const octet of octets) {
    const n = Number(octet);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    ipInt = (ipInt << 8) + n;
  }
  return ipInt >>> 0;
}

function ipInRange(ip: string, range: string): boolean {
  const ipInt = ipToInt(ip);
  if (ipInt === null) return false;

  const [rangeAddress, prefixStr] = range.split('/');
  if (!prefixStr) return false;

  const prefix = Number(prefixStr);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  const rangeInt = ipToInt(rangeAddress);
  if (rangeInt === null) return false;

  const mask = ~(2 ** (32 - prefix) - 1) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

// Private/internal IPv4 ranges
const blockedRanges = [
  '127.0.0.0/8',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.0.0/16', // link-local
  '0.0.0.0/8',
  '224.0.0.0/4', // multicast
];

// --- Fetch HTML safely ---
async function fetchHTML(url: string, timeout = 7000, maxSize = 1024 * 1024, maxRedirects = 5): Promise<string | null> {
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return null;

    // Resolve hostname
    const addresses = await import('dns').then(dns => dns.promises.lookup(parsedUrl.hostname, { all: true }));
    if (!addresses || addresses.length === 0) return null;

    for (const addr of addresses) {
      const ip = addr.address;

      // IPv4 blocking
      if (blockedRanges.some(range => ipInRange(ip, range))) {
        console.warn('Blocked IPv4 address:', ip);
        return null;
      }

      // IPv6 basic checks
      if (ip.startsWith('fe80') || ip === '::1' || ip.startsWith('fd00:')) {
        console.warn('Blocked IPv6 address:', ip);
        return null;
      }
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    let res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Helixque-Link-Preview/1.0' },
    });

    clearTimeout(id);

    let redirectCount = 0;
    while (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      if (++redirectCount > maxRedirects) return null;
      const loc = res.headers.get('location')!;
      res = await fetch(loc, { redirect: 'follow', signal: controller.signal, headers: { 'User-Agent': 'Helixque-Link-Preview/1.0' } });
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('html')) return null;

    // Limit response size
    const reader = res.body?.getReader();
    if (!reader) return null;

    let received = 0;
    let chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > maxSize) {
        reader.cancel();
        return null;
      }
      chunks.push(value);
    }

    const decoder = new TextDecoder('utf-8');
    return decoder.decode(Uint8Array.from(chunks.flat()));
  } catch {
    return null;
  }
}

// --- Helpers ---
function absoluteUrl(base: string, maybe?: string) {
  if (!maybe) return undefined;
  try {
    return new URL(maybe, base).toString();
  } catch {
    return undefined;
  }
}

// --- Main Exported Function ---
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
  const ogDescription = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');

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
