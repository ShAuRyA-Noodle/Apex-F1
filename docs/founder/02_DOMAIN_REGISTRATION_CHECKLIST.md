# Domain Registration — apex.gg + Defensives

**Action owner:** ShAuRyA
**Goal:** Lock canonical brand domain + close obvious defensive registrations against typosquatters and copycats.
**Cost:** ~$135 total (per below)
**Time:** 15 minutes
**Window:** This week, before any social/press exposure of the name "Apex".

---

## 1. Recommended registrar: Cloudflare Registrar

- URL: https://dash.cloudflare.com/?to=/:account/domains/register
- Why Cloudflare: at-cost pricing (no markup), free WHOIS privacy, free DNS, automatic 2FA, never tries to up-sell. Beats GoDaddy / Namecheap on every dimension.
- Requires a Cloudflare account (free): https://dash.cloudflare.com/sign-up

### Why not Namecheap / GoDaddy / Squarespace
- Namecheap: solid but charges $11-13 for .com vs Cloudflare's $10.44
- GoDaddy: aggressive renewal pricing + bundled garbage upsells
- Squarespace: same as Google Domains was — expensive and tied to their CMS

### .gg TLD note
- `.gg` is administered by **Hexonet** (formerly the Guernsey CCTLD)
- Cloudflare does NOT register `.gg` directly. For `.gg` use **Hexonet / Gandi / Porkbun / 101domain**.
- Recommended `.gg` registrar: **Porkbun** ($50.94/yr for .gg, fair pricing, clean dashboard). URL: https://porkbun.com/

---

## 2. The 5 domains to register

Order matters — register canonical first, then defensives.

### 2.1 PRIMARY (must-have)
| # | Domain | TLD | Cost/yr | Registrar | Purpose |
|---|---|---|---|---|---|
| 1 | **apex.gg** | .gg | ~$50 | Porkbun | Canonical brand domain. Short, memorable, F1-flavored (Apex = racing line / .gg = gaming-culture but feels racing). |

### 2.2 DEFENSIVES (close obvious confusion + typo paths)
| # | Domain | TLD | Cost/yr | Registrar | Purpose |
|---|---|---|---|---|---|
| 2 | **apex.racing** | .racing | ~$30 | Cloudflare | Strong thematic defensive; redirect to apex.gg |
| 3 | **apexf1.com** | .com | ~$10 | Cloudflare | Closes "apex f1" typo path; redirect to apex.gg. **NOTE:** Putting "F1" in a domain has FOM trademark exposure — buy and PARK (do not point DNS to live site), just to keep out of squatter hands |
| 4 | **getapex.com** | .com | ~$10 | Cloudflare | Common app-startup pattern; redirect |
| 5 | **apex.app** | .app | ~$15 | Cloudflare | For mobile app store deep-link landing (Phase 3); redirect |

### 2.3 OPTIONAL (consider if budget allows)
| # | Domain | TLD | Cost/yr | Registrar | Purpose |
|---|---|---|---|---|---|
| 6 | apex.fm | .fm | ~$70 | Cloudflare | Podcast / radio play. Skip unless launching audio in Y1. |
| 7 | apexpaddock.com | .com | ~$10 | Cloudflare | Editorial sub-brand |
| 8 | apex.media | .media | ~$25 | Cloudflare | Press-kit subdomain placeholder |

### 2.4 DO NOT register
| Domain | Reason |
|---|---|
| anything with "F1" prominently | FOM trademark exposure even for parked domain |
| anything with "Formula" | Same |
| anything with "FIA" | Different organization, also TM'd |
| .io | Slow DNS, ICANN flagged for retirement consideration |
| .me | Personal-feel, off-brand |
| .net / .org | Off-brand for a sports media product |

---

## 3. Step-by-step (~15 min)

### 3.1 Porkbun: apex.gg
1. Create account: https://porkbun.com/account/signup
2. Search `apex.gg` — if available, add to cart
3. At checkout:
   - Privacy Whois: **ON** (free)
   - Auto-renew: **ON**
   - Period: 2 years (lock in pricing, hedge against renewal hikes)
4. Total: ~$100 for 2yr
5. **DNS:** keep at Porkbun for now. Migrate to Cloudflare DNS later (free) for Vercel/Fly hosting integration.

### 3.2 Cloudflare Registrar: 4 defensives in one cart
1. Sign in to Cloudflare: https://dash.cloudflare.com/
2. Navigate to **Domains → Register Domain**
3. Search each + add to cart:
   - apex.racing
   - apexf1.com
   - getapex.com
   - apex.app
4. At checkout:
   - WHOIS privacy: automatic + free
   - Period: 1 year (Cloudflare is at-cost so no upside to multi-year)
5. Total: ~$65

**Grand total:** ~$165 first year, ~$120/yr thereafter.

---

## 4. DNS setup (after registration, ~10 min)

### 4.1 apex.gg (primary)
- For now: nothing. Keep parked.
- When Vercel deploy lands (Phase A end / Phase B start):
  - In Vercel Dashboard → Project → Settings → Domains → Add `apex.gg`
  - Vercel shows 2 DNS records (CNAME + A) to add
  - In Porkbun: DNS Records → Add the 2 records
  - Wait ~10 min for propagation

### 4.2 Defensives (all 4)
- In Cloudflare Dashboard → Domain → DNS → set redirect rule:
  - `apex.racing` → 301 redirect → `https://apex.gg`
  - `apexf1.com` → KEEP PARKED (do NOT redirect — FOM TM exposure on referrer logs). Cloudflare offers "Page Rules" → forward to apex.gg only IF you accept that risk; safer option is to leave parked with a literal HTML "Apex independent fan platform" placeholder.
  - `getapex.com` → 301 redirect → `https://apex.gg`
  - `apex.app` → 301 redirect → `https://apex.gg` (until mobile launches; then point to app store deep-link)

---

## 5. After registration

Drop me these 5 strings here and I'll wire them into:
- README.md
- `apps/web/app/layout.tsx` metadata `metadataBase`
- robots.txt + sitemap.xml
- `NEXT_PUBLIC_SITE_URL` env var documentation
- Vercel deploy configuration

```
PRIMARY_DOMAIN=apex.gg
DEFENSIVE_DOMAINS=apex.racing,apexf1.com,getapex.com,apex.app
```

---

## 6. Email addresses to set up (5 min, free via Cloudflare Email Routing)

Once apex.gg DNS is on Cloudflare, set up 4 forwarding addresses to your personal Gmail:

| Address | Forward to | Purpose |
|---|---|---|
| `legal@apex.gg` | your Gmail | DMCA, C&D, takedowns (per PID + master plan) |
| `dmca@apex.gg` | your Gmail | DMCA specifically (per USCO designated agent registration — see docs/founder/03_DMCA_AGENT.md) |
| `privacy@apex.gg` | your Gmail | GDPR DSAR / privacy requests |
| `tm@apex.gg` | your Gmail | USPTO + EUIPO + UKIPO correspondence |
| `hello@apex.gg` | your Gmail | General contact |

Cloudflare Email Routing path: Dashboard → apex.gg → Email → Email Routing → Create address → Forward to.

---

## 7. Why this matters now

- Domain squatters monitor USPTO ITU filings and register the corresponding `.com/.io/.app` within hours of the filing date.
- File domain BEFORE USPTO filing if possible, or within 24 hours after.
- Cost to register defensives now: ~$50/yr.
- Cost to buy a squatted domain later: $5,000-$50,000 + lawyer fees.
