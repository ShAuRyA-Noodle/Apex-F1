// Public surface for `@apex/api-client/giphy`.
//
// Usage:
//   import {
//     searchGiphy,
//     searchGiphyReaction,
//     mapGiphyGifs,
//     pickFirstGiphyGif,
//     GIPHY_REACTION_QUERIES,
//   } from '@apex/api-client/giphy';
//
//   // Curated reaction (preferred - keeps cache hit rate high)
//   const raw = await searchGiphyReaction('predictWin', { limit: 10 });
//   const gif = pickFirstGiphyGif(raw);
//
//   // Free-form search (use sparingly - each unique query = new ISR slot)
//   const raw2 = await searchGiphy({ query: 'pit stop' });
//   const items = mapGiphyGifs(raw2);
//
// Beta tier: 100 req/h, 1k req/day. The client floors revalidate at 24h.
// Attribution: every render site MUST include the PoweredByGiphy badge.

export * from './types';
export * from './client';
export * from './mappers';
