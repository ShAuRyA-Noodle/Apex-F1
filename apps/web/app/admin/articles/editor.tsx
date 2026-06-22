'use client';

import { useState } from 'react';

const SECTIONS = ['NEWS', 'FEATURE', 'ANALYSIS', 'STRATEGY', 'TECHNICAL', 'HISTORY', 'OPINION'];

export function ArticleEditor({ enabled }: { enabled: boolean }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [dek, setDek] = useState('');
  const [section, setSection] = useState(SECTIONS[0]);
  const [body, setBody] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  function autoSlug(t: string) {
    return t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
  }

  async function saveDraft() {
    setState('saving');
    setError('');
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: (slug || autoSlug(title)).trim(),
          dek: dek.trim(),
          section,
          bodyMd: body,
          status: 'draft',
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setState('error');
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setState('saved');
      window.setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-data block text-outline">Title</label>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slug) setSlug(autoSlug(e.target.value));
          }}
          placeholder="How Mercedes engineered the W17 floor for Monaco"
          className="mt-2 block w-full border border-outline-variant bg-surface-container-low px-5 py-4 font-display text-xl text-on-background placeholder:text-outline focus:border-telemetry-red focus:outline-none md:text-2xl"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
        <div>
          <label className="text-data block text-outline">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="mercedes-w17-floor-monaco"
            className="mt-2 block w-full border border-outline-variant bg-surface-container-low px-5 py-3 font-data text-on-background placeholder:text-outline focus:border-telemetry-red focus:outline-none"
          />
        </div>
        <div>
          <label className="text-data block text-outline">Section</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="mt-2 block w-full border border-outline-variant bg-surface-container-low px-5 py-3 font-data text-on-background focus:border-telemetry-red focus:outline-none"
          >
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-data block text-outline">Dek (one-line summary)</label>
        <input
          value={dek}
          onChange={(e) => setDek(e.target.value)}
          placeholder="Inside the aero choices that put Russell on pole and unlocked Hamilton's long stint."
          className="mt-2 block w-full border border-outline-variant bg-surface-container-low px-5 py-3 font-editorial text-lg text-on-background placeholder:text-outline focus:border-telemetry-red focus:outline-none"
        />
      </div>

      <div>
        <label className="text-data block text-outline">Body (Markdown)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          placeholder={`## Heading\n\nLead paragraph...\n\n- bullet\n- bullet\n\n> Pull-quote\n`}
          className="mt-2 block w-full border border-outline-variant bg-surface-container-low px-5 py-4 font-body text-base leading-relaxed text-on-background placeholder:text-outline focus:border-telemetry-red focus:outline-none"
        />
        <p className="mt-2 text-data text-outline">
          {body.length} chars · ~{Math.max(1, Math.round(body.split(/\s+/).length / 200))} min read
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={saveDraft}
          disabled={!enabled || state === 'saving' || !title.trim() || !body.trim()}
          className="bg-telemetry-red px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved ✓' : 'Save draft'}
        </button>
        {/* Publish ships with the Phase C DB + auth wiring — hidden until then
            rather than shown as a permanently-dead disabled button. */}
        {state === 'error' && (
          <span className="text-sm text-telemetry-red">{error}</span>
        )}
      </div>
    </div>
  );
}
