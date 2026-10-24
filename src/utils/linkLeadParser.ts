import { Lead, LeadStatus } from '../types';

export interface ParsedLinkResult {
  url: string;
  name: string;
  platform: 'Facebook' | 'Google Maps' | 'Instagram' | 'Website';
  city?: string;
}

/**
 * Checks whether a name is a generic placeholder (like "Facebook Business", "Facebook Lead", "Local Business")
 * so that duplicate checks or rejection checks NEVER false-match different businesses sharing a generic placeholder.
 */
export function isGenericPlaceholderName(name?: string): boolean {
  if (!name) return true;
  const raw = name.trim().toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9]/g, '');
  if (cleaned.length < 2) return true;

  // Any name containing "facebook", "instagram", or "google maps" is a platform placeholder, never a real business
  if (cleaned.includes('facebook') || cleaned.includes('instagram') || cleaned.includes('googlemaps')) {
    return true;
  }

  // Any name that is purely an ID, hash, or numeric string (like -10000ii298ioawuuh or 61550987654321)
  if (/^(?:[0-9]{4,}|1000[a-z0-9]+|6155[a-z0-9]+|[0-9]+[a-z0-9]{4,})$/i.test(cleaned)) {
    return true;
  }

  const genericSlugs = new Set([
    'website',
    'websitelead',
    'websitebusiness',
    'localbusiness',
    'pastedbusiness',
    'lead',
    'business',
    'prospect',
    'profile',
    'page',
    'group',
    'samplebadfitpizza',
    'closedbistrocafe',
    'unknown',
    'notprovided',
    'untitled',
    'mentions',
    'reviews',
    'followers',
    'following',
    'posts',
    'community',
  ]);

  return genericSlugs.has(cleaned);
}

/**
 * Checks if a URL or normalized string is just the bare root platform domain (e.g. "facebook.com", "instagram.com")
 * rather than an actual specific business page link.
 */
export function isBarePlatformDomain(urlOrNorm?: string): boolean {
  if (!urlOrNorm) return true;
  let clean = urlOrNorm
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^(?:[a-z0-9_-]+\.)*(?:facebook\.com|fb\.com|fb\.me)/, 'facebook.com')
    .replace(/^(?:[a-z0-9_-]+\.)*instagram\.com/, 'instagram.com')
    .replace(/^(www\.|m\.|mobile\.|web\.)/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');

  const bareDomains = [
    '',
    'facebook.com',
    'fb.com',
    'fb.me',
    'instagram.com',
    'instagr.am',
    'google.com',
    'google.com/maps',
    'maps.google.com',
    'maps.app.goo.gl',
    'goo.gl',
    'goo.gl/maps',
  ];

  return bareDomains.includes(clean) || clean.length <= 4;
}

/**
 * Converts a URL slug or username into Title Case, cleanly stripping trailing ID hashes
 * (e.g. "tacos-el-rey-10000ii298ioawuuh" -> "Tacos El Rey").
 * If the slug is ONLY an ID/hash (e.g. "10000ii298ioawuuh" or "-10000ii298ioawuuh"), returns empty string.
 */
