// Social platform size presets, shared by the server (validation) and the browser (pickers and export).
// Sizes follow each platform's commonly published recommendations; platforms change them from time to time,
// so adjust this one list and the whole studio follows.
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
export const ratioOf = (w, h) => `${w / gcd(w, h)} / ${h / gcd(w, h)}`;

const preset = (id, platform, name, w, h, note = '') => ({ id, platform, name, w, h, ratio: ratioOf(w, h), note });

export const PRESETS = [
  preset('instagram-post', 'instagram', 'Instagram post', 1080, 1350, 'Portrait feed post and carousel'),
  preset('instagram-square', 'instagram', 'Instagram square', 1080, 1080, 'Square feed post'),
  preset('instagram-story', 'instagram', 'Instagram story / Reel', 1080, 1920, 'Full-screen vertical'),
  preset('tiktok', 'tiktok', 'TikTok', 1080, 1920, 'Full-screen vertical video or cover'),
  preset('linkedin-carousel', 'linkedin', 'LinkedIn carousel', 1080, 1350, 'Document-style swipe post'),
  preset('linkedin-post', 'linkedin', 'LinkedIn post', 1200, 627, 'Landscape feed image'),
  preset('x-post', 'x', 'X post', 1600, 900, 'Wide 16:9 image'),
  preset('youtube-thumbnail', 'youtube', 'YouTube thumbnail', 1280, 720, 'Video thumbnail'),
  preset('youtube-short', 'youtube', 'YouTube Short', 1080, 1920, 'Full-screen vertical'),
  preset('facebook-post', 'facebook', 'Facebook post', 1200, 630, 'Link-style feed image'),
  preset('facebook-story', 'facebook', 'Facebook story', 1080, 1920, 'Full-screen vertical'),
  preset('trending-post', 'trending', 'Trending post', 1080, 1350, 'Fast reaction post for a trending topic'),
  preset('trending-story', 'trending', 'Trending story', 1080, 1920, 'Vertical version of a trending post'),
];

// The chips shown on the dashboard, in display order.
export const PLATFORM_GROUPS = [
  { id: 'instagram', name: 'Instagram', defaultPreset: 'instagram-post' },
  { id: 'tiktok', name: 'TikTok', defaultPreset: 'tiktok' },
  { id: 'linkedin', name: 'LinkedIn', defaultPreset: 'linkedin-carousel' },
  { id: 'x', name: 'X', defaultPreset: 'x-post' },
  { id: 'youtube', name: 'YouTube', defaultPreset: 'youtube-thumbnail' },
  { id: 'facebook', name: 'Facebook', defaultPreset: 'facebook-post' },
  { id: 'trending', name: 'Trending', defaultPreset: 'trending-post' },
];

export const findPreset = id => PRESETS.find(p => p.id === id) || null;
export const presetsFor = platform => PRESETS.filter(p => p.platform === platform);
