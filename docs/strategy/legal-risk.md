# Legal & risk register deep — beyond PID §6

# APEX — Legal & Risk Playbook v1.0
**Owner:** ShAuRyA (Founder) | **Date:** 2026-06-21 | **Status:** Pre-launch, free-tier, solo founder
**Scope:** Extends PID §6. Conservative-pragmatic. US/UK/EU/AU coverage. Not formal legal advice — engage counsel before filing/signing anything binding.

---

## 1. EXTENDED RISK REGISTER (R13–R27)

PID §6 covers R1–R12 (FOM/FIA marks, color confusion, photo licensing, data scraping, embed revocation, defamation, GDPR baseline, performance SLA, dependency rot, abuse, founder bus-factor, regulator audit). Below: 15 new risks counsel-grade founders typically miss.

### R13 — Domain Squat / Reverse Hijack
- **Category:** IP / Reputational
- **Severity:** Med | **Likelihood:** High
- **Mitigation:** Defensive registration of `apex.gg`, `apex.racing`, `apex-f1.com`, `apexf1.app`, `getapex.com`, plus ccTLDs `.co.uk`, `.de`, `.com.au`, `.it` (Ferrari-country) before any press. Lock at Cloudflare Registrar (at-cost, free WHOIS privacy). Enable registrar lock + 2FA.
- **Trigger detection:** Weekly Google Alerts on `"apex f1"`, Mention.com brand monitor, DomainTools change alerts on registered marks.
- **Response 0–24–72h:** [0h] Snapshot WHOIS, screenshot. [24h] UDRP complaint via WIPO Arbitration ($1,500 single-panel) if confusingly similar + bad-faith + no legitimate interest (UDRP §4(a)). [72h] If pre-trademark, file USPTO ITU (Intent-to-Use 1(b)) to create priority date, then UDRP.

### R14 — Reverse Trademark Confusion with Apex Legends (EA) / Apex Racing League
- **Category:** IP
- **Severity:** High | **Likelihood:** Med
- **Mitigation:** USPTO TESS search done before filing. EA owns "Apex Legends" in Class 9/41 for video games — our use is sports media, distinct goods-services per *In re E.I. du Pont* DuPont factors. File in Class 41 (entertainment-news), not gaming. Consider distinguishing wordmark "Apex Pulse" or "Apex Paddock" if examiner pushes back on bare "Apex."
- **Trigger detection:** USPTO Office Action; opposition filed at TTAB within 30 days of publication.
- **Response 0–24–72h:** [0h] Pull opposition notice. [24h] Engage TM counsel ($350–500/hr); file 30-day extension to answer. [72h] Draft answer asserting DuPont factor distinctions (channels of trade, sophistication of buyers, dissimilarity of goods).

### R15 — Music/Audio Sync on Videos & Reels
- **Category:** IP
- **Severity:** High | **Likelihood:** High
- **Mitigation:** Editorial video soundtracks must come from Epidemic Sound ($24/mo personal, $49/mo commercial w/ social monetization rights), Artlist, or YouTube Audio Library only. Never use copyrighted F1 broadcast audio, team radio over music, or popular tracks. Document sync license + Content ID safe list.
- **Trigger detection:** YouTube Content ID claim, Instagram/Reels muting, DMCA notice from PRS/ASCAP/BMI.
- **Response 0–24–72h:** [0h] Pull asset; replace audio. [24h] Document license chain in `/legal/licenses.json`. [72h] Counter-notice if claim is invalid (UMG bot false positives common).

### R16 — Embed Provider TOS Drift (Twitter/X, Instagram, TikTok)
- **Category:** Ops / IP
- **Severity:** Med | **Likelihood:** High
- **Mitigation:** All embeds via official `oEmbed` / iframe widgets. Never scrape and re-render. Cache `oembed` JSON for 24h max. Track TOS changes via terms-tracker tools (e.g., TOSdr, terms-and-conditions GitHub).
- **Trigger detection:** Embed endpoint returns 401/451, X charging $42k/mo for API still applies to oEmbed in v2 (verified 2026).
- **Response 0–24–72h:** [0h] Catch HTTP error, fall back to "View on Source" link card. [24h] Bulk-replace deprecated embeds via cron. [72h] Architect platform fallback abstraction.

### R17 — Telemetry Data Misinterpretation Liability
- **Category:** Reputational / Operational
- **Severity:** Med | **Likelihood:** Med
- **Mitigation:** Every telemetry display gets a `data-source` attribution badge (OpenF1, Jolpica, FIA-derived). Add "unofficial; may differ from official timing" tooltip. Round/abstract to user-readable precision; do NOT publish raw FIA-derived numbers as authoritative.
- **Trigger detection:** Reader complaint via support@; FOM/FIA reach-out.
- **Response 0–24–72h:** [0h] Add visible disclaimer to disputed page. [24h] Audit data pipeline, re-confirm source. [72h] Add structured disclaimer component sitewide.

