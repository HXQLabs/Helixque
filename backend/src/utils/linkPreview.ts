import LinkifyIt from 'linkify-it';
import fetch, { RequestInit } from 'node-fetch';
import * as cheerio from 'cheerio';
import LRU from 'lru-cache';
import dns from 'dns';
import { URL } from 'url';

const linkify = new LinkifyIt();

export type LinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
};

const cache = new LRU<string, LinkPreview>({ max: 500, ttl: 1000 * 60 * 60 * 24 }); // 24h TTL

// Security constants
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB
const PRIVATE_RANGES = [
  '127.0.0.0/8',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.0.0/16',
];

function ipToInt(ip: string) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0);
}

function ipInRange(ip: string, range: string) {
  const [rangeAddress, prefix] = range.split('/');
  const mask = ~(2 ** (32 - Number(prefix)) - 1);
  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(rangeAddress);
  return (ipInt & mask) === (rangeInt & mask);
}

async function resolveHost(hostname: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) return reject(err);
      resolve(addresses.map(a => a.address));
    });
  });
}

async function fetchHTML(urlString: string, timeout = 7000): Promise<string | null> {
  try {
    // Validate URL
    const url = new URL(urlString);
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    // Resolve host and check private IPs
    const addresses = await resolveHost(url.hostname);
    if (addresses.length === 0) return null;

    for (const ip of addresses) {
      if (PRIVATE_RANGES.some(range => ipInRange(ip, range))) return null;
      if (ip === '169.254.169.254') return null; // cloud metadata
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url.toString(), {
      redirect: 'follow',
      follow: MAX_REDIRECTS,
      signal: controller.signal,
      headers: { 'User-Agent': 'Helixque-Link-Preview/1.0' },
    } as RequestInit);

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      clearTimeout(id);
      return null;
    }

    // Stream response with size limit
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_RESPONSE_SIZE) {
        reader.cancel();
        clearTimeout(id);
        return null;
      }
      chunks.push(value);
    }

    clearTimeout(id);
    return Buffer.concat(chunks).toString('utf-8');
  } catch (err) {
    console.error('fetchHTML error:', err);
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