export function cleanSlug(slug: string): string {
  if (!slug) return '';
  let cleaned = slug.trim();

  // Strip leading colons, dashes, underscores, slashes, dots
  cleaned = cleaned.replace(/^[:\-_/.]+/, '');

  // Strip trailing Facebook/Instagram ID hashes like -10000ii298ioawuuh, .10000ii298ioawuuh, or -61550987654321
  cleaned = cleaned.replace(/[-_.](?:[0-9]{5,}|[0-9]+[a-zA-Z0-9]{3,}|1000[a-zA-Z0-9]+|6155[a-zA-Z0-9]+)$/i, '');
  // Also strip directly attached trailing IDs without separator (e.g. LuigiPasta10000ii298ioawuuh or LuigiPasta61550987654321)
  cleaned = cleaned.replace(/(?:1000[a-zA-Z0-9]{4,}|6155[a-zA-Z0-9]{4,}|[0-9]{7,})$/i, '');

  // If the entire remaining string is just an ID/hash or pure digits, discard
  if (/^(?:[0-9]{4,}|1000[a-zA-Z0-9]+|6155[a-zA-Z0-9]+|[0-9]+[a-zA-Z0-9]{4,})$/i.test(cleaned)) {
    return '';
  }

  // Generic Facebook / Instagram routing segments that shouldn't be treated as business names
  const genericSegments = new Set([
    'pages',
    'category',
    'p',
    'people',
    'groups',
    'watch',
    'share',
    'reel',
    'stories',
    'events',
    'photo.php',
    'permalink.php',
    'profile.php',
    'photos',
    'videos',
    'about',
    'restaurant',
    'restaurants',
    'food',
    'beverage',
    'cafe',
    'bar',
    'catering',
    'bakery',
    'local business',
    'pizza',
    'mentions',
    'reviews',
    'followers',
    'following',
    'posts',
    'community',
    'timeline',
    'reels_tab',
    'map',
  ]);

  if (genericSegments.has(cleaned.toLowerCase())) {
    return '';
  }

  // Replace underscores, dashes, dots with spaces
  cleaned = cleaned.replace(/[-_.]+/g, ' ');
  // Handle camelCase or concatenated words
  cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Capitalize words
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

/**
 * Cleanly extracts platform and business name from a Facebook, Google Maps, Instagram, or Website link.
 */
export function parseBusinessFromUrl(rawUrl: string, customName?: string): ParsedLinkResult {
  let url = (rawUrl || '').trim();
  let accompanyingText = '';

  // Check if rawUrl contains text before/after link (e.g. "Luigi Pasta https://facebook.com/10000ii298ioawuuh")
  const urlMatch = url.match(/(https?:\/\/[^\s]+)/i);
  if (urlMatch) {
    const extractedLink = urlMatch[1];
    accompanyingText = url.replace(extractedLink, '').replace(/^[-:\s]+|[-:\s]+$/g, '').trim();
    url = extractedLink;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  let platform: 'Facebook' | 'Google Maps' | 'Instagram' | 'Website' = 'Website';
  let detectedName = '';

  const lower = url.toLowerCase();

  // 1. Facebook Links
  if (lower.includes('facebook.com') || lower.includes('fb.me') || lower.includes('fb.com')) {
    platform = 'Facebook';

    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.replace(/^\/+|\/+$/g, '');
      const parts = pathname.split('/').filter(Boolean);

      if (parts.length > 0) {
        // Iterate through path parts backwards to find the best candidate slug (skipping category, pages, pure IDs)
        for (let i = parts.length - 1; i >= 0; i--) {
          const candidate = cleanSlug(parts[i]);
          if (candidate && candidate.length >= 2 && !isGenericPlaceholderName(candidate)) {
            detectedName = candidate;
            break;
          }
        }
      }

      // Check query param for name or search query if still empty
      if (!detectedName && parsed.searchParams.get('name')) {
        detectedName = cleanSlug(parsed.searchParams.get('name') || '');
      }
    } catch (_e) {
      // Use fallback
    }

    // If no name found from URL, check accompanying text
    if (!detectedName && accompanyingText && accompanyingText.length >= 2 && !isGenericPlaceholderName(accompanyingText)) {
      detectedName = accompanyingText;
    }

    // Clean fallback: never save as an ID like "-10000ii298ioawuuh"
    if (!detectedName || isGenericPlaceholderName(detectedName)) {
      detectedName = (customName && !isGenericPlaceholderName(customName)) ? customName.trim() : 'Facebook Prospect';
    }
  }
  // 2. Google Maps Links
  else if (
    lower.includes('google.com/maps') ||
    lower.includes('maps.google.com') ||
    lower.includes('maps.app.goo.gl') ||
    lower.includes('goo.gl/maps')
  ) {
    platform = 'Google Maps';

    try {
      const parsed = new URL(url);
      // Format: /maps/place/Business+Name/@lat,lng...
      if (parsed.pathname.includes('/place/')) {
        const placePart = parsed.pathname.split('/place/')[1];
        if (placePart) {
          const rawName = placePart.split('/')[0];
          // Replace + and %20
          detectedName = decodeURIComponent(rawName)
            .replace(/\+/g, ' ')
            .replace(/[@#].*$/, '')
            .trim();
        }
      } else if (parsed.searchParams.get('q')) {
        const q = parsed.searchParams.get('q') || '';
        detectedName = q.replace(/\+/g, ' ').replace(/[@#].*$/, '').trim();
      }
    } catch (_e) {
      // Fallback
    }

    if (!detectedName && accompanyingText && accompanyingText.length >= 2 && !isGenericPlaceholderName(accompanyingText)) {
      detectedName = accompanyingText;
    }

    if (!detectedName || isGenericPlaceholderName(detectedName)) {
      detectedName = (customName && !isGenericPlaceholderName(customName)) ? customName.trim() : 'Google Maps Lead';
    }
  }
  // 3. Instagram Links
  else if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
    platform = 'Instagram';
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.replace(/^\/+|\/+$/g, '');
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 0 && !['p', 'reel', 'stories', 'explore'].includes(parts[0])) {
        detectedName = cleanSlug(parts[0]);
      }
    } catch (_e) {
      // Fallback
    }

    if (!detectedName && accompanyingText && accompanyingText.length >= 2 && !isGenericPlaceholderName(accompanyingText)) {
      detectedName = accompanyingText;
    }

    if (!detectedName || isGenericPlaceholderName(detectedName)) {
      detectedName = (customName && !isGenericPlaceholderName(customName)) ? customName.trim() : 'Instagram Profile';
    }
  }
  // 4. Generic Website Links
  else {
    platform = 'Website';
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./i, '');
      const namePart = host.split('.')[0];
      detectedName = cleanSlug(namePart);
    } catch (_e) {
      // Fallback
    }

    if (!detectedName && accompanyingText && accompanyingText.length >= 2 && !isGenericPlaceholderName(accompanyingText)) {
      detectedName = accompanyingText;
    }

    if (!detectedName || isGenericPlaceholderName(detectedName)) {
      detectedName = (customName && !isGenericPlaceholderName(customName)) ? customName.trim() : 'Local Business';
    }
  }

  // Priority: if user provided customName that is valid, use it; otherwise use detectedName
  const finalName = (customName && customName.trim() && !isGenericPlaceholderName(customName))
    ? customName.trim()
    : (detectedName && !isGenericPlaceholderName(detectedName) ? detectedName : `${platform} Prospect`);

  return {
    url,
    name: finalName,
    platform,
  };
}

/**
 * Builds a default outreach pitch for a given business name and optional link.
 */
export function buildOutreachPitch(businessName: string, customTemplate?: string, link?: string): string {
  if (customTemplate && customTemplate.trim()) {
    return customTemplate
      .replace(/{name}/gi, businessName)
      .replace(/{restaurant}/gi, businessName)
      .replace(/{link}/gi, link || '');
  }

  return `Hey! Put together a 0.3s direct ordering concept for ${businessName}. Waiving our $299 fee to $0 for 3 local spots in exchange for a short review. Want me to turn it live?`;
}
