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

async function fetchHTML(url: string, timeout = 7000, maxSize = 1024 * 1024, maxRedirects = 5): Promise<string | null> {
  try {
    const dnsMod = await import('dns');
    const dns = dnsMod.promises;

    const isBlockedIPv6 = (ip: string) => {
      const lower = ip.toLowerCase();
      if (lower === '::1') return true;                  // loopback
      if (/^fc|^fd/.test(lower)) return true;            // fc00::/7 unique local
      if (/^fe[89ab]/.test(lower)) return true;          // fe80::/10 link-local
      return false;
    };

    const checkSSRF = async (rawUrl: string) => {
      const u = new URL(rawUrl);
      if (!['http:', 'https:'].includes(u.protocol)) return false;
      const addrs = await dns.lookup(u.hostname, { all: true });
      if (!addrs?.length) return false;
      for (const { address } of addrs) {
       for (const { address } of addrs) {
        if (address.includes(':')) {
          // Handle IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
          const mapped = address.match(/^(?:0*:)*ffff:(\d+\.\d+\.\d+\.\d+)$/i);
          if (mapped) {
            if (blockedRanges.some(range => ipInRange(mapped[1], range))) return false;
            continue;
          }
          // Regular IPv6 checks
          if (isBlockedIPv6(address)) return false;
          continue;
        }
        // IPv4 checks
        if (blockedRanges.some(range => ipInRange(address, range))) return false;
      }     
      return true;
    };

    let current = url;
    for (let i = 0; i <= maxRedirects; i++) {      
      if (!(await checkSSRF(current))) return null;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'Helixque-Link-Preview/1.0' },
      }).finally(() => clearTimeout(id));

      // Redirect handling (manual to re-check SSRF per hop)
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) return null;
        current = new URL(loc, current).toString();
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('html')) return null;

      const contentLength = res.headers.get('content-length');
      if (contentLength && Number(contentLength) > maxSize) return null;

      // Read body with size cap (supports Web Streams and Node Readable)
      let bytes: Uint8Array | null = null;
      const body: any = (res as any).body;
      if (body?.getReader) {
        const reader = body.getReader();
        let received = 0;
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          if (received > maxSize) {
            try { await reader.cancel(); } catch {}
            return null;
          }
          chunks.push(value);
        }
        bytes = new Uint8Array(received);
        let off = 0;
        for (const c of chunks) { bytes.set(c, off); off += c.byteLength; }
      } else if (body && typeof body[Symbol.asyncIterator] === 'function') {
        const chunks: Buffer[] = [];
        let received = 0;
        for await (const chunk of body) {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          received += buf.length;
          if (received > maxSize) {
            body.destroy?.();
            return null;
          }
          chunks.push(buf);
        }
        const buf = Buffer.concat(chunks);
        bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      } else {
        return null;
      }

      return new TextDecoder('utf-8').decode(bytes);
    }
    return null;
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
