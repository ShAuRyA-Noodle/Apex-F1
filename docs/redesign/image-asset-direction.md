# Image generation prompts + asset direction for Apex

# APEX — Cinematic Image Prompt Library (30 prompts)

Brand-safe, model-agnostic prompts for DALL-E 3, Midjourney v6, FLUX. All prompts engineered to avoid trademarked F1 marks, real driver likenesses, real circuit branding, and team logos. Drop into `apps/web/public/images/` and reference via `next/image`.

Global negative prompt (applies to all): `no F1 logo, no team logos, no sponsor branding, no real driver faces, no Ferrari, no Mercedes, no Red Bull, no Pirelli text, no FIA marks, no checkered flag cliche, no podium champagne, no AI-typical lens flare, no oversaturated neon, no stock-photo composition, no watermark, no text, no signature`

---

## A. Hero backgrounds (5)

### 01. Homepage hero — pit lane at night
**Purpose:** Full-bleed hero behind `/` homepage title block (HeroSection.tsx).
**Prompt:**
Cinematic wide shot of an anonymous Formula 1 pit lane at 3am, photographed on Arri Alexa 65mm with Cooke S7/i anamorphic lens, shallow depth of field, f/1.4. The frame is dominated by deep architectural blacks (#0F0F0F to #141313 gradient) with negative space occupying 60 percent of the composition. Two abstract crew silhouettes in unbranded grey overalls crouch over a generic open wheel race car chassis on the left third, faces obscured by shadow. Telemetry monitors glow faint cyan and warm amber from inside an unmarked garage bay, light bleeding only as soft rectangles, not lens flares. A single horizontal streak of telemetry red (#E10600) cuts across the lower third, suggesting tail-light motion blur of a car already past. Ground is wet polished concrete reflecting the red streak vertically downward. Atmospheric haze, very fine raked light from a single overhead sodium fixture in the far background. No identifiable logos, no number plates, no brand markings anywhere. Color grade: ACES filmic, lifted shadows, low-key key light, magenta crushed blacks. Texture: 35mm film grain, subtle vignette. Mood: surgical, hushed, paddock-after-dark.
**Negative:** bright daylight, crowd, mascot, race start, photographer credits, visible sponsor wall.
**Aspect:** 21:9 · **Resolution:** 3840x1646 · **Grade:** #141313 base, R: 226 / G: 6 / B: 0 accent only.
**Usage:** `/apps/web/app/(marketing)/page.tsx` — HeroSection background layer behind H1.

---

### 02. Homepage hero alt — dawn corner motion blur
**Purpose:** Hero variant / fallback for ISR rotation.
**Prompt:**
Ultra-cinematic side-on tracking shot of three unmarked open-wheel race cars rounding a banked corner at dawn, captured with 1/15 second shutter for extreme horizontal motion blur. Cars rendered as silhouettes only, all branding stripped, monocoque bodies in matte graphite. Front car painted in deep oxblood that reads as telemetry red (#E10600) under the dawn light. Background is a soft mauve-to-charcoal sky gradient, sun not yet visible but warming the horizon. Banked asphalt surface in heavy macro grain, individual rubber marbles visible in the foreground. Dust and rubber particles suspended in the air, lit from behind in volumetric god-rays. Composition follows golden ratio with cars occupying lower right anchor. Shallow depth of field on lead car, others smeared into pure speed. Shot on Panavision Millennium DXL2, Panaspeed 50mm lens, 4-perf 65mm equivalent. ACES color science, contrast curve lifted in shadows, magenta in the blacks, teal-ish midtones. Mood: pre-race ritual, the lap nobody sees.
**Negative:** identifiable nose cones, halo with sponsor decal, livery stripes that match real teams, crowd, marshal.
**Aspect:** 21:9 · **Resolution:** 3840x1646 · **Grade:** dawn mauve into #141313, red car as single chroma anchor.
**Usage:** `/apps/web/app/page.tsx` HeroSection alt / `/latest` editorial banner.

---

### 03. Helmet visor reflection — vertical mobile hero
**Purpose:** Mobile-first hero (9:16) for responsive homepage and `/predict` landing.
**Prompt:**
Vertical macro close-up of an anonymous full-face racing helmet visor, no driver visible, helmet shell painted matte graphite with one single curving line of telemetry red (#E10600) flowing across the brow. The mirrored visor reflects an abstract field of telemetry data: thin glowing tickers, throttle traces, brake bar graphs, lap delta numbers, all rendered as neon teal and white linework, deliberately illegible, no real values. Reflection composition is a sci-fi cockpit HUD reimagined as a Rothko field of horizontal data bands. Helmet fills 70 percent of the vertical frame, top crowned with negative space and a single faint red rim light. Background: pure #141313 void with a slight smoky haze. Shot on Phase One IQ4 with 120mm macro lens, focus stacked. Extreme tonal control, deep blacks, no clipped highlights. Mood: introspective, helmet as cathedral. Texture: micro scratches on visor edge, fingerprint smudge faintly visible.
**Negative:** driver face, eyes, real team helmet design, oakley-style strap branding, gold mirror tint, anime style.
**Aspect:** 9:16 · **Resolution:** 1440x2560 · **Grade:** crushed blacks, single chroma red anchor, teal data tint.
**Usage:** `/apps/web/app/page.tsx` mobile hero / `/predict` page hero.

---

### 04. Aerial track at night — abstract
**Purpose:** Section background behind `/schedule` or `/live/track`.
**Prompt:**
Top-down satellite-style aerial render of a generic abstract racetrack, completely invented layout, no resemblance to any real circuit. The track itself is invisible, only marker lights remain: a continuous dotted chain of telemetry red (#E10600) points outlining the racing line, fading toward apexes. Ground is pitch black with a faint topographic noise texture suggesting tarmac, run-off, and gravel without depicting them literally. Drifting fog banks sweep across the lower third, partially obscuring the southern section of the circuit. A single distant landing-strip white light at the top right gives spatial anchor. Composition is map-like, cartographic, almost like a Field Notes diagram crossed with a Bladerunner overhead shot. No buildings, no pit complex, no grandstands. Style references: NASA night composite, Apple Maps dark mode satellite, Edward Tufte data minimalism.
**Negative:** city lights, runways, real circuit shape, GPS pins, compass rose, scale bar.
**Aspect:** 21:9 · **Resolution:** 3840x1646 · **Grade:** #0F0F0F base, #E10600 marker chain, #c4c7c7 fog whites.
**Usage:** `/apps/web/app/live/track/page.tsx` background / `/schedule` section divider.

---

### 05. Tyre tread macro
**Purpose:** Texture hero behind `/results` or strategy story cards.
**Prompt:**
Extreme macro of a single fresh racing slick tyre tread surface, no brand markings, no sidewall lettering, no compound colored band. Photographed at f/2.8 with 100mm macro lens, focus razor thin on a cluster of rubber marbles clinging to the tread. Surface texture shows micro-graining, heat-cycled bloom, and a faint sheen of track oil. One sharp diagonal shadow falls across the right two thirds, suggesting a low raking light source. Background outside the rubber dissolves into pure black at f/2.8 falloff. Composition: rule-of-thirds with marbles cluster on left anchor, negative tread surface filling rest. Color: rubber renders almost blue-black at this contrast, with a single subtle smear of red tyre paint along the lower edge as a brand accent. Mood: forensic, evidence locker, the morning after the race.
**Negative:** sidewall, manufacturer name, rim, valve, mounted on car, studio softbox glow.
**Aspect:** 21:9 · **Resolution:** 3840x1646 · **Grade:** monochromatic graphite with one red smear.
**Usage:** `/apps/web/app/results/[season]/page.tsx` section background.

---

## B. Circuit silhouettes — line art (5)

All circuit prompts share these constraints: stroke 2px, monoline, transparent background PNG, single color overlay (#E10600 by default but engineered to recolor via `currentColor` in `<svg>` reimport). No labels. No country names. No corner numbers. Output as raster then trace to SVG.

### 06. Monaco — coastline + street layout
**Purpose:** Decorative graphic for `/schedule/[season]/[race]` Monaco card.
**Prompt:**
Pure line-art technical diagram of the Monte Carlo street circuit shape, traced as a single continuous 2px white stroke on a transparent background. The circuit's tight chicane through the harbor section, the tunnel curve, the casino hairpin, and the swimming pool chicane all clearly readable as geometric flow. Surrounding the circuit, a delicate dotted line traces the Mediterranean coastline as it bends around the harbor, plus minimal hash-mark indicators for the harbor water and one small dotted rectangle suggesting the marina basin. No buildings, no text, no compass. Style: Dieter Rams meets architectural plan drawing meets Field Notes. All strokes uniform weight. Composition centered, with 10 percent padding around bounding box.
**Negative:** filled shapes, gradient, shading, "MONACO" text, F1 logo, corner numbers, sponsor patches.
**Aspect:** 16:9 · **Resolution:** 2400x1350, transparent PNG · **Grade:** monoline white on alpha, recolored at runtime.
**Usage:** `/packages/ui/src/icons/circuits/monaco.svg` after vector trace.

---

### 07. Silverstone — Maggotts-Becketts-Chapel emphasized
**Prompt:**
Single-stroke line art of a fictionalized version of the Silverstone-style fast flowing circuit shape, with the high-speed left-right-left esses section in the upper right of the composition rendered slightly thicker (3px) to draw the eye to that sequence. Rest of circuit at 2px, on transparent background. Two small dotted radii sweep through the inside of that complex to subtly indicate the geometric severity. No text, no pit straight markings, no DRS zones, no compass.
**Negative:** any "Silverstone" or "British" text, real RAF runway shape, signage.
**Aspect:** 16:9 · **Resolution:** 2400x1350, transparent · **Grade:** monoline white on alpha.
**Usage:** `/packages/ui/src/icons/circuits/silverstone.svg`.

---

### 08. Spa — Eau Rouge / Raidillon with mountain backdrop
**Prompt:**
Line art of a generic forested high-altitude circuit shape evocative of the Ardennes layout, single 2px stroke on transparent background. The famous uphill esses sequence at the lower left rendered with extra emphasis via a thin elevation-profile inset diagram below it (cross-section style, showing the gradient climb as a curved line). Behind the circuit, a faint dotted silhouette of pine-covered mountain ridges sketched in dotted 1px stroke as a minimal backdrop motif. No text.
**Negative:** "SPA" text, real Belgium outline, Ardennes labels, gantry signs.
**Aspect:** 16:9 · **Resolution:** 2400x1350, transparent · **Grade:** monoline white on alpha.
**Usage:** `/packages/ui/src/icons/circuits/spa.svg`.

---

### 09. Suzuka — figure-eight with bridge
**Prompt:**
Line art of a figure-eight crossover circuit shape, 2px monoline stroke, transparent background. The bridge crossover at the figure-eight intersection drawn explicitly: the upper track passes over the lower track, indicated by a tiny bridge break in the lower line and two small architectural support marks (dots) flanking the crossover. Composition rotated so the figure-eight reads as horizontal infinity-like flow. No mountains, no Ferris wheel, no text.
**Negative:** "SUZUKA" text, Honda mark, real Japan map.
**Aspect:** 16:9 · **Resolution:** 2400x1350, transparent · **Grade:** monoline white on alpha.
**Usage:** `/packages/ui/src/icons/circuits/suzuka.svg`.

---

### 10. Monza — long straights, Parabolica, Lesmos
**Prompt:**
Line art of a temple-of-speed style circuit shape with two extreme long straights forming a rough triangle, terminated by a sweeping constant-radius final corner in the lower right. Two consecutive right-hand fast corners on the upper left rendered with a faint dotted radius overlay to show their geometric perfection. 2px monoline stroke, transparent background. A pair of very faint parallel dotted lines (1px) inside the main straight suggest the historic banked oval that once intersected the layout, as a ghost motif.
**Negative:** "MONZA" text, Italian flag colors, royal park trees, podium.
**Aspect:** 16:9 · **Resolution:** 2400x1350, transparent · **Grade:** monoline white on alpha.
**Usage:** `/packages/ui/src/icons/circuits/monza.svg`.

---

## C. Driver portrait empty-states (3)

For Wikidata image fallback in `/drivers/[slug]/page.tsx` DriverHero component.

### 11. Anonymous helmet with lightning chevron
**Prompt:**
Studio portrait composition of a single unbranded full-face racing helmet floating in pure void, three-quarter angle, no driver wearing it, no chinstrap visible, just the helmet shell. Helmet shell in matte deep graphite, with a single stylized lightning-bolt chevron motif painted across the visor band in a vertical gradient from telemetry red (#E10600) at top to deep oxblood at bottom. Visor tinted near-black, slight reflection of a single rim light. Shot with profoto B10 key light from upper left at 45 degrees, no fill, allowing the right side of the helmet to fall into deep shadow. Background: seamless #141313 void, slight radial vignette. Composition centered, helmet occupying middle 60 percent of frame, generous negative space above and below.
**Negative:** real driver helmet livery, gold visor, sponsor strip, nationality flag, name on visor strip.
**Aspect:** 1:1 · **Resolution:** 2048x2048 · **Grade:** matte graphite + telemetry red on #141313.
**Usage:** `/apps/web/app/drivers/[slug]/page.tsx` driver-image fallback / `<Avatar>` placeholder.

---

### 12. Side-profile cockpit silhouette, top-down light
**Prompt:**
Side profile silhouette of a generic open-wheel race car cockpit, driver inside but rendered as a pure black silhouette with only the helmet curvature and the halo bar suggesting form. Top-down theatrical raking light source from directly above creates a hard-edged horizontal light slice across the helmet crown and shoulder line, leaving everything below in deep shadow. The halo cockpit safety bar reads as an architectural arc. Background pure #141313 with a single soft red rim light separating the silhouette from the void. No livery, no number, no decals. Style references: Joey Lawrence portraiture, Caravaggio chiaroscuro applied to motorsport.
**Negative:** visible face, helmet brand mark, real team cockpit, steering wheel readable.
**Aspect:** 1:1 · **Resolution:** 2048x2048 · **Grade:** chiaroscuro, single red rim accent.
**Usage:** `/apps/web/app/drivers/[slug]/page.tsx` alternate fallback.

---

### 13. Race overalls with abstract telemetry symbols
**Prompt:**
Flat-lay overhead studio photograph of a pair of fireproof race overalls laid out neatly on a dark surface, no driver inside. Overalls in matte charcoal Nomex texture, no sponsor patches, no team badging, no driver name strip. Where real sponsor patches would sit, instead there are abstract printed symbols suggesting telemetry: a thin throttle-trace waveform, a brake-pressure spike, a small dotted lap-delta pattern, a single G-force vector arrow, all in telemetry red (#E10600) silkscreen ink, looking like Helvetica-grade graphic design. Composition is symmetric flat-lay, top-down, soft window light from upper left, shallow shadow. Background surface is a dark concrete with a single horizontal seam.
**Negative:** Alpinestars, Sparco, OMP visible labels, real driver name, real team patch.
**Aspect:** 1:1 · **Resolution:** 2048x2048 · **Grade:** charcoal + telemetry red ink, concrete substrate.
**Usage:** `/apps/web/app/drivers/[slug]/page.tsx` tertiary fallback / `/about` page texture.

---

## D. Team identity textures (5)

For glass overlay treatments and material studies across `/teams/[slug]`.

### 14. Carbon fiber weave macro
**Prompt:**
Hyper-detailed macro photograph of a flat plate of unidirectional carbon fiber weave, twill 2x2 pattern, photographed under heavy raking light from the right at a 15 degree grazing angle to maximize the visibility of the woven fiber threads. Surface has a deep glossy clearcoat catching one specular highlight band across the upper third. Color is true near-black with faint blue-purple iridescence in the highlight band. No edges, no rivets, no part curvature, just an infinite tileable flat weave field. Shot on Sony A1 with 90mm macro G Master, focus stacked across 12 exposures.
**Negative:** color, scratches, dust, manufacturer mark, prepreg backing.
**Aspect:** 16:9 · **Resolution:** 2560x1440, tileable · **Grade:** monochromatic graphite with one specular band.
**Usage:** `/apps/web/app/teams/[slug]/page.tsx` glassmorphism overlay, applied as 8 percent opacity over surface-container.

---

### 15. Tyre rubber compound layered
**Prompt:**
Cross-section style macro of three layered slabs of racing tyre rubber stacked in profile, each compound a slightly different texture and tonality: top compound finest grain almost glassy (soft), middle compound medium graining (medium), bottom compound coarse with visible blocks (hard). All three compounds are pure rubber black, no colored sidewall band, no manufacturer name. Hard side-light from the right reveals the subtle differences in surface texture between the three. Composition horizontal, the three slabs filling the frame edge to edge, no scale reference, no background. Mood: forensic material study.
**Negative:** Pirelli text, colored stripe, sidewall, tread pattern, mounted.
**Aspect:** 16:9 · **Resolution:** 2560x1440, tileable horizontally · **Grade:** triadic monochrome rubber blacks.
**Usage:** `/apps/web/app/teams/[slug]/page.tsx` material divider / `/results` strategy section.

---

### 16. Asphalt macro with red corner stripe
**Prompt:**
Ultra-macro photograph of weathered track asphalt taken from directly above at extremely shallow depth of field. Surface shows individual aggregate stones, bitumen sheen, micro tyre rubber laid into the surface, and a few suspended dust particles. Across the lower third runs a single freshly painted telemetry red (#E10600) curb stripe, slightly chipped at one edge to show the layered paint history beneath (a sliver of orange and white peeking through). Lighting is hard overhead midday sun, but graded down to feel like dusk: lifted shadows, warm-cool split. No tyre marks visible.
**Negative:** entire curb visible, runoff, advertising, tyre marks as cliche skid, painted text.
**Aspect:** 16:9 · **Resolution:** 2560x1440, tileable along horizontal · **Grade:** charcoal asphalt + single red anchor stripe.
**Usage:** `/apps/web/app/teams/[slug]/history/page.tsx` section background.

---

### 17. Brake disc glowing red
**Prompt:**
Cinematic close-up of a single carbon ceramic brake disc glowing cherry red from extreme heat, photographed from a low three-quarter angle at trackside dusk. Surrounding wheel, caliper, suspension all rendered as silhouette or barely visible in deep ambient shadow, no brand markings on caliper, no wheel rim design. The brake disc itself is the only light source in the frame, casting a soft red gradient onto the ground and a faint heat haze rising into the air above it. Particles of carbon dust suspended in the air catch the red glow. Background: pure black runoff area with a faint orange horizon line at the very top. Shot on Arri Mini LF with 50mm lens, 1/1000 second to freeze the heat shimmer.
**Negative:** Brembo logo, AP Racing text, full car body, daylight, motion blur.
**Aspect:** 16:9 · **Resolution:** 2560x1440 · **Grade:** black void + cherry red glow only.
**Usage:** `/apps/web/app/teams/[slug]/page.tsx` performance card hero.

---

### 18. Engine bay close-up
**Prompt:**
Macro detail shot inside the rear engine bay of a generic open-wheel race car, no logos, no sponsor decals, no part numbers, no part-specific real engine geometry. Shows a tangle of titanium exhaust manifold tubing in heat-blued finish, carbon fiber ducting, two small unmarked bracket fittings, and a sliver of one cylinder head casting. Single hard work-light from upper left casts dramatic shadows. Color: warm titanium blue-gold against deep carbon black, with one tiny red wire or zip-tie as the brand accent. Shot on Fuji GFX 100S with 80mm macro, f/4 for selective focus on the manifold curvature.
**Negative:** Mercedes / Ferrari / Honda / Renault engine markings, fuel rail brand text, ECU label.
**Aspect:** 16:9 · **Resolution:** 2560x1440 · **Grade:** warm titanium + single red accent on deep blacks.
**Usage:** `/apps/web/app/teams/[slug]/page.tsx` engineering section background.

---

## E. Editorial section dividers (4)

For `<SectionDivider />` and full-bleed transitions between `/` homepage sections.

### 19. Linear motion blur, top-to-bottom red gradient
**Prompt:**
Abstract vertical motion-blur composition, no recognizable subject, just pure horizontal smear lines running edge to edge of the frame. Top of the frame is deep telemetry red (#E10600) gradually smearing down into pure carbon black (#0F0F0F) at the bottom, with the transition happening across the middle 40 percent of the frame. Smear lines have varying intensity, some sharp like blade edges, others fully dissolved into gradient. Subtle 35mm film grain over the entire image. No subject, no car, no track. Pure energy gesture.
**Negative:** identifiable shape, car silhouette, road, sky, lens flare.
**Aspect:** 21:9 · **Resolution:** 3840x1646 · **Grade:** vertical gradient telemetry red into carbon black.
**Usage:** `/apps/web/components/SectionDivider.tsx` default background pattern, used between homepage sections.

---

### 20. Track sector dotted line repeating pattern
**Prompt:**
Tileable geometric pattern of three parallel horizontal dotted lines in white (#e5e2e1) at 8 percent opacity on a pure #141313 background, with one of the three lines colored telemetry red (#E10600) at full opacity. Dot diameter 4px, gap between dots 12px, gap between lines 28px. Pattern is mathematically perfect, infinitely tileable on both axes. No texture, no grain, pure vector aesthetic. Style references: Massimo Vignelli NYC subway map, Otl Aicher Munich 72 pictogram system.
**Negative:** photograph, depth, shadow, anti-aliasing artifacts.
**Aspect:** 16:9 tileable · **Resolution:** 2560x1440 (or 256x256 tile) · **Grade:** flat vector pattern.
**Usage:** `/apps/web/components/SectionDivider.tsx` Vignelli-style variant / `/results` table background.

---

### 21. Telemetry data spike chart
**Prompt:**
Abstract data visualization composition: a single horizontal line graph traversing the frame from left to right, representing throttle pedal input over one full lap. Sharp vertical spikes at deceleration points (braking zones), flat plateaus at full throttle (straights), and curved transitions through corners. Line is telemetry red (#E10600) at 1.5px stroke on a pure #141313 background. Below the main line, a faint secondary line at 30 percent opacity in cyan (#7dd3fc) suggesting brake pressure as a counterpoint signal. Very faint vertical gridlines every 100px in 5 percent opacity outline gray (#444748). No axis labels, no numbers, no legend, no values, pure waveform aesthetic. Style references: Edward Tufte, Information is Beautiful, F1 onboard telemetry overlay reimagined as gallery print.
**Negative:** axis text, units, gauge, car icon, percentage marks.
**Aspect:** 21:9 · **Resolution:** 3840x1646 · **Grade:** pure red waveform + cyan counterpoint on carbon black.
**Usage:** `/apps/web/app/page.tsx` between Latest News and Predict sections / `/predict` page hero.

---

### 22. Diagonal speed lines, vapor
**Prompt:**
Extremely subtle field of diagonal speed lines running from upper-left to lower-right at a 22 degree angle, almost imperceptible, like motion-blurred mist or vapor caught in raking light. Lines at 5 to 12 percent opacity in warm off-white (#e5e2e1), varying length and stroke weight from hairline to 2px, distributed with controlled randomness across the frame. Background pure #141313 with a faint radial darkening at the corners. The overall impression should be that of looking through a windshield at speed in fog. No subject, no horizon.
**Negative:** sharp graphic lines, rainbow speed lines, anime motion, comic ink.
**Aspect:** 21:9 · **Resolution:** 3840x1646 · **Grade:** near-black field with faint warm vapor.
**Usage:** `/apps/web/components/SectionDivider.tsx` softest variant, used between editorial blocks.

---

## F. Newsletter / membership / about heroes (3)

### 23. Pit board with race-week data
**Prompt:**
Cinematic close-up of an analog pit board (the kind crews hold over the wall to signal drivers) mounted vertically against a dark garage wall, photographed slightly from below at three-quarter angle. The board face is matte black with a grid of slots, and the slots contain illegible abstract data: rectangles of color-coded position markers, a faint glow of an LED segment displaying numbers that are deliberately blurred or obscured, plus a single sharp telemetry red (#E10600) tab clipped onto the top of the board. Behind the board, deep garage shadow with one warm tungsten work-light flaring softly out of focus in the upper corner. No text legible. No team markings on the board frame.
**Negative:** specific lap time visible, team name, real driver number, sponsor patch on board.
**Aspect:** 21:9 · **Resolution:** 3840x1646 · **Grade:** warm tungsten + cool shadow, single red tab anchor.
**Usage:** `/apps/web/app/newsletter/page.tsx` hero.

---

### 24. Empty grandstand at dawn
**Prompt:**
Wide cinematic shot of an empty grandstand at first light, rows and rows of vacant seats receding into atmospheric perspective. Seats are matte deep navy / charcoal, no team colors. A single distant banner hanging from the uppermost row glows telemetry red (#E10600), the only chroma in the frame. Sky behind the grandstand is a soft cool-to-warm gradient: deep blue at top dissolving into pale amber at the horizon line just behind the seat backs. A thin layer of ground fog drifts across the floor of the grandstand. Composition follows a low-vanishing-point one-point perspective. No people, no scoreboard, no marshal posts, no signage.
**Negative:** crowd, sun visible, branded banner, jumbotron, ticket booth.
**Aspect:** 21:9 · **Resolution:** 3840x1646 · **Grade:** cool dawn into amber horizon, single red banner anchor.
**Usage:** `/apps/web/app/about/page.tsx` hero / `/membership` page hero.

---

### 25. Race-control monitor wall
**Prompt:**
Wide horizontal view of an abstract race control room monitor wall: nine large screens arranged in a 3x3 grid, each displaying generic telemetry visualization (waveforms, sector grids, abstract dotted-line position diagrams, throttle traces) all rendered in white and telemetry red (#E10600) on near-black UI. Two operator silhouettes in the lower foreground out of focus, faces obscured, just suggesting human presence. Room is dimly lit by the monitor glow only, walls dissolving into shadow. No FIA logo, no real circuit names on any screen, no clock readable, no team radio panels. Shot wide on Sony Venice 24mm.
**Negative:** real race director, real FIA logos, recognizable circuit map on screens, time codes legible.
**Aspect:** 21:9 · **Resolution:** 3840x1646 · **Grade:** monitor glow on deep ambient blacks.
**Usage:** `/apps/web/app/live/race-control/page.tsx` hero / `/about` editorial.

---

## G. Error pages (2)

### 26. Burnt-out car silhouette — 404
**Purpose:** `/not-found.tsx` hero.
**Prompt:**
Wide cinematic dusk shot of an abandoned generic open-wheel race car silhouette parked off-track on the gravel runoff, no movement, smoke wisping faintly from where the engine cover would be. Car rendered as a pure silhouette with no livery, just shape, almost like an Yves Tanguy surrealist object in negative space. Sky is a deep violet-to-charcoal gradient, sun already set, last band of warm light hugging the horizon. A single tail-light glows dimly telemetry red (#E10600) as the only chroma. Distant grandstand barely visible as a black geometric mass on the left edge. Wide compositional negative space at the top three quarters of the frame for headline overlay. Mood: out of session, sessions ends, the race is over.
**Negative:** crash, fire, smoke plume billowing, marshal, recovery truck visible.
**Aspect:** 21:9 · **Resolution:** 3840x1646 · **Grade:** violet dusk with single red anchor.
**Usage:** `/apps/web/app/not-found.tsx` background image.

---

### 27. Yellow caution flag macro — error
**Purpose:** `/error.tsx` hero.
**Prompt:**
Ultra-macro photograph of a section of yellow textile flag captured mid-snap in heavy wind, fabric folds dramatic with hard shadow lines and one bright sun-catch highlight across the upper fold. Fabric texture is woven canvas, visible weave grain, slightly worn edges suggesting heavy use. Yellow is muted to a saturated mustard ochre, not bright safety yellow, graded down to feel cinematic rather than literal. Background dissolves into pure #141313 negative space. One single thread is loose and waving. No flag pole visible, no marshal hand, no race context.
**Negative:** bright primary yellow, marshal hand, double flag, checkered flag, podium spray.
**Aspect:** 21:9 · **Resolution:** 3840x1646 · **Grade:** muted ochre on carbon black, cinematic.
**Usage:** `/apps/web/app/error.tsx` background.

---

## H. App icon options (3)

All icons square, 1024x1024, for `/apps/web/app/apple-icon.png` / `icon.png` / `favicon.ico` source.

### 28. Stylized "A" as racing line apex
**Prompt:**
Minimalist geometric logo design on a pure #0F0F0F square canvas. The letter "A" is constructed from a single continuous racing-line stroke that enters from the lower left, sweeps up and across the apex of a corner, and exits to the lower right, with the horizontal crossbar of the "A" implied by the curvature of the racing line itself at the geometric apex. The line is rendered in telemetry red (#E10600) with a slight gradient toward deep oxblood at the entry and exit points. Stroke width is consistent 48px at 1024x1024 canvas. Surrounding the letter, generous negative space (20 percent padding minimum). No serif, no second color, no shadow, no glow. Style references: Linear app logo, Vercel triangle, Stripe's wordmark precision.
**Negative:** drop shadow, gradient sky, 3D depth, second letter, text below.
**Aspect:** 1:1 · **Resolution:** 1024x1024 · **Grade:** single red stroke on near-black.
**Usage:** `/apps/web/app/icon.png` candidate A.

---

### 29. Two parallel lines converging at apex
**Prompt:**
Minimalist abstract mark on a pure #0F0F0F square canvas. Two perfectly straight parallel lines enter from the bottom edge of the canvas, run upward, then bend at a controlled radius to converge at a single point near the top center of the canvas. The convergence point is sharp, geometric, not soft. Lines are 32px stroke width at 1024x1024 canvas. Left line is warm off-white (#e5e2e1) and right line is telemetry red (#E10600), creating chromatic contrast at the apex point where they meet. Generous padding around the mark, no text, no second element. Style references: Linear logo, Brave logo geometric precision, the spirit of Saul Bass.
**Negative:** arrow head, gradient, three lines, curve too soft.
**Aspect:** 1:1 · **Resolution:** 1024x1024 · **Grade:** dual chroma converging on near-black.
**Usage:** `/apps/web/app/icon.png` candidate B.

---

### 30. Circuit "A" — overhead aerial racetrack as letter
**Prompt:**
Minimalist top-down overhead view of an invented racetrack whose overall shape forms a stylized letter "A". The two outer rails of the track curve upward and inward to form the diagonals of the "A", the crossbar formed by a short connecting section near the upper third. Track surface rendered as a flat ribbon in warm off-white (#e5e2e1), with one single telemetry red (#E10600) corner segment at the apex curve of the "A" to indicate a hot zone or DRS zone. Background pure #0F0F0F void, no grass, no gravel, no labels, no buildings, no scale, no compass. Composition centered with 18 percent padding. Style references: an architectural plan drawing reduced to its absolute geometric essence, cartographic minimalism.
**Negative:** crowd, buildings, runoff, gravel, text, scale bar, compass.
**Aspect:** 1:1 · **Resolution:** 1024x1024 · **Grade:** off-white ribbon + single red accent on near-black.
**Usage:** `/apps/web/app/icon.png` candidate C / `/apps/web/app/apple-icon.png`.

---

## Implementation notes

- Store outputs in `/apps/web/public/images/cinematic/` grouped by section letter (`a-heroes/`, `b-circuits/`, etc).
- All hero images should ship in both WebP (primary) and AVIF (premium fallback). Use `next/image` with `priority` only for above-the-fold hero (01, 02, 03).
- Circuit silhouettes (06-10) must be vector-traced to SVG and recolored at runtime via `currentColor` so they inherit theme tokens.
- Editorial dividers (19-22) should be exportable as both full-bleed images and tileable patterns.
- App icons (28-30) require human review before shipping to `icon.png` — pick one canonical mark, retire the other two to brand asset library.
- All prompts engineered to read in DALL-E 3 (use full paragraph), Midjourney v6 (append `--ar 21:9 --style raw --v 6 --s 250`), and FLUX (use as-is, dial guidance 3.5 to 4.5).
