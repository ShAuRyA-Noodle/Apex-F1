export { groqChat, GROQ_MODEL_QUALITY, GROQ_MODEL_FAST } from './client';
export type { GroqMessage, GroqChatOpts } from './client';

import { groqChat, GROQ_MODEL_QUALITY } from './client';

export interface DriverDossierInput {
  name: string;
  nationality: string;
  team?: string | null;
  age?: number | null;
  wins: number;
  debutYear?: number | null;
  seasons: number;
  /** Wikipedia summary extract, if available · grounds the model in fact. */
  context?: string | null;
}

/**
 * Sharp 2-sentence editorial scouting dossier for a driver, generated from real
 * career numbers + Wikipedia context. Returns null on any failure (the UI omits
 * the section). Wrap in `unstable_cache` keyed by driver so the 24h-stable blurb
 * is not re-billed on every render.
 */
export async function generateDriverDossier(input: DriverDossierInput): Promise<string | null> {
  const facts = [
    `Name: ${input.name}`,
    `Nationality: ${input.nationality}`,
    input.team ? `Current/last team: ${input.team}` : '',
    input.age ? `Age: ${input.age}` : '',
    // Only surface the win count when it's positive · the upstream tally can be
    // incomplete (paginated results miss recent seasons), so a misleading "0"
    // is omitted and the Background carries achievements instead.
    input.wins > 0 ? `Race wins (at least): ${input.wins}` : '',
    input.debutYear ? `Debut season: ${input.debutYear}` : '',
    `Seasons raced: ${input.seasons}`,
    input.context ? `Background: ${input.context}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return groqChat(
    [
      {
        role: 'system',
        content:
          'You are Apex, an elite Formula 1 analyst. Write a punchy, factual 2-sentence scouting dossier ' +
          'for the given driver. Voice: sharp, modern, telemetry-grade · never flowery, never a Wikipedia ' +
          'rehash. The Background is AUTHORITATIVE for career achievements; the numeric stats may be ' +
          'incomplete, so if they conflict with the Background, trust the Background and NEVER understate ' +
          'a driver (e.g. do not call a race-winner or champion winless). Use only the supplied facts; ' +
          'never invent specifics. CRITICAL STYLE RULE: never use em dashes or en dashes anywhere; write ' +
          'with commas, periods, or a middle dot instead. No preamble, no markdown, no surrounding quotes, ' +
          'just the two sentences.',
      },
      { role: 'user', content: facts },
    ],
    { model: GROQ_MODEL_QUALITY, temperature: 0.5, maxTokens: 180 },
  );
}