### R18 — Geo-Blocking Failures (F1 TV Embed Replay Region Lock)
- **Category:** IP / Ops
- **Severity:** Med | **Likelihood:** Low
- **Mitigation:** We do not embed F1 TV. Period. Only YouTube official F1 channel embeds (allowed by uploader's embed permission). Block any contributor from pasting F1 TV URLs via regex CMS validation.
- **Trigger detection:** FOM cease & desist; community report.
- **Response:** Immediate URL purge + post-mortem.

### R19 — Affiliate FTC Disclosure Violation
- **Category:** Regulatory
- **Severity:** Med | **Likelihood:** High once monetized
- **Mitigation:** Every affiliate link wrapped with `[ad]` prefix per FTC 16 CFR §255.5; `rel="sponsored"` HTML attribute; site-wide disclosure page. UK ASA CAP Code rule 2.1 — equivalent "ad" labelling.
- **Trigger detection:** FTC complaint; ASA ruling.
- **Response 0–24–72h:** [0h] Add disclosure inline. [24h] Audit all affiliate placements. [72h] Update editorial SOP + run training.

### R20 — Newsletter Spam / CAN-SPAM / PECR Violation
- **Category:** Regulatory
- **Severity:** Low (until volume) → High
- **Mitigation:** Resend transactional + Listmonk for marketing. Double opt-in mandatory (PECR/GDPR). Physical mailing address in footer (CAN-SPAM 15 USC §7704). One-click unsubscribe (RFC 8058 List-Unsubscribe-Post header).
- **Trigger detection:** Resend abuse score >0.3%; spamhaus listing; ICO complaint.
- **Response 0–24–72h:** [0h] Pause sends. [24h] Audit consent records. [72h] Re-permission campaign if needed.

### R21 — Supabase RLS Misconfiguration → PII Exposure
- **Category:** Privacy / Security
- **Severity:** Critical | **Likelihood:** Med (solo founder, fast iteration)
- **Mitigation:** RLS ON for every table by default. CI guard: pgTAP test fails build if any table has `rls_enabled=false`. Service-role key NEVER in client bundle. Semgrep rule for `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/`.
- **Trigger detection:** Sentry error patterns, anomalous read volume in Supabase logs, public dump on GitHub via TruffleHog scan.
- **Response 0–24–72h:** [0h] Rotate service-role key; revoke anon key. [24h] GDPR Art. 33 — 72h breach notification to lead supervisory authority (ICO if UK-based) if PII confirmed leaked. [72h] User notification under Art. 34 if "high risk." Document in breach log.

### R22 — Vendor Lock-In / Free-Tier Pull
- **Category:** Financial / Ops
- **Severity:** Med | **Likelihood:** Med
- **Mitigation:** Drizzle ORM (portable SQL), self-hosted Meilisearch, R2 (S3-compatible). Avoid vendor-specific PaaS edges (Vercel KV — use Upstash). Quarterly cost-forecast model. Trigger.dev → can swap to Inngest if pricing changes.
- **Trigger detection:** Vendor pricing email, tier change announcement.
- **Response:** Quarterly migration drill — practice exporting Supabase → self-hosted Postgres on Hetzner ($5/mo VPS) in <4h.

### R23 — Driver/Team Personality Rights (Right of Publicity)
- **Category:** IP / Privacy
- **Severity:** High | **Likelihood:** Med
- **Mitigation:** No driver face on merch. No "endorsed by" implication. Editorial use protected under First Amendment / EU freedom of expression for news commentary. Avoid commercial-use stylization (no AI avatars, no t-shirts with likeness). Lewis Hamilton owns trademark on his name in Class 25 — never put driver names on apparel.
- **Trigger detection:** Driver management agency C&D, Instagram report.
- **Response 0–24–72h:** [0h] Pull asset if commercial. [24h] If editorial, document news-value rationale + statute (NY Civil Rights Law §51 / EU Charter Art. 11). [72h] Counsel review.

### R24 — Live-Timing Data Sublicense / Sportradar / FIA
- **Category:** IP / Contractual
- **Severity:** Critical | **Likelihood:** Low (OpenF1 is the buffer)
- **Mitigation:** We consume OpenF1 (community-derived, MIT-licensed code, open data). If OpenF1 receives FIA C&D and goes dark, we have NO fallback. Risk-accept and document: degrade to Jolpica race-result post-session only. Never claim "official" or "live."
- **Trigger detection:** OpenF1 GitHub issue spike, service degradation, FIA press release on data exclusivity.
- **Response 0–24–72h:** [0h] Switch live route to "results posting shortly" mode. [24h] Communicate degradation in product. [72h] Architect Jolpica-only Phase 3.5 fallback.

### R25 — Children's Data (Minors under 13/16)
- **Category:** Privacy / Regulatory
- **Severity:** High | **Likelihood:** Med (F1 has minor fans)
- **Mitigation:** Age gate at signup: DOB picker, block <13 (COPPA 15 USC §6501) + <16 in EU member states without parental consent (GDPR Art. 8). Do not market to minors. No targeted ads for users <18.
- **Trigger detection:** Internal audit of signup DOB distribution.
- **Response 0–24–72h:** [0h] Block account creation. [24h] Delete data per COPPA verifiable-parental-consent rules. [72h] Report FTC if breach affected minors.

### R26 — Open-Source License Contamination (GPL/AGPL Cross-Pollination)
- **Category:** IP / Legal
- **Severity:** High at exit | **Likelihood:** Low
- **Mitigation:** Audit `package.json` — no AGPL packages in production bundle (Mongoose was MIT, fine; SSPL MongoDB also fine if used as service not embedded). Use `license-checker --production --excludePrivatePackages --failOn 'AGPL-3.0;SSPL-1.0'` in CI.
- **Trigger detection:** CI fail, M&A diligence flag.
- **Response 0–24–72h:** Replace offending dep.

### R27 — Founder Burnout / Bus Factor (Legal angle)
- **Category:** Operational / Legal
- **Severity:** High | **Likelihood:** High (solo founder, 24mo runway)
- **Mitigation:** Legal continuity: domain renewal auto-pay, registrar account 2FA backup codes in 1Password emergency vault, "in case of incapacity" letter to delegate (sibling/lawyer) with access to: GitHub admin, Supabase, Vercel, Cloudflare, Stripe (future). Founder will draft "Dead Man's Switch" SOP — Google Inactive Account Manager + 1Password Emergency Kit printed.
- **Trigger:** N/A (preventive).
- **Response:** N/A.

---

## 2. C&D / TAKEDOWN SCENARIO PLAYBOOK

Each scenario assumes Apex Legal Inbox = `legal@apex.gg` (to be created). Response templates assume no in-house counsel yet — buy 4hr/month retainer with media-IP firm (e.g., Harbottle & Lewis UK, Davis Wright Tremaine US — $1,500–3,000/mo).

### Scenario 1 — FOM C&D Demanding Rebrand ("Apex" Confusion)

**Likelihood:** Low (Apex is not an F1-owned mark). FOM owns "F1," "FORMULA 1," chequered-flag logo, "GRAND PRIX," "PADDOCK CLUB" — NOT "Apex" (apex turn = motorsport common term, generic descriptor).

**Response template:**
```
[24h ACKNOWLEDGMENT — sent within 24h of receipt]

Dear [FOM Legal],

We acknowledge receipt of your letter dated [date] regarding alleged
trademark concerns with the APEX brand.

We respectfully disagree with the assertion of confusion. "Apex" is a
generic motorsport term referring to the geometric apex of a corner,
used widely across racing publications (e.g., Apex Magazine, Apex
Hunters). Our brand operates in Class 41 entertainment-news and makes
no claim of official affiliation with Formula 1, FIA, or any
constructor. Our footer and About page carry the disclaimer:
"APEX is an independent fan platform and is not affiliated with,
endorsed by, or sponsored by Formula 1, FIA, FOM, or any
Formula 1 team."

We are reviewing your concerns with counsel and will respond
substantively within 14 days. In the interim we reserve all rights.

Sincerely, [Founder]
```

**Internal escalation:** Engage TM counsel within 48h. Pull TESS, EUIPO, UKIPO records to confirm FOM holdings. Prepare DuPont factor brief.

---

### Scenario 2 — Team C&D Over Color Strip (Ferrari Red Proximity)

**Trigger:** Ferrari counsel claims our Apex Red `#E10600` infringes Ferrari's trademark red (Pantone 186 C / Rosso Corsa, registered as TM only for goods/services classes specific).

**Reality:** Color trademarks require *secondary meaning* in specific goods classes (*Qualitex v. Jacobson*, 514 U.S. 159). Red for digital media UI is NOT Ferrari's TM scope. Telemetry red is industry standard (Bosch, McLaren, Renault all use crimson telemetry warnings).

**Response template:**
```
Dear [Ferrari Legal],

Thank you for your letter dated [date]. We respectfully decline the
demand to alter our brand palette.

Our telemetry red (#E10600) is selected for accessibility (WCAG AA
contrast on dark surfaces) and is not used in connection with
automotive goods, apparel, or racing services where Ferrari maintains
trademark rights in Rosso Corsa. Color trademarks in the EU and US
require secondary-meaning showing in specific goods classes
(see Libertel C-104/01 EU; Qualitex Co. v. Jacobson Products 514 U.S. 159).

Our use is editorial-news digital interface, a class in which no
Ferrari color mark subsists. The shade is also distinct in hex from
Ferrari Pantone 186 C.

We remain happy to discuss any specific use cases of concern.

Sincerely, [Founder]
```

---

### Scenario 3 — FIA C&D Over Telemetry Data Display

**Trigger:** FIA claims live timing/telemetry constitutes derivative database protected under EU Database Directive 96/9/EC (sui generis right).

**Reality:** Database right protects substantial investment in obtaining/verifying/presenting contents. OpenF1 has a strong argument it independently captures data from broadcast feeds (the "extracted" element matters). *British Horseracing Board v. William Hill* (C-203/02) — extracting data that was *created* (not collected) by claimant is NOT infringement of sui generis right. F1 timing data is *generated* by the sport, which complicates claim.

**Response template:**
```
Dear FIA Legal,

We received your letter dated [date] regarding telemetry data
displayed on apex.gg.

APEX consumes data from OpenF1, a third-party open-source community
project (openf1.org), under its MIT license. We do not extract data
from FIA-controlled databases, do not scrape formula1.com or any
FIA-operated site, and do not republish official timing as
authoritative. All displays carry "unofficial; for editorial use"
disclaimers.

If OpenF1's data sources are at issue, we respectfully suggest the
matter is more appropriately addressed with OpenF1's maintainers.
We will, however, voluntarily withdraw any specific dataset on
formal request showing FIA's protected interest under Directive
96/9/EC Art. 7.

Sincerely, [Founder]
```

**Internal contingency:** If escalates, degrade to Jolpica-only post-session results within 24h.

---

### Scenario 4 — Photo Agency DMCA (Getty / Motorsport Images)

**Trigger:** Getty Images automated reverse-image-search (Pixray, TinEye-equivalent) flags Apex article using uncredited photo.

**Reality:** Getty's standard demand is $865+ retroactive license fee per image (notorious Getty Letter). Often legitimate — we must immediately verify provenance.

**Response template (acknowledgment within 24h):**
```
Dear Getty Images Legal,

We acknowledge your DMCA notice dated [date] regarding [URL].

The image has been removed pending verification of source. We
maintain a strict editorial policy of using only properly licensed
imagery (Wikimedia Commons CC-BY-SA with attribution, or our own
licensed Unsplash/Pexels content). We are investigating how
licensing protocol was bypassed.

We will respond substantively within 7 business days with either
(a) proof of valid license, or (b) confirmation of removal and
discussion of resolution.

Sincerely, [Founder, DMCA Designated Agent]
```

**Internal:** Pull `git blame` on article, identify editor who ingested image, confirm or invalidate license chain, audit all images by same editor.

---

### Scenario 5 — YouTube Takedown of Embed (Uploader Removed Embed Permission)

**Trigger:** Embedded video iframe shows "Video unavailable" / "This video is no longer available." Not legally actionable — uploader exercised their permission.

**Response:** No legal response needed. Product response:
1. Cron job daily checks iframe status via `oembed.com` ping.
2. Fallback to thumbnail card + "Watch on YouTube" CTA pointing to channel.
3. If F1 official channel removes embed permission *globally*, this is a strategic event — pivot Race Lab to Jolpica race-summary-only mode and surface F1 Highlights via Reddit r/formula1 link cards (no embed).

---

### Scenario 6 — Reddit User Privacy Complaint Over Quoted Thread

**Trigger:** Reddit user emails claiming we quoted their u/username comment in an editorial without consent.

**Reality:** Reddit content is publicly posted under Reddit User Agreement §5 (user grants Reddit non-exclusive licence; news-reporting fair use covers attributed quotation). GDPR Art. 6(1)(f) legitimate interest (journalism) + Art. 85 (journalistic exemption). UK DPA 2018 Sch. 2 Part 5 journalism exemption.

**Response template:**
```
Hi [Username],

Thank you for reaching out about our article "[title]" at [URL].

Your comment was quoted in good-faith reporting on community
sentiment, with attribution to your username only (no personal name,
location, or identifying details). This use is consistent with:
  - Reddit User Agreement §5 (user-licensed content)
  - GDPR Article 85 / UK DPA 2018 Sch. 2 Pt. 5 journalism exemption
  - US fair-use doctrine (17 USC §107)

If you would prefer your username be removed and the quote
attributed as "a Reddit user," we are happy to make that change.
Please confirm and we will update within 24 hours.

Sincerely, [Founder]
```

**Escalation:** If user persists, remove and document — costs nothing, removes friction.

---

## 3. TRADEMARK FILING RECOMMENDATIONS

### 3.1 Marks to File

**Apex word mark — Classes 41, 38, 9, 25**

| Class | Description | Why |
|---|---|---|
| **41** | "Entertainment services; providing online news and information in the field of motorsport; online publication of editorial articles, podcasts, and videos relating to Formula 1 racing" | Core service |
| **38** | "Streaming of audio, video, and audiovisual content via the internet" | Future Apex+ subscription streaming |
| **9** | "Downloadable mobile application software for accessing Formula 1 news, data, and editorial content" | Flutter app Phase 3 |
| **25** | "T-shirts, hoodies, caps, jackets" | Merch — only file if revenue path confirmed; defer to Year 2 |

**Logo mark** — file as figurative mark once final lockup is locked. File separately from wordmark (independent enforcement).

**Slogan candidates worth filing (Class 41):**
- "The Independent Paddock" — descriptive but registrable with secondary meaning
- "Built for the Apex" — distinctive enough
- "Telemetry for Fans" — descriptive, lower registrability

**Defer:** Phase 1 — wordmark + logo only. Slogans Year 2 once one sticks.

### 3.2 Jurisdictional Filing Strategy

| Jurisdiction | Office | Cost (1 class) | Cost (4 classes) | Timing | Notes |
|---|---|---|---|---|---|
| **US** | USPTO | $350 TEAS Plus | $1,400 | 12–18mo to reg | File 1(b) Intent-to-Use to lock priority |
| **EU** | EUIPO | €850 (~$925) | €1,850 (3 add'l classes €150 ea) | 4–6mo | Single filing covers 27 states |
| **UK** | UKIPO | £170 (~$215) | £620 (£50/add'l) | 4mo | Post-Brexit separate filing required |
| **AU** | IP Australia | A$330 (~$215) | A$1,320 | 7–13mo | Madrid Protocol option |
| **Madrid Protocol** | WIPO | CHF 653 base + national fees | varies | 12–18mo | Cost-efficient for 4+ jurisdictions |

**Total Year 1 budget for wordmark + logo across US/EU/UK:** ~$5,000–7,000 inc. counsel ($350/hr × ~8h).

**Recommendation:**
1. Month 1 — USPTO 1(b) ITU on word mark, Class 41 only ($350 self-file via TEAS Plus). Locks priority date.
2. Month 3 — EUIPO + UKIPO filings via Madrid Protocol once revenue or funding confirms staying power.
3. Month 12 — Class 9 + 38 additions once app + streaming roadmap confirmed.
4. Year 2 — Class 25 (merch) only if merch revenue justifies.

### 3.3 Domain Defensive Registrations

**Primary (must own before press):**

| Domain | Status | Annual Cost | Reasoning |
|---|---|---|---|
| `apex.com` | Owned by Apex Tool Group | — | Unobtainable. NOT a blocker. |
| `apex.gg` | Likely available | $30/yr | **Primary** — gaming/esports halo, short, brandable |
| `apex.racing` | Likely available | $35/yr | **Co-primary** — motorsport TLD |
| `apex-f1.com` | Likely available | $12/yr | **AVOID** — uses "F1," FOM TM risk |
| `apexf1.com` | Likely available | $12/yr | **AVOID** — same FOM TM concern |

**Defensive (Year 1):**
- `apex.gg` (primary)
- `apex.racing` (co-primary, redirect)
- `getapex.com`, `apexhq.com`, `apexpaddock.com` ($12/yr ea = $36)
- ccTLDs: `apex.co.uk` (£8/yr), `apex.de` (€10/yr if available — likely taken), `apex.com.au` (A$15/yr), `apex.it` (€20/yr) — file in Ferrari country defensively

**TLD strategy ruling:** **Recommend `apex.gg` as primary canonical**, `apex.racing` as redirect. Avoid `*f1*` domains — direct trademark exposure to FOM. Free-tier note: Cloudflare Registrar offers at-cost (~$8–10/yr for .com, $25/yr for .gg) with free WHOIS privacy and 2FA.

**Total domain Year 1 budget:** ~$150.

---

## 4. DMCA AGENT REGISTRATION + WORKFLOW

### 4.1 Designated Agent Filing

**Action:** File DMCA Designated Agent with US Copyright Office.
- **URL:** https://dmca.copyrightoffice.gov/dmca/
- **Fee:** $6 (renewal every 3 years)
- **Time:** 30 min self-file
- **What to file:**
  - Service provider name: Apex (or "[LegalEntity] dba Apex" post-incorporation)
  - Alternate names: APEX, Apex F1, apex.gg
  - Physical address (PO Box acceptable — recommend Stable.app virtual address $250/yr)
  - Agent name: ShAuRyA [LastName] (Founder, until counsel retained)
  - Agent email: dmca@apex.gg
  - Agent phone: required (recommend Google Voice number, not personal)

**Why critical:** Without registered agent, Apex loses §512 safe harbor immunity — meaning user-uploaded content (when comments launch) makes us *directly* liable.

### 4.2 In-App Takedown Form UX

```
/legal/dmca → public-facing form
Fields:
  - Reporter name + organization
  - Reporter email (verified)
  - Sworn statement checkbox: "I have a good faith belief..."
  - 17 USC §512(c)(3)(A) attestation checkbox
  - URL of allegedly infringing content
  - Description of copyrighted work
  - Electronic signature (typed name)
  - File attachment (optional, PDF/JPG)
Submit → /api/legal/dmca → Postgres `dmca_notices` table → Resend email to dmca@apex.gg + Slack alert
```

### 4.3 48hr Response SLA Workflow

| T+ | Action | Owner | Tool |
|---|---|---|---|
| 0h | Notice received → auto-acknowledgment email | System | Resend template |
| 0–4h | Founder review notice validity (six required elements per §512(c)(3)(A)) | Founder | Notion runbook |
| 4–24h | If valid: content disabled, notice forwarded to uploader (if UGC) | Founder | Admin CMS |
| 24–48h | Removal confirmation email to reporter; counter-notice instructions to uploader | System | Templates §4.6 |
| 10–14d | If counter-notice received and validated, content restored unless court order | Founder | Manual review |

### 4.4 Repeat-Offender Termination Policy

**Required by §512(i)(1)(A) for safe harbor.** Three valid DMCA strikes within 12 months → account permanent ban. Tracked in `users.dmca_strikes` column. Reset count on successful counter-notice.

Public policy at `/legal/repeat-infringer`.

### 4.5 Counter-Notification Handling

User submits counter-notice → validate per §512(g)(3) — must include:
1. Physical/electronic signature
2. Identification of removed material
3. Statement under penalty of perjury of good-faith belief
4. Name, address, phone
5. Consent to federal jurisdiction (district of address, or any district if outside US)

Forward to original complainant; restore content in 10–14 business days unless complainant files court action.

### 4.6 Email Templates

**Template A — Acknowledgment (auto, T+0h):**
```
Subject: DMCA Notice Received — Ref #APEX-DMCA-{id}

Hi {reporter_name},

We have received your DMCA notice regarding {url}. Reference
number: APEX-DMCA-{id}.

We will review and respond within 48 hours per our policy.
If you believe this is urgent (e.g., live broadcast), please
reply with "URGENT" in subject.

Apex DMCA Team
dmca@apex.gg
```

**Template B — Takedown Executed (T+24-48h):**
```
Subject: DMCA Takedown Executed — Ref #APEX-DMCA-{id}

Hi {reporter_name},

Following review of your notice (ref APEX-DMCA-{id}), we have
removed/disabled the following content:
  URL: {url}
  Removed at: {timestamp}

The uploader has been notified and has the right to file a
counter-notification per 17 USC §512(g). If a valid
counter-notification is received, we will restore the content
in 10–14 business days unless you notify us that you have filed
a court action seeking restraint.

Apex DMCA Team
```

**Template C — Counter-Notice Forwarding:**
```
Subject: DMCA Counter-Notice Received — Ref #APEX-DMCA-{id}

Hi {complainant_name},

We have received a counter-notification from the uploader
regarding APEX-DMCA-{id}. Per 17 USC §512(g), we are required
to restore the content in 10–14 business days unless you
notify us that you have filed a court action seeking
restraint of the uploader's activity.

[Counter-notice text + uploader contact info attached]

Apex DMCA Team
```

---

## 5. PRIVACY COMPLIANCE ROADMAP

### 5.1 Cookie Consent Vendor

| Option | Cost | Pros | Cons | Verdict |
|---|---|---|---|---|
| **Cookiebot** | $11–61/mo by domain size | TCF-compliant, auto-scan, 47 languages | Subscription, slight banner UX inflexibility | Skip Phase 1 |
| **Iubenda** | $29/mo | Privacy + cookie + consent solution bundle | More expensive at scale | Skip Phase 1 |
| **Own-build (CookieConsent OSS)** | $0 | Full control, design-coherent | Need own consent log, audit risk | **WINNER for Phase 1** |
| **Termly Free** | $0 (limited) | Free tier covers <100k pv | Upgrade pressure | Backup |

**Decision:** Use existing `CookieConsent.tsx` component (already built per Phase A) + log consent to Supabase `consent_logs` table (IP hash, timestamp, choice). Migrate to Cookiebot when MAU >50k or EU lawyer flags it.

### 5.2 DSAR Handling SOP

**Endpoint:** `privacy@apex.gg` and `/legal/dsar` web form.

**SOP timeline (GDPR Art. 12 — 1 month, extendable to 3 months for complex):**

| Day | Action |
|---|---|
| D+0 | Acknowledge receipt within 72h |
| D+0–5 | Verify identity (email + 2FA challenge on account) |
| D+5–20 | Gather data: Supabase `users`, `events`, `comments`, `consent_logs`, `dmca_strikes`, PostHog `persons`, Resend audience |
| D+20–30 | Bundle as JSON + human-readable PDF, email via secure link |
| D+30 | Close ticket, log to `dsar_log` table |

CCPA timeline = 45 days; align with GDPR's stricter 30 to standardize.

### 5.3 Data Residency

- **EU users:** Supabase EU region project (`eu-west-2`) — data stays in EU. R2 bucket EU jurisdiction.
- **US users:** Supabase US project or single EU project (acceptable; US users not subject to data localization). Single EU project is simpler Phase 1.
- **Phase 2 consideration:** Schrems II — SCCs (Standard Contractual Clauses) with all US sub-processors (Vercel, Sentry, PostHog Cloud US). Use PostHog EU instance if launching paid plan.

### 5.4 Children's Privacy (COPPA)

- Age gate at signup: DOB field, hard block <13 (COPPA 15 USC §6501).
- For EU: <16 default, parental consent flow OR block (recommend block — parental verification is operationally expensive).
- "Designed for Families" Apple App Store category? NO — keeps adult sponsorship/affiliate options open.
- Footer: "Apex is not directed at children under 13."

### 5.5 GDPR Article 30 Record of Processing Template

`/legal/internal/article-30-rop.md` (private repo):

```markdown
# GDPR Article 30 ROP — Apex

## Controller
Name: [Legal Entity]
Contact: privacy@apex.gg
DPO: not appointed (Art. 37 thresholds not met)

## Processing Activities

### PA-01: User Account Management
- Purpose: account creation, authentication
- Categories of data subjects: registered users
- Categories of personal data: email, hashed password, DOB, country
- Recipients: Supabase (processor, EU), Resend (processor, EU/US)
- Retention: until account deletion + 30d cooldown
- Lawful basis: Art. 6(1)(b) contract
- TOMs: encryption at rest (AES-256), RLS, MFA

### PA-02: Analytics
- Purpose: product improvement
- Categories of personal data: pseudonymized event data, IP hash, user agent
- Recipients: PostHog (processor)
- Retention: 13 months
- Lawful basis: Art. 6(1)(a) consent (via cookie banner)

### PA-03: Newsletter
- Purpose: marketing newsletter
- Categories of personal data: email, name (optional), open/click logs
- Recipients: Resend
- Retention: until unsubscribe
- Lawful basis: Art. 6(1)(a) consent (double opt-in)

### PA-04: Editorial Comments (Phase 2+)
- Purpose: community discussion
- Categories of personal data: username, comment, IP hash
- Recipients: Supabase
- Retention: until user deletion, public archive of comment text only
- Lawful basis: Art. 6(1)(b) contract + Art. 85 journalism

[... PA-05 DMCA, PA-06 DSAR, PA-07 support, PA-08 ad serving ...]
```

### 5.6 CCPA "Do Not Sell" + Global Privacy Control

- Honor GPC signal (`Sec-GPC: 1` header) — auto opt-out of analytics/advertising cookies. Required under CCPA AB-375 enforcement.
- Footer link: "Do Not Sell or Share My Personal Information" → opens consent panel.
- We technically don't "sell" PII (no ad network resale Phase 1), but disclose in privacy policy as precaution.

### 5.7 Data Deletion Cascade

User clicks "Delete Account" → Supabase function:
```sql
BEGIN;
DELETE FROM comments WHERE user_id = $1;
DELETE FROM consent_logs WHERE user_id = $1;
DELETE FROM dsar_log WHERE user_id = $1;
DELETE FROM newsletter_subscribers WHERE email = (SELECT email FROM users WHERE id = $1);
DELETE FROM events WHERE user_id = $1; -- PostHog API call
UPDATE users SET email='deleted_{id}@apex.gg', name='[deleted]', deleted_at=now() WHERE id = $1;
COMMIT;
```

Resend webhook: `subscriber.deleted` → confirm. PostHog API: `DELETE /api/persons/{id}`. Audit log retained 30d for fraud reversal then purged.

---

## 6. APP STORE COMPLIANCE PRE-AUDIT

### 6.1 Google Play "News & Magazines" Category

- **Choose this over "Sports"** — sports apps require official-team partnerships or "Sports — Fantasy" sub-category. News & Magazines tolerates unofficial editorial.
- **Restrictions:** Section 3 of Play Console Policy — no deceptive behaviour, no scraped content (must transform), no impersonation. Required: privacy policy URL, target SDK 35+, account deletion in-app.

### 6.2 Apple App Store Review Guidelines (Critical Sections)

- **1.6 — Data accuracy:** "If your app inaccurately or misleadingly presents data, expect rejection." → All data badges with source attribution mandatory.
- **4.1 — Copycats:** Must be visually + functionally distinct from F1 official app. Apex's bespoke design system + editorial focus suffices.
- **5.2.1 — Intellectual Property:** "Make sure your app only includes content that you created or that you have a license to use." → All F1/team marks must be excluded from UI screenshots and metadata.
- **5.2.5 — Apps and extensions ... that display or contain content from third parties:** disclaimer required.

### 6.3 Common Rejection Reasons + Pre-emption

| Rejection reason | Pre-empt |
|---|---|
| 4.1 — Copycat of F1 official app | Distinct UI; no Pirelli/Rolex/team logos; original editorial above the fold |
| 5.2 — Use of F1 marks | Zero use in app icon, metadata, screenshots |
| 1.6 — Inaccurate sports data | Source badges visible; "unofficial" disclaimer at splash |
| 4.0 — Spam (low utility) | Editorial + telemetry combo > 4 screens unique content |
| 2.3 — Performance | LCP <2.5s, no crashes in TestFlight |
| 5.1.1 — Privacy policy missing | URL in Connect + in-app |

### 6.4 Listing Copy Template

```
App name (max 30): Apex — F1 Fan Companion
Subtitle (max 30): Independent F1 News & Stats
Promotional text (max 170):
  The premium independent Formula 1 fan companion. Editorial
  deep-dives, telemetry insights, race day mission control.
  Not affiliated with Formula 1® or FIA.

Description first paragraph (REQUIRED — disclaimer first):
  Apex is an independent Formula 1 fan platform. We are not
  affiliated with, endorsed by, or sponsored by Formula 1®,
  FIA, FOM, or any Formula 1 team. All trademarks are the
  property of their respective owners.

  [... feature bullets ...]

Keywords (max 100 chars, comma-separated):
  formula racing,motorsport,race results,paddock,telemetry,
  grand prix calendar,driver standings
  (NO "f1", NO "formula 1", NO team names)
```

### 6.5 Disclaimer Placement

- **Splash screen** — fade-in disclaimer micro-line for 1.5s on first launch
- **About screen** — full disclaimer paragraph
- **Footer (web)** — disclaimer always visible
- **App Store description** — first paragraph
- **Settings → Legal** — full T&Cs + privacy

---

## 7. FOUNDER LIABILITY SHIELDING

### 7.1 Entity Selection

| Entity | Pros | Cons | Cost setup | Fit |
|---|---|---|---|---|
| **US LLC (Delaware)** | Pass-through tax, low complexity, founder protection | Limited VC appetite | $90 + $300 annual + reg. agent $50/yr | Pre-revenue solo |
| **US C-corp (Delaware)** | VC-standard, QSBS §1202 ($10M tax exemption), 83(b) | Double taxation if dividends | $89 + $175 franchise + $400 lawyer | If raising US VC |
| **UK Ltd** | Cheap (£12), EU access (until Brexit residency rules), R&D tax credits 33% | UK tax resident; PSC register public | £12 setup, £13/yr | If founder UK-based |
| **Estonia OÜ (e-Residency)** | €2,500 setup, EU entity, digital-first | Tax residency complexity | €265/yr | Digital nomad fit |

**Recommendation for solo founder Apex Phase 1:** **Delaware LLC** until first revenue or first co-founder.
- **Reasoning:** Pre-revenue $0 income — no double-taxation pain. LLC limits personal liability for C&D, defamation, DMCA. Convert to Delaware C-corp via "F-reorg" or simple statutory conversion before raising priced round (~$2k legal, no tax event if QSBS clock matters).
- **Wyoming LLC** is a strong alt: $100 setup, $60/yr, stronger privacy than Delaware, no franchise tax. **If founder is non-US resident**, Wyoming LLC + ITIN is the cleanest path.

### 7.2 When to Incorporate

| Trigger | Action |
|---|---|
| First $1 of revenue | Incorporate now (commingling = liability piercing) |
| First contractor hire | Incorporate before paying — entity must own IP, not founder personally |
| First C&D received | Incorporate immediately — entity-level liability shield |
| First fundraise conversation | Incorporate as Delaware C-corp |
| Pre-revenue, solo, $0 spend | Optional — wait until 30 days before first revenue / hire / fundraise |

**For Apex today (free-tier, pre-revenue, solo):** Defer 60–90 days. File LLC the day before first $1 revenue OR before first 1099 paid OR before signing first letter agreement with FOM.

### 7.3 Operating Agreement Boilerplate (Day 1 Sections)

1. Members, membership interests
2. Capital contributions
3. Allocation of profits/losses
4. Management — manager-managed
5. Buy-sell / right of first refusal
6. **IP assignment from founder to LLC** (critical — execute on Day 1)
7. **Founder vesting** (even solo — relevant if co-founder/investor joins later)
8. Indemnification of manager
9. Dissolution
10. Drag-along / tag-along (placeholder)

**Recommend template:** Cooley GO (free), Stripe Atlas (paid bundle $500), Clerky ($800 incorporation + ops agreement).

### 7.4 D&O Insurance

- **When:** Within 30 days of first board / first outside director / first $250k revenue.
- **Coverage:** $1M Side A/B/C for seed; $3M post-Series A.
- **Cost:** $1,800–4,000/yr seed (Vouch, Embroker).

### 7.5 Founder Vesting Cliff

Even as solo: 4-year vest, 1-year cliff. Protects co-founder / investor / acquirer future-state. Self-impose via operating agreement section 7.

### 7.6 IP Assignment

**Day 1 document:** "Founder IP Assignment Agreement" — assigns all pre-incorporation IP (code in `0fe3684`, designs in `screen.png` files, brand assets) to entity. Without this, M&A diligence finds founder still owns code, deal blocked. Notarize or DocuSign.

---

## 8. CONTENT LIABILITY

### 8.1 Editorial Defamation Fact-Check SOP

For any article making negative factual claim about driver/team:

1. Two independent verified sources (no Twitter rumor as sole source).
2. Right-of-reply outreach to subject 24h before publication (email driver press office).
3. Distinguish opinion vs fact — opinion language: "appears to," "suggests," "in this writer's view."
4. Legal-sensitive draft → 24h sit + counsel review (Year 2 retain media-law firm).
5. Archive all sources in CMS metadata.

**Standard varies:**
- US: *NYT v. Sullivan* — public figures must prove actual malice. F1 drivers = public figures.
- UK: Defamation Act 2013 — claimant must show serious harm; honest opinion + public interest defenses.
- EU varies; harshest in Germany/France.

### 8.2 Quote Attribution

- **Twitter/X:** Embed via official iframe = clearly attributed; quoting + screenshot also fair use for news reporting.
- **Reddit:** Username attribution OK; remove on request (Scenario 6).
- **Press conferences:** FOM transcripts are factual statements — repeatable as news. Attribute speaker.
- **Private DMs:** NEVER republish without explicit consent.

### 8.3 UGC (When Comments Launch)

- **US:** 47 USC §230 immunity for third-party content. Required: don't materially edit. Moderation OK without losing immunity.
- **EU:** e-Commerce Directive 2000/31/EC Art. 14 — host immunity contingent on actual-knowledge takedown. UK Online Safety Act 2023 — risk assessment + reporting required for "user-to-user" services over thresholds.
- **Notice-and-takedown:** Per §4 above.
- **Pre-moderation:** Defer to launch. Reactive moderation + ML toxicity filter (Perspective API free tier).

### 8.4 AI-Assisted Editorial Disclosure

**Decision:** Disclose. Add footer line on AI-assisted pieces: "Draft assisted by AI; reviewed and verified by [author]." Reasoning:
- FTC AI disclosure guidance Sept 2024
- EU AI Act Art. 50 transparency for AI-generated content
- Reader trust premium

DO NOT publish pure AI-generated content without human review. Editorial integrity > velocity.

### 8.5 Photo Licensing

- **Wikimedia Commons CC-BY-SA:** Attribution UI must show author + license type + link to license + link to source. Build `<PhotoAttribution>` component with these four required slots.
- **Getty pay-per-use:** Editorial license $175–800/image. Use only when story-critical.
- **Subscription path Year 2:** Imago Sport (~$500/mo editorial-grade motorsport) or Motorsport Images partnership inquiry.
- **Free fallbacks:** Pexels, Unsplash (now Getty-owned — read terms; F1-related photos rare).

---

## 9. REGULATORY EDGE CASES

### 9.1 F1 Betting Odds Display

**Triggers gambling regulation** in UK (Gambling Commission), US (state-by-state), AU (ACMA). Even *displaying* odds without taking bets can require advertising license under UK Gambling Act 2005 §327 and US state laws (NY especially aggressive 2025–26).

**Decision:** DO NOT display odds Phase 1. If pursued, geo-gate to legal jurisdictions only and partner with licensed operator (affiliate-only, never operator).

### 9.2 Fantasy Game UGC

**Game-of-skill vs gambling:** US — varies by state (Indiana, Florida, Texas have restrictive readings). UK — Fantasy sports = no gambling license required if "skill predominates."

**Decision:** Defer fantasy game to Phase 4+. Requires licensing legal review per jurisdiction. Apex Fantasy ≠ free entry. If launched: free-to-play only, no entry fees, no cash prizes — eliminates regulatory exposure.

### 9.3 Cryptocurrency / NFT

**Decision:** Hard "NO" in Phase 1-2. Reasoning:
- SEC enforcement aggression (Howey test exposure)
- EU MiCA Regulation (in force Dec 2024) — full prudential regime
- Brand contamination — premium-design audience won't tolerate
- Founder time sink

Revisit only post-Series A with dedicated counsel.

### 9.4 Influencer / Driver Promotion Disclosure

**FTC 16 CFR §255** — endorsements must disclose material connection. If driver/team promotes Apex on socials post-deal, deal contract must require `#ad` or `#sponsored` disclosure.

**UK ASA CAP Code §3.1** — similar; `#ad` not `#partner`.

**Standard influencer agreement clause:**
```
Talent agrees to comply with FTC 16 CFR §255 and ASA CAP Code §3.1
in all Promotional Content, including prominent and unambiguous
disclosure of the material connection (e.g., "#ad" or "#sponsored"
at the start of the post caption and in video first 3 seconds).
Failure to comply terminates this agreement without payment.
```

---

## 10. INSURANCE STACK

| Coverage | Phase 1 carrier | Phase 1 cost | Phase 3 cost | When |
|---|---|---|---|---|
| **General Liability** | Hiscox / Next | $400–800/yr | $1,500/yr | Day 1 |
| **Professional Indemnity / E&O (media-tech)** | Hiscox MediaTech, Embroker | $1,200–2,500/yr ($1M aggregate) | $4,000/yr | Pre-launch, before first editorial |
| **Cyber Liability** | Coalition, At-Bay, Vouch | $1,500–2,500/yr ($1M) | $4,000/yr | Before user accounts launch (Phase C) |
| **IP Infringement / Media Liability** | Vouch Media+, Embroker Media | $2,500–4,500/yr | $7,500/yr | Before publishing editorial |
| **D&O** | Vouch, Embroker | $1,800/yr | $4,000/yr | When board forms / fundraise |

**Year 1 stack:** $7,400–12,300 — start with bundled Vouch or Embroker media-tech package $5,500/yr for first-year combined GL + E&O + Cyber + Media. Skip D&O until raise.

**Year 3 stack:** $21,000–25,000.

**Carrier shortlist (media startups):**
- Hiscox MediaTech — accessible solo founder, instant online quote
- Embroker Media Liability — startup-friendly, bundles
- Vouch — Silicon Valley startup standard, fastest binding
- Coalition / At-Bay — cyber-first, monitor-plus-insure model

---

## 11. EXIT-READY LEGAL HYGIENE

For $5M–$50M acquihire/strategic in 24-36 months, M&A diligence will examine:

### 11.1 Cap Table
- Carta or Pulley from incorporation (free tier under 25 stakeholders)
- All option grants 409A-valued (defer to fundraise; $1,500 valuation)
- 83(b) elections filed within 30 days of restricted stock grant
- SAFEs documented in cap table (Y Combinator standard SAFE)

### 11.2 IP Audit
- All code written by founder = assigned via Founder IP Assignment Day 1
- All contractor work via signed IP assignment + work-for-hire clause
- Trademark filings clean, no live oppositions
- Patent? — None pursued (no novel patentable subject matter Phase 1)
- Trade secrets register: data pipeline architecture, editorial SOPs

### 11.3 Employment / Contractor
- All contractors (editors, designers) on Apex MSA + SOW with:
  - IP assignment to entity
  - Confidentiality / NDA
  - Independent contractor status (no W-2/PAYE)
  - Non-solicit (1yr post-engagement)
  - No non-compete (CA bans; FTC 2024 rule litigated)

### 11.4 Open Source License Audit
- Quarterly FOSSA, Snyk, or `license-checker` scan
- No AGPL/SSPL in production bundle
- SBOM (Software Bill of Materials) maintained
- MIT, Apache-2.0, BSD all OK; copyleft (GPL) only as separate process not embedded

### 11.5 Data Processing Inventory
- Article 30 ROP maintained
- All sub-processor DPAs signed (Supabase, Resend, PostHog, Cloudflare, Vercel)
- SCCs in place for non-EU transfers
- Breach log (even if empty)

### 11.6 Pre-Diligence Checklist (provided to buyer)
- Articles of incorporation
- Operating agreement / bylaws
- Cap table
- All IP assignments (founder + contractors)
- All TM registrations + applications
- All material contracts (TM/data partnerships, hosting, licensing)
- Privacy policy, T&Cs
- DMCA agent registration
- Article 30 ROP + DPAs
- Insurance certificates
- Litigation register (empty — preserve it)
- Open-source SBOM + license scan
- Employment / contractor agreements
- Tax filings (federal, state, sales tax if applicable)

---

## 12. 30 / 60 / 90 DAY LEGAL TODO

### Days 0–30 (Foundations)
1. **[CRITICAL]** Register domains: `apex.gg`, `apex.racing`, defensive bundle ($150). Cloudflare Registrar.
2. **[CRITICAL]** File USPTO TM 1(b) ITU on "APEX" word mark, Class 41 ($350, TEAS Plus self-file).
3. **[CRITICAL]** Run TESS, EUIPO, UKIPO clearance search ($0 self).
4. **[CRITICAL]** File DMCA Designated Agent with US Copyright Office ($6, 30 min).
5. **[CRITICAL]** Create `legal@apex.gg`, `dmca@apex.gg`, `privacy@apex.gg`, `security@apex.gg` aliases.
6. Draft + publish `/legal/privacy`, `/legal/terms`, `/legal/dmca`, `/legal/disclaimer` (already in Phase A scaffolding — refine wording).
7. Audit `package.json` — run `license-checker --production --failOn 'AGPL-3.0;SSPL-1.0'` and fix.
8. CI guard: Semgrep rule blocking `SUPABASE_SERVICE_ROLE_KEY` in client bundle.
9. CI guard: pgTAP test fails build if any Supabase table lacks RLS.
10. Add `<PhotoAttribution>` component with author/license/source/link fields.
11. Add `data-source` badge to all telemetry components.
12. Quote $1,500 Hiscox MediaTech bundle for Phase 1.

### Days 31–60 (Hardening)
13. Engage TM counsel for 4hr/mo retainer ($1,400) — review TM filings + draft C&D responses.
14. File EUIPO + UKIPO TM applications via Madrid Protocol (~$2,500 inc. counsel).
15. Draft Founder IP Assignment + sign before incorporation (DocuSign).
16. Stand up `dmca_notices`, `dsar_log`, `consent_logs`, `breach_log` tables in Supabase.
17. Stand up `/legal/dmca`, `/legal/dsar`, `/legal/repeat-infringer` forms.
18. Write Article 30 ROP draft.
19. Sign DPAs with sub-processors (Supabase, Resend, PostHog, Vercel — all standard).
20. Implement age gate on signup (<13 hard block, <16 EU block).
21. Implement GPC header detection + Do-Not-Sell flow.
22. Implement data-deletion cascade SQL function + UI.
23. Bind Hiscox/Vouch Year 1 insurance bundle.
24. Set up domain renewal auto-pay + 1Password Emergency Kit.

### Days 61–90 (Hygiene + Continuity)
25. Incorporate Wyoming or Delaware LLC (~$200) — only if first revenue/contractor/C&D imminent.
26. Execute IP Assignment from founder to LLC.
27. Draft + sign Operating Agreement (Cooley GO template, free).
28. Set up Stable.app virtual mailing address ($250/yr) for DMCA agent + state filings.
29. Editorial fact-check SOP published to `/internal/SOP/editorial.md`.
30. Contractor MSA + SOW template drafted (use Common Paper free templates).
31. Quarterly OSS license scan automated in CI.
32. Quarterly cost-forecast + vendor lock-in drill scheduled (calendar invite).
33. Practice migration drill: export Supabase → Hetzner VPS in <4h.
34. Draft "Founder Incapacity" continuity letter; deposit in 1Password emergency vault.
35. Schedule annual TM renewal calendar reminders (year 5 USPTO §8 declaration, year 9 §9 renewal).

---

**Budget Year 1 totals:**
- Domains: $150
- TM filings (US + EU + UK, 1 class): $5,500 (inc. counsel)
- DMCA agent: $6
- Counsel retainer: $16,800 ($1,400/mo)
- Insurance: $5,500 (Vouch/Hiscox bundle)
- Incorporation: $200 (Wyoming LLC) + $250 virtual address
- Privacy tooling: $0 (own-build)
- **Total Year 1 legal spend: ~$28,400**

Realistic floor for pre-revenue solo founder if deferring counsel retainer and EU/UK filings: **~$6,500**.

**Closing note:** This playbook is conservative-pragmatic and counsel-informed but is NOT a substitute for engagement with a licensed attorney in your jurisdiction. Before any binding action (TM filing, incorporation, C&D response, DMCA counter-notice), have 30-min counsel review. Treat this as the operational scaffolding; counsel signs the load-bearing beams.
