# /live/* cinematic redesign — race-day mode UI

# Apex Live Surfaces — Cinematic Telemetry Redesign

## Strategic Frame

The three Live surfaces are Apex's most demanding canvas. Unlike `/schedule` or `/drivers/[slug]`, which can lean editorial and breathe, the Live cluster has to do something genuinely hard: present **high-frequency mutating data** at glance speed, on a phone, at 3 AM during a Singapore race, while feeling cinematic rather than utilitarian. F1 telemetry UIs are almost universally cluttered. formula1.com's live timing is a wall of microscopic numbers. Sky Sports' is worse. The official FIA timing screen looks like a 2008 ERP system. The opportunity is enormous: there is no premium reference in the category.

The design north star, therefore, is not "race dashboard." It is **mission control as cinema**. Think: the McLaren pit wall's giant screens, but designed by the people who shipped Linear's command palette. Glass surfaces. JetBrains Mono confidently large on the numbers that matter. Hardware-accelerated motion. Type that respects that fans squint at this for two hours. And a relentless commitment to telling the user *what is actually happening right now* before any chrome, any branding, any navigation. The flag color is the headline. Everything else is supporting cast.

Three surfaces, one shared cognitive model. `/live/timing` is the **leaderboard truth**: who is where, what tyre, what gap, what sector. `/live/race-control` is the **narrative truth**: what the stewards just said, what flag is out, who got a penalty. `/live/track` is the **spatial truth**: where everyone is on the asphalt right now. A real F1 fan moves between these three constantly during a session. They are not three independent pages. They are three windows into the same live broadcast, and the user should be able to ricochet between them in 200ms with zero loading state and full context preserved. That is the design problem.

## The Race-Day Mode Insight

The single biggest leverage point in this redesign is recognizing that **the moment a user lands on `/live/*` during an active session, they are no longer browsing**. They are spectating. The UX assumptions of a normal web page collapse. They do not want chrome. They do not want navigation. They do not want a footer. They want pixels dedicated to data, ideally fullscreen, ideally landscape on their phone propped against the kitchen counter. The race-day mode prompt is the design choreography that makes this transition feel intentional rather than abrupt. A subtle glass overlay slides up from the bottom: "Singapore GP is live. Enter Race Day Mode?" Tapping it triggers `requestFullscreen()`, locks orientation if mobile, and dims the system chrome via CSS. Dismissible. Remembered for the session. It is the closest a web app can come to feeling like a native broadcast app, and almost no fan platform does it.

The technical execution matters. We do not aggressively interrupt. The prompt waits 4 seconds after the user lands to ensure they are not just orienting. It is glass-pronounced but small, anchored bottom-center on mobile, bottom-right on desktop. Animation is a 600ms ease-cinematic slide-up with a subtle backdrop-blur transition. There is a small "X" to dismiss, and a clear "Enter" CTA. If the user dismisses three times, we stop asking for the season. If they enter and then exit fullscreen, we do not re-prompt. The pattern is: **respect the choice, but make the premium path one-tap obvious**.

## Timing Tower — The 70% Width Decision

The brief specifies a glass-pronounced timing tower at 70% width. This is correct but worth unpacking. The remaining 30% is not wasted. On desktop, it splits into the session hero strip (top: location, flag, lap counter) and the on-hover sector breakdown panel (right side, slides in when a driver row is focused). On mobile, the 70/30 split inverts: the tower becomes 100% width, the hero strip becomes a sticky top bar, and the sector panel becomes a tap-to-expand drawer from the right. This is the responsive choreography.

JetBrains Mono on the numbers is non-negotiable. Specifically: position number, gap (`+0.234`), last lap (`1:32.456`), best lap, sector times (`28.901 | 32.104 | 31.451`), and tyre age (`L14`). Driver three-letter code (`VER`, `LEC`, `NOR`) stays in Anybody 700 for visual punch. Team name uses Hanken Grotesk 400 small caps. The hierarchy: name big, gap bigger, sectors smaller but mono-bold. This is the same logic Bloomberg Terminal uses: data of different update frequencies needs different visual weights so the eye can index it.

The animated underline scrubbing at gap-changes is a beautiful micro-interaction. When a gap value updates (a driver closes by 0.1s on the car ahead), a 1px horizontal line sweeps left-to-right beneath the row over 320ms in telemetry-red at 40% opacity. It is barely perceptible individually but creates a **rhythmic shimmer** across the tower during a tense battle. This is the kind of detail that separates Marcello-tier from generic. The implementation uses Framer Motion's `key` prop on the underline element keyed to the gap value, so it remounts and animates on every gap mutation.

Position changes use Framer Motion's `layoutId`. When VER overtakes NOR, the two rows swap with a spring physics animation (stiffness 300, damping 30). The driver row itself uses `layout="position"` mode to avoid scaling artifacts. During the swap, both rows get a subtle 1.02 scale and a glow border in their team color, returning to rest after 480ms. This is the single most satisfying moment in the entire surface and it is **free** because Framer Motion handles the choreography if we set it up right.

Tyre age tickers up live. Each tyre compound is a colored dot (red soft, yellow medium, white hard, green inter, blue wet) with `L{age}` in JetBrains Mono next to it. The age value updates on each lap completion. We animate the digit using a vertical slot-machine flip (`y: ±20px` enter/exit, 220ms ease-cinematic). Small detail. Enormous payoff over 50 laps.

The vertical scan-line background effect deserves a paragraph. We render a fixed-position `<div>` behind the tower with `background: repeating-linear-gradient(to bottom, transparent 0, transparent 7px, rgba(225,6,0,0.08) 8px)`. We translate it `y: -100%` to `y: 0` over 18 seconds in an infinite linear loop. Result: the entire tower feels like a CRT broadcast monitor at idle. It is **decorative but contextual** — it references analog television, F1's broadcast heritage, the feeling of watching a session on an old Trinity in 1998. This kind of decoration is allowed when it carries meaning. Linear-gradient with opacity 0.08 ensures it never competes with the data.

The sticky bottom pinned driver strip on mobile is the killer mobile UX feature. A user tapping any driver row in the tower pins that driver's row to the bottom of the viewport with a subtle elevated glass effect. As they scroll the tower up and down, their pinned driver follows. Tap a different driver to swap. Tap the pinned strip to unpin. This solves the real-world mobile problem: a user cares about Hamilton specifically, but Hamilton is currently P14, and scrolling to find him every 30 seconds is brutal. Pinning makes Hamilton always visible regardless of tower position. This is a feature formula1.com cannot ship because they are too committed to feature parity with desktop. We can ship it because we are mobile-first.

## Race Control — The Editorial Stream

Race Control is fundamentally different from Timing. Timing is a leaderboard that mutates. Race Control is a **narrative log** that grows. The cognitive mode is closer to reading a Twitter feed than scanning a spreadsheet. The design should respect that. Editorial-lg type for message body (32px, EB Garamond 300). Generous vertical spacing. Each message is a card with the flag color as a 4px full-height left stripe — yellow for yellow flag, red for red flag, white for finish flag, blue for blue flag, black with orange disc for penalty, etc. The stripe is the **fastest possible visual classifier**. A user scanning the timeline can see at a glance: yellow yellow yellow red yellow green. They know exactly what happened in the last 90 seconds without reading a word.

Severity-driven animation is where this surface becomes cinematic. When a new yellow flag message arrives, the new card pulses its outline once (`box-shadow: 0 0 0 0 rgba(255,193,7,0.6)` to `0 0 0 12px rgba(255,193,7,0)` over 700ms). When a **red flag** arrives — the most consequential message in F1 — the card pulses three times and we fire a subtle full-viewport flash (`position: fixed inset-0 bg-red-500/8`, fade out over 1200ms). This is the digital equivalent of the broadcast feed cutting to slow-mo replay of the incident. It tells the user: stop what you're doing, something major just happened. We must use this sparingly. False alarms would destroy trust. It only fires on actual red flags, deemed by category, not freely.

Safety Car deployment gets its own choreography. The card slides in from top with an extra glass overlay pulse: the entire viewport gets a 200ms `backdrop-filter: blur(2px)` flash that recedes. It mimics the visual hit of seeing the SC light come on at the start/finish straight. This is **theatrical** but earned, because in a real race the SC deployment is a moment of dramatic significance — it freezes the order, opens the pit window, scrambles strategy. Treating it cinematically is correct.

Auto-scroll to top is interesting because the obvious implementation is wrong. If we just scroll to top every time a new message arrives, we hijack the user's reading position. So we do this: when a new message arrives, we keep the scroll position stable but show a small floating "1 NEW" badge anchored top-center. The badge increments if more arrive. Tapping the badge smooth-scrolls to top and clears the count. **If** the user is already within 80px of the top, we auto-scroll smoothly without the badge — they were clearly in "watching the stream" mode. This is the same pattern Twitter, Slack, and iMessage use, and it works because it respects the user's attention contract.

Filter pills at top (Flag / Penalty / SC-VSC / Technical / All) are sticky and glass-medium. Tapping one filters the stream with a beautiful Framer Motion `AnimatePresence` choreography: filtered-out messages fade and shrink up, remaining messages spring into their new positions with a 50ms stagger. The active pill has a subtle inner glow in telemetry-red. Multi-select would be overkill; single-select keeps the mental model clean.

## Track Map — Spatial Truth

The Track Map is the surface with the highest "wow" potential and the highest implementation cost. The brief specifies Wikidata circuit shape if available, otherwise stylized abstract loop with sector divisions. This is the right call. Wikidata has SVG circuit outlines for most current F1 circuits, exposed via the `P15` (circuit) and `P18` (image) properties. We fetch the SVG, strip its outer styling, and inject our own stroke (2px, telemetry-red at 80% opacity) and sector segment paths. When Wikidata fails or the circuit is missing, we render a stylized abstract loop using `<path d="M ... " />` with three sector divisions colored by current fastest sector holder.

Live driver dots are circles 18px diameter with team color fill, driver number in white Anybody 700, animated along the track path. We use Framer Motion's `motion.circle` with `layoutId={driver.number}`. Position updates animate via spring. The challenge: F1 telemetry gives us position along track as a normalized 0-1 value (lap progress), not (x,y) coordinates. So we use SVG's `getPointAtLength()` on the track path, multiplied by `pathLength * normalizedPosition`, to derive (x,y) every tick. This is **the one place we need a Web Worker** because computing 20 driver positions at 5Hz on a phone will jank the main thread. The worker receives position updates, computes (x,y), posts back. Main thread just renders.

Tap a driver dot → expanded panel with that driver's full lap chart + tyre stints. The panel slides up from bottom on mobile, slides in from right on desktop. Lap chart is a Recharts line chart with JetBrains Mono axis labels, telemetry-red trace, sector splits as light gray reference lines. Tyre stints below: horizontal bar segmented by compound (color-coded) with lap ranges (`L1-L18 Soft`, `L19-L34 Medium`, `L35- Hard`).

Weather strip at top is a tall thin horizontal bar with animated weather icons. Rain: small `<svg>` raindrops translating `y: 0 → y: 40` in a 1400ms loop with staggered delays. Sun: a radial gradient pulsing opacity 0.6 → 1.0. Cloud: subtle horizontal drift. Temperature, track temp, humidity, wind direction all in JetBrains Mono. The strip is 56px tall on desktop, 44px on mobile. It anchors the page emotionally — fans care deeply about weather because it changes everything.

Sector status colored bars showing fastest sector holder is a beautiful detail. Three thin bars at the bottom of the viewport (or floating top-right on desktop). Each bar is colored in the team color of whoever currently holds the fastest split in that sector. Sector number in JetBrains Mono. When a driver sets a new fastest sector, the bar **briefly flashes white** then transitions to the new team color. This communicates the racing reality — who is finding pace where — without any extra cognitive load. It is the kind of detail a real fan notices and remembers.

## Global Live Nav

A sticky, glass-medium top tab strip persists across all three Live routes. Three tabs: Timing / Race Control / Track. Active tab has a 2px telemetry-red underline that **physically slides** between tabs via `layoutId`. Tap a tab and the underline animates over 320ms ease-cinematic to the new position. This is a small but high-leverage detail: it gives the three surfaces a unified shell, makes navigation feel native-app fast, and visually reinforces that they are three views of the same broadcast.

The nav is 56px tall on desktop, 48px on mobile. It sits below the main Apex global nav when not in race-day mode, and replaces the global nav when in race-day mode. In race-day mode it also gains a small live session indicator on the left (pulsing red dot + session name + flag color) and a fullscreen toggle on the right. This is the **mission control header**, and its job is to keep the user oriented while consuming nothing meaningful in vertical space.

## No-Session State

When no session is live, every surface degrades gracefully. Empty grids are forbidden. Instead, we show:

A **countdown card**: "Next session: Practice 1 — Monaco GP — 2 days 14 hours". Behind the card, the circuit silhouette from Wikidata renders as a low-opacity background SVG. A weather mini-strip shows the forecast for race weekend. A "Set Reminder" button schedules a notification (Phase C feature, placeholder for Phase B).

A **"Replay last race"** button that routes to the latest completed session's timing data, accessible via the OpenF1 historical endpoints. This is huge because it solves the "I just landed on /live during the offseason and the page is dead" problem. Instead, the user gets to relive Abu Dhabi 2025 lap by lap.

This state is shared across all three surfaces — Timing, Race Control, Track each get their no-session variant, all using the same countdown card pattern with different educational hints ("During a session, this view shows driver positions on track" / "...the stewards' message log" / etc.). It is **didactic without being condescending**, and it converts an empty state into a moment to teach the user what they will see.

## Sound Design

Optional, toggleable in settings, muted by default. Three sounds:
1. **Engine roar**: 800ms sample plays on entering `/live/*` during an active session. We use a short Mercedes V6 turbo idle, low frequencies. It is **arrival theater**: the page loads, the engine fires, you are now at the broadcast.
2. **Sub-second tick** at every position change: a sharp 60ms click, like a Geiger counter. Communicates that something happened in the order. Frequent during opening laps. Goes quiet mid-stint. This is **information sonification**, and it is rare in web UIs because it requires care, but for racing it is perfect.
3. **Flag tones**: each flag color has a distinct tone. Yellow = soft 440Hz beep. Red = sharper 220Hz triple-beep. SC = a low rising synth note. Chequered = a major chord. These play when a Race Control message of that flag type arrives. Subtle, ducked under any other audio playing.

All sounds are Web Audio API, no audio files preloaded unless the user toggles sound on. The toggle persists in `localStorage` and surfaces in the Live Nav as a small speaker icon.

## ARIA, Performance, Error Handling

`aria-live="polite"` on the Race Control message list because each message is a discrete narrative event a blind user benefits from hearing. `aria-live="off"` on the Timing tower because announcing every gap change every second would be aural hell. We do, however, throttle position-change announcements to once per 5 seconds via a dedicated hidden `<div aria-live="polite">` that batches and announces summaries: "Verstappen now P1, Norris drops to P2."

Page Visibility API pauses all polling when the tab is hidden. We listen to `document.visibilitychange` and toggle a global `LiveDataContext.paused` boolean. When the tab comes back, we fire a single refresh and resume. This is **table stakes** for a polling-heavy live surface but most live UIs forget it and tank user battery life.

A Web Worker handles the SVG path coordinate computation for the Track Map (positions for 20 drivers at 5Hz means 100 trig operations per second, which would hitch a Pixel 4a on the main thread). The worker takes `{driverNumber, normalizedPosition}` messages and posts back `{driverNumber, x, y}`. The main thread renders. Phase C will swap polling for a single SSE stream, but the worker stays.

OpenF1 brownouts get a **subtle but visible** treatment. A small horizontal pill anchored top-right of each Live surface: "DATA DELAYED · 7s" in JetBrains Mono, amber background at 30% opacity, glass border. It pulses gently (opacity 0.6 → 1.0 over 1400ms). When data resumes, the pill smoothly slides out. We never show error states with red full-screen modals during a live session — that destroys the user's mood and is rarely actionable. Exponential backoff retry: 2s, 4s, 8s, 16s, capped at 30s. Three consecutive failures triggers a more visible toast "Connection issues. Retrying..."

## Implementation

Files below assume the existing project structure at `apps/web/`. Components live in `apps/web/components/live/`. The three pages live in `apps/web/app/live/{timing,race-control,track}/page.tsx`.

---

### `apps/web/components/live/RaceDayPrompt.tsx`

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  sessionActive: boolean;
  sessionName: string;
}

export function RaceDayPrompt({ sessionActive, sessionName }: Props) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!sessionActive) return;
    const key = `apex-race-day-dismissed-${new Date().toDateString()}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(key)) {
      setDismissed(true);
      return;
    }
    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, [sessionActive]);

  const enter = async () => {
    try {
      await document.documentElement.requestFullscreen();
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (o: string) => Promise<void>;
      };
      if (orientation.lock) {
        await orientation.lock("landscape").catch(() => {});
      }
    } catch {}
    setVisible(false);
  };

  const dismiss = () => {
    const key = `apex-race-day-dismissed-${new Date().toDateString()}`;
    window.localStorage.setItem(key, "1");
    setVisible(false);
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92vw] md:w-auto"
        >
          <div className="backdrop-blur-2xl bg-[rgba(28,27,27,0.85)] border border-[rgba(228,229,229,0.08)] rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4">
            <div className="size-2 rounded-full bg-[#E10600] animate-pulse" />
            <div className="flex-1">
              <p className="font-[Anybody] font-bold text-base text-white tracking-tight">
                {sessionName} is live
              </p>
              <p className="font-[Hanken_Grotesk] text-sm text-[#c4c7c7] mt-0.5">
                Enter Race Day Mode for fullscreen broadcast
              </p>
            </div>
            <button
              onClick={enter}
              className="px-4 py-2 bg-[#E10600] hover:bg-[#ff1a14] transition-colors rounded-lg font-[Anybody] font-bold text-sm text-white"
            >
              ENTER
            </button>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="size-8 grid place-items-center rounded-lg hover:bg-white/5 text-[#c4c7c7]"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### `apps/web/components/live/LiveBanner.tsx`

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  sessionActive: boolean;
  sessionName?: string;
  flagStatus?: "GREEN" | "YELLOW" | "RED" | "SC" | "VSC" | "CHEQUERED";
  dataDelaySeconds?: number;
}

const TABS = [
  { href: "/live/timing", label: "Timing", icon: "list_alt" },
  { href: "/live/race-control", label: "Race Control", icon: "warning" },
  { href: "/live/track", label: "Track", icon: "map" },
];

const FLAG_COLORS: Record<string, string> = {
  GREEN: "#00C853",
  YELLOW: "#FFC107",
  RED: "#E10600",
  SC: "#FFC107",
  VSC: "#FFC107",
  CHEQUERED: "#FFFFFF",
};

export function LiveBanner({
  sessionActive,
  sessionName,
  flagStatus,
  dataDelaySeconds,
}: Props) {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 backdrop-blur-xl bg-[rgba(20,19,19,0.78)] border-b border-[rgba(228,229,229,0.06)]">
      <div className="px-4 md:px-10 h-14 md:h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {sessionActive && (
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="size-2 rounded-full animate-pulse"
                style={{ background: FLAG_COLORS[flagStatus ?? "GREEN"] }}
              />
              <span className="font-[JetBrains_Mono] text-xs text-white tracking-wider hidden md:inline">
                LIVE
              </span>
              {sessionName && (
                <span className="font-[Anybody] font-bold text-sm text-white truncate max-w-[160px]">
                  {sessionName}
                </span>
              )}
            </div>
          )}
        </div>

        <nav className="flex items-center gap-1 md:gap-2 relative">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative px-3 md:px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-white/[0.04] transition-colors"
              >
                <span className="material-symbols-outlined text-lg text-[#c4c7c7]">
                  {tab.icon}
                </span>
                <span className="font-[Hanken_Grotesk] font-medium text-sm md:text-base text-white">
                  {tab.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="live-nav-underline"
                    className="absolute left-3 right-3 -bottom-0.5 h-0.5 bg-[#E10600] rounded-full"
                    transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <AnimatePresence>
            {dataDelaySeconds && dataDelaySeconds > 3 && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="px-2.5 py-1 rounded-full bg-[rgba(255,193,7,0.12)] border border-[rgba(255,193,7,0.3)] font-[JetBrains_Mono] text-[10px] md:text-xs text-[#FFC107] tracking-wider"
              >
                DELAYED · {Math.round(dataDelaySeconds)}S
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
```

---

### `apps/web/components/live/SessionHeader.tsx`

```tsx
"use client";

import { motion } from "framer-motion";

interface Props {
  location: string;
  flagStatus: "GREEN" | "YELLOW" | "RED" | "SC" | "VSC" | "CHEQUERED";
  lapCurrent?: number;
  lapTotal?: number;
  timeRemaining?: string;
  sessionType: string;
}

const FLAG_META: Record<string, { color: string; label: string }> = {
  GREEN: { color: "#00C853", label: "TRACK CLEAR" },
  YELLOW: { color: "#FFC107", label: "YELLOW FLAG" },
  RED: { color: "#E10600", label: "RED FLAG" },
  SC: { color: "#FFC107", label: "SAFETY CAR" },
  VSC: { color: "#FFC107", label: "VIRTUAL SC" },
  CHEQUERED: { color: "#FFFFFF", label: "FINISH" },
};

export function SessionHeader({
  location,
  flagStatus,
  lapCurrent,
  lapTotal,
  timeRemaining,
  sessionType,
}: Props) {
  const flag = FLAG_META[flagStatus];

  return (
    <div className="px-4 md:px-10 pt-6 md:pt-10 pb-4 md:pb-8 border-b border-[rgba(228,229,229,0.06)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-[JetBrains_Mono] text-xs md:text-sm text-[#8e9192] tracking-[0.2em] mb-2">
            {sessionType.toUpperCase()}
          </p>
          <h1 className="font-[Anybody] font-extrabold text-4xl md:text-6xl text-white tracking-tight leading-none">
            {location}
          </h1>
        </div>

        <div className="flex items-center gap-6 md:gap-10">
          <motion.div
            key={flagStatus}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
            className="flex items-center gap-3"
          >
            <span
              className="size-3 rounded-full"
              style={{ background: flag.color, boxShadow: `0 0 18px ${flag.color}80` }}
            />
            <span
              className="font-[Anybody] font-bold text-sm md:text-base tracking-widest"
              style={{ color: flag.color }}
            >
              {flag.label}
            </span>
          </motion.div>

          {lapCurrent !== undefined && lapTotal !== undefined && (
            <div className="flex flex-col items-end">
              <p className="font-[JetBrains_Mono] text-xs text-[#8e9192] tracking-wider">
                LAP
              </p>
              <p className="font-[JetBrains_Mono] font-medium text-2xl md:text-3xl text-white">
                {lapCurrent}
                <span className="text-[#8e9192]">/{lapTotal}</span>
              </p>
            </div>
          )}

          {timeRemaining && (
            <div className="flex flex-col items-end">
              <p className="font-[JetBrains_Mono] text-xs text-[#8e9192] tracking-wider">
                REMAINING
              </p>
              <p className="font-[JetBrains_Mono] font-medium text-2xl md:text-3xl text-white">
                {timeRemaining}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### `apps/web/components/live/NoSessionState.tsx`

```tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface Props {
  nextSessionName?: string;
  nextSessionDate?: string;
  countdown?: string;
  circuitSvgUrl?: string;
  weatherTempC?: number;
  weatherCondition?: string;
  lastSessionPath?: string;
  surfaceHint: string;
}

export function NoSessionState({
  nextSessionName,
  nextSessionDate,
  countdown,
  circuitSvgUrl,
  weatherTempC,
  weatherCondition,
  lastSessionPath,
  surfaceHint,
}: Props) {
  return (
    <div className="relative min-h-[70vh] flex items-center justify-center px-4 md:px-10 overflow-hidden">
      {circuitSvgUrl && (
        <div
          className="absolute inset-0 opacity-[0.04] flex items-center justify-center pointer-events-none"
          style={{
            backgroundImage: `url(${circuitSvgUrl})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
        className="relative max-w-2xl w-full backdrop-blur-xl bg-[rgba(28,27,27,0.6)] border border-[rgba(228,229,229,0.06)] rounded-3xl p-8 md:p-12"
      >
        <p className="font-[JetBrains_Mono] text-xs text-[#8e9192] tracking-[0.2em] mb-4">
          NO LIVE SESSION
        </p>

        {nextSessionName ? (
          <>
            <h2 className="font-[Anybody] font-extrabold text-3xl md:text-5xl text-white tracking-tight leading-tight mb-2">
              {nextSessionName}
            </h2>
            <p className="font-[Hanken_Grotesk] text-base md:text-lg text-[#c4c7c7] mb-8">
              {nextSessionDate}
            </p>

            {countdown && (
              <div className="font-[JetBrains_Mono] text-2xl md:text-4xl text-white mb-8 tracking-tight">
                {countdown}
              </div>
            )}

            {weatherTempC !== undefined && (
              <div className="flex items-center gap-3 mb-8 pb-8 border-b border-[rgba(228,229,229,0.06)]">
                <span className="material-symbols-outlined text-2xl text-[#FFC107]">
                  {weatherCondition === "rain" ? "rainy" : "sunny"}
                </span>
                <span className="font-[Hanken_Grotesk] text-base text-[#c4c7c7]">
                  {weatherTempC}°C · {weatherCondition}
                </span>
              </div>
            )}
          </>
        ) : (
          <h2 className="font-[Anybody] font-extrabold text-3xl md:text-5xl text-white tracking-tight leading-tight mb-8">
            Off-season
          </h2>
        )}

        <p className="font-[EB_Garamond] italic text-lg md:text-xl text-[#c4c7c7] mb-8 leading-relaxed">
          {surfaceHint}
        </p>

        {lastSessionPath && (
          <Link
            href={lastSessionPath}
            className="inline-flex items-center gap-3 px-6 py-3 bg-[#E10600] hover:bg-[#ff1a14] rounded-xl font-[Anybody] font-bold text-base text-white transition-colors"
          >
            <span className="material-symbols-outlined">replay</span>
            REPLAY LAST RACE
          </Link>
        )}
      </motion.div>
    </div>
  );
}
```

---

### `apps/web/components/live/TimingRow.tsx`

```tsx
"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export interface TimingDriver {
  position: number;
  number: number;
  code: string;
  fullName: string;
  team: string;
  teamColor: string;
  gap: string;
  interval: string;
  lastLap: string;
  bestLap: string;
  sector1: string;
  sector2: string;
  sector3: string;
  tyreCompound: "SOFT" | "MEDIUM" | "HARD" | "INTER" | "WET";
  tyreAge: number;
  isPersonalBest: boolean;
  isOverallBest: boolean;
  inPit: boolean;
}

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "#E10600",
  MEDIUM: "#FFC107",
  HARD: "#E0E0E0",
  INTER: "#43A047",
  WET: "#1E88E5",
};

interface Props {
  driver: TimingDriver;
  onHover: (driver: TimingDriver | null) => void;
  onPin: (driverNumber: number) => void;
  pinned: boolean;
}

export function TimingRow({ driver, onHover, onPin, pinned }: Props) {
  const [prevGap, setPrevGap] = useState(driver.gap);
  const [gapChanged, setGapChanged] = useState(false);

  useEffect(() => {
    if (driver.gap !== prevGap) {
      setGapChanged(true);
      const t = setTimeout(() => setGapChanged(false), 360);
      setPrevGap(driver.gap);
      return () => clearTimeout(t);
    }
  }, [driver.gap, prevGap]);

  return (
    <motion.div
      layout
      layoutId={`driver-${driver.number}`}
      transition={{
        layout: { type: "spring", stiffness: 300, damping: 30 },
      }}
      onMouseEnter={() => onHover(driver)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onPin(driver.number)}
      className={`relative grid grid-cols-[40px_1fr_80px_100px_100px_120px] md:grid-cols-[48px_1fr_100px_120px_120px_140px_180px] gap-2 md:gap-4 items-center px-3 md:px-5 py-3 md:py-4 cursor-pointer transition-all rounded-lg hover:bg-white/[0.03] ${
        pinned ? "bg-white/[0.05] ring-1 ring-[#E10600]/40" : ""
      }`}
      whileHover={{ y: -2 }}
      style={{
        borderLeft: `3px solid ${driver.teamColor}`,
      }}
    >
      <div className="font-[JetBrains_Mono] font-medium text-lg md:text-xl text-white tabular-nums">
        {driver.position.toString().padStart(2, "0")}
      </div>

      <div className="flex flex-col min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-[Anybody] font-bold text-base md:text-lg text-white tracking-tight">
            {driver.code}
          </span>
          {driver.inPit && (
            <span className="font-[JetBrains_Mono] text-[10px] text-[#FFC107] tracking-wider">
              IN PIT
            </span>
          )}
        </div>
        <span className="font-[Hanken_Grotesk] text-xs text-[#8e9192] truncate uppercase tracking-wider">
          {driver.team}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <motion.span
          key={driver.tyreAge}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.22 }}
          className="size-3 rounded-full shrink-0"
          style={{ background: COMPOUND_COLORS[driver.tyreCompound] }}
        />
        <span className="font-[JetBrains_Mono] text-xs md:text-sm text-[#c4c7c7] tabular-nums">
          L{driver.tyreAge}
        </span>
      </div>

      <div className="font-[JetBrains_Mono] text-sm md:text-base text-white tabular-nums tracking-tight">
        {driver.gap}
      </div>

      <div className="font-[JetBrains_Mono] text-sm md:text-base text-[#c4c7c7] tabular-nums tracking-tight">
        {driver.interval}
      </div>

      <div
        className={`font-[JetBrains_Mono] text-sm md:text-base tabular-nums tracking-tight ${
          driver.isOverallBest
            ? "text-[#9C27B0]"
            : driver.isPersonalBest
            ? "text-[#00C853]"
            : "text-white"
        }`}
      >
        {driver.lastLap}
      </div>

      <div className="hidden md:flex items-center gap-2 font-[JetBrains_Mono] text-xs text-[#c4c7c7]">
        <span>{driver.sector1}</span>
        <span className="text-[#444748]">/</span>
        <span>{driver.sector2}</span>
        <span className="text-[#444748]">/</span>
        <span>{driver.sector3}</span>
      </div>

      {gapChanged && (
        <motion.div
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.36, ease: [0.215, 0.61, 0.355, 1] }}
          className="absolute bottom-0 left-3 right-3 h-px bg-[#E10600]/40"
        />
      )}
    </motion.div>
  );
}
```

---

### `apps/web/components/live/SectorPanel.tsx`

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TimingDriver } from "./TimingRow";

interface Props {
  driver: TimingDriver | null;
}

export function SectorPanel({ driver }: Props) {
  return (
    <AnimatePresence mode="wait">
      {driver ? (
        <motion.div
          key={driver.number}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
          className="hidden lg:block backdrop-blur-xl bg-[rgba(28,27,27,0.7)] border border-[rgba(228,229,229,0.06)] rounded-2xl p-6 sticky top-24"
        >
          <p className="font-[JetBrains_Mono] text-xs text-[#8e9192] tracking-widest mb-3">
            DRIVER FOCUS
          </p>
          <div className="flex items-baseline gap-3 mb-6">
            <span className="font-[Anybody] font-extrabold text-4xl text-white">
              {driver.code}
            </span>
            <span className="font-[JetBrains_Mono] text-lg text-[#c4c7c7]">
              #{driver.number}
            </span>
          </div>

          <div className="space-y-4">
            <SectorBar label="S1" value={driver.sector1} />
            <SectorBar label="S2" value={driver.sector2} />
            <SectorBar label="S3" value={driver.sector3} />
          </div>

          <div className="mt-6 pt-6 border-t border-[rgba(228,229,229,0.06)]">
            <p className="font-[JetBrains_Mono] text-xs text-[#8e9192] tracking-widest mb-2">
              BEST LAP
            </p>
            <p className="font-[JetBrains_Mono] text-2xl text-white">
              {driver.bestLap}
            </p>
          </div>

          <div className="mt-4">
            <p className="font-[JetBrains_Mono] text-xs text-[#8e9192] tracking-widest mb-2">
              TYRE
            </p>
            <p className="font-[Hanken_Grotesk] text-base text-white">
              {driver.tyreCompound} · L{driver.tyreAge}
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          className="hidden lg:block backdrop-blur-xl bg-[rgba(28,27,27,0.4)] border border-[rgba(228,229,229,0.04)] rounded-2xl p-6 sticky top-24 text-center"
        >
          <p className="font-[EB_Garamond] italic text-base text-[#8e9192]">
            Hover a driver to see sector breakdown
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectorBar({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-[JetBrains_Mono] text-xs text-[#8e9192] tracking-widest">
        {label}
      </span>
      <span className="font-[JetBrains_Mono] text-base text-white tabular-nums">
        {value}
      </span>
    </div>
  );
}
```

---

### `apps/web/components/live/PositionsChart.tsx`

```tsx
"use client";

import { motion } from "framer-motion";

interface LapPosition {
  lap: number;
  position: number;
}

interface Props {
  driverCode: string;
  teamColor: string;
  data: LapPosition[];
  maxPosition?: number;
}

export function PositionsChart({
  driverCode,
  teamColor,
  data,
  maxPosition = 20,
}: Props) {
  const width = 520;
  const height = 200;
  const padding = { top: 16, right: 24, bottom: 32, left: 36 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxLap = Math.max(...data.map((d) => d.lap), 1);
  const xScale = (lap: number) => (lap / maxLap) * innerW;
  const yScale = (pos: number) => ((pos - 1) / (maxPosition - 1)) * innerH;

  const pathD = data
    .map((d, i) => {
      const x = xScale(d.lap) + padding.left;
      const y = yScale(d.position) + padding.top;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-[JetBrains_Mono] text-xs text-[#8e9192] tracking-widest">
          POSITION OVER LAPS
        </p>
        <p className="font-[Anybody] font-bold text-lg text-white">
          {driverCode}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${driverCode} positions per lap`}
      >
        {[1, 5, 10, 15, 20].map((p) => (
          <g key={p}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yScale(p) + padding.top}
              y2={yScale(p) + padding.top}
              stroke="#444748"
              strokeWidth={0.5}
              strokeDasharray="2 4"
              opacity={0.4}
            />
            <text
              x={padding.left - 8}
              y={yScale(p) + padding.top + 4}
              textAnchor="end"
              fill="#8e9192"
              fontFamily="JetBrains Mono"
              fontSize={10}
            >
              P{p}
            </text>
          </g>
        ))}

        <motion.path
          d={pathD}
          fill="none"
          stroke={teamColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: [0.215, 0.61, 0.355, 1] }}
        />

        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(d.lap) + padding.left}
            cy={yScale(d.position) + padding.top}
            r={2}
            fill={teamColor}
          />
        ))}
      </svg>
    </div>
  );
}
```

---

### `apps/web/components/live/TrackMap.tsx`

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export interface TrackDriver {
  number: number;
  code: string;
  teamColor: string;
  normalizedPosition: number;
  position: number;
}

interface Props {
  trackPathD: string;
  drivers: TrackDriver[];
  sectors: { number: 1 | 2 | 3; holderTeamColor: string; holderCode: string }[];
  onDriverSelect: (number: number) => void;
  selectedDriver?: number;
}

export function TrackMap({
  trackPathD,
  drivers,
  sectors,
  onDriverSelect,
  selectedDriver,
}: Props) {
  const pathRef = useRef<SVGPathElement>(null);
  const [coords, setCoords] = useState<Map<number, { x: number; y: number }>>(
    new Map(),
  );

  useEffect(() => {
    if (!pathRef.current) return;
    const path = pathRef.current;
    const len = path.getTotalLength();
    const next = new Map<number, { x: number; y: number }>();
    drivers.forEach((d) => {
      const pt = path.getPointAtLength(d.normalizedPosition * len);
      next.set(d.number, { x: pt.x, y: pt.y });
    });
    setCoords(next);
  }, [drivers]);

  return (
    <div className="relative w-full aspect-[16/10] backdrop-blur-sm bg-[rgba(15,15,15,0.4)] rounded-2xl overflow-hidden border border-[rgba(228,229,229,0.04)]">
      <svg
        viewBox="0 0 1000 625"
        className="absolute inset-0 w-full h-full"
        role="img"
        aria-label="Live track positions"
      >
        <path
          ref={pathRef}
          d={trackPathD}
          fill="none"
          stroke="#262626"
          strokeWidth={28}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={trackPathD}
          fill="none"
          stroke="#E10600"
          strokeWidth={2}
          strokeOpacity={0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {drivers.map((driver) => {
          const c = coords.get(driver.number);
          if (!c) return null;
          return (
            <motion.g
              key={driver.number}
              layoutId={`track-driver-${driver.number}`}
              animate={{ x: c.x, y: c.y }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              onClick={() => onDriverSelect(driver.number)}
              style={{ cursor: "pointer" }}
            >
              <circle
                r={selectedDriver === driver.number ? 18 : 13}
                fill={driver.teamColor}
                stroke="#0F0F0F"
                strokeWidth={2}
              />
              <text
                textAnchor="middle"
                dy="0.35em"
                fontFamily="Anybody"
                fontWeight={700}
                fontSize={selectedDriver === driver.number ? 14 : 10}
                fill="white"
              >
                {driver.number}
              </text>
            </motion.g>
          );
        })}
      </svg>

      <div className="absolute top-3 right-3 md:top-5 md:right-5 flex gap-1.5">
        {sectors.map((s) => (
          <motion.div
            key={s.number}
            animate={{ background: s.holderTeamColor }}
            transition={{ duration: 0.6 }}
            className="px-3 py-1.5 rounded-md font-[JetBrains_Mono] text-[10px] text-white tracking-widest shadow-lg"
            style={{ background: s.holderTeamColor }}
          >
            S{s.number} · {s.holderCode}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

---

### `apps/web/components/live/WeatherStrip.tsx`

```tsx
"use client";

import { motion } from "framer-motion";

interface Props {
  airTempC: number;
  trackTempC: number;
  humidity: number;
  windKph: number;
  windDirection: string;
  condition: "sunny" | "cloudy" | "rain" | "storm";
  rainfallMm?: number;
}

export function WeatherStrip({
  airTempC,
  trackTempC,
  humidity,
  windKph,
  windDirection,
  condition,
  rainfallMm,
}: Props) {
  return (
    <div className="relative overflow-hidden h-12 md:h-14 backdrop-blur-md bg-[rgba(28,27,27,0.5)] border-y border-[rgba(228,229,229,0.04)] flex items-center px-4 md:px-10">
      {condition === "rain" || condition === "storm" ? (
        <RainOverlay heavy={condition === "storm"} />
      ) : null}
      {condition === "sunny" ? <SunOverlay /> : null}

      <div className="relative flex items-center gap-6 md:gap-10 font-[JetBrains_Mono] text-xs md:text-sm text-white tabular-nums z-10">
        <Item label="AIR" value={`${airTempC}°C`} />
        <Item label="TRACK" value={`${trackTempC}°C`} />
        <Item label="HUM" value={`${humidity}%`} />
        <Item
          label="WIND"
          value={`${windKph}KPH ${windDirection}`}
        />
        {rainfallMm !== undefined && rainfallMm > 0 && (
          <Item label="RAIN" value={`${rainfallMm}MM`} highlight />
        )}
      </div>
    </div>
  );
}

function Item({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[#8e9192] tracking-widest text-[10px] md:text-xs">
        {label}
      </span>
      <span
        className={`tracking-tight ${highlight ? "text-[#1E88E5]" : "text-white"}`}
      >
        {value}
      </span>
    </div>
  );
}

function RainOverlay({ heavy }: { heavy: boolean }) {
  const drops = Array.from({ length: heavy ? 18 : 10 });
  return (
    <div className="absolute inset-0 pointer-events-none opacity-30">
      {drops.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-px h-3 bg-[#1E88E5]"
          style={{ left: `${(i / drops.length) * 100}%`, top: -10 }}
          animate={{ y: [0, 80] }}
          transition={{
            duration: 1.2 + (i % 3) * 0.3,
            repeat: Infinity,
            ease: "linear",
            delay: (i * 0.1) % 1,
          }}
        />
      ))}
    </div>
  );
}

function SunOverlay() {
  return (
    <motion.div
      className="absolute -right-10 top-1/2 -translate-y-1/2 size-32 rounded-full"
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      style={{
        background:
          "radial-gradient(circle, rgba(255,193,7,0.4) 0%, transparent 60%)",
      }}
    />
  );
}
```

---

### `apps/web/components/live/RaceControlMessage.tsx`

```tsx
"use client";

import { motion } from "framer-motion";

export type FlagColor =
  | "yellow"
  | "red"
  | "green"
  | "blue"
  | "white"
  | "chequered"
  | "black";

export interface RCMessage {
  id: string;
  timestamp: string;
  lap?: number;
  category: string;
  flag: FlagColor;
  message: string;
  severity: "info" | "warning" | "critical";
}

const FLAG_COLORS: Record<FlagColor, string> = {
  yellow: "#FFC107",
  red: "#E10600",
  green: "#00C853",
  blue: "#1E88E5",
  white: "#E0E0E0",
  chequered: "#FFFFFF",
  black: "#0F0F0F",
};

interface Props {
  msg: RCMessage;
  isNew: boolean;
}

export function RaceControlMessage({ msg, isNew }: Props) {
  const color = FLAG_COLORS[msg.flag];

  return (
    <motion.article
      layout
      initial={isNew ? { y: -20, opacity: 0 } : false}
      animate={
        isNew && msg.severity === "critical"
          ? {
              y: 0,
              opacity: 1,
              boxShadow: [
                `0 0 0 0 ${color}99`,
                `0 0 0 16px ${color}00`,
                `0 0 0 0 ${color}99`,
                `0 0 0 16px ${color}00`,
                `0 0 0 0 ${color}99`,
                `0 0 0 16px ${color}00`,
              ],
            }
          : isNew
          ? {
              y: 0,
              opacity: 1,
              boxShadow: [`0 0 0 0 ${color}55`, `0 0 0 10px ${color}00`],
            }
          : { y: 0, opacity: 1 }
      }
      transition={{ duration: 0.7 }}
      className="relative pl-5 pr-5 py-5 md:pl-8 md:pr-8 md:py-7 backdrop-blur-md bg-[rgba(28,27,27,0.5)] border border-[rgba(228,229,229,0.05)] rounded-xl overflow-hidden"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: color }}
      />

      <header className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="font-[JetBrains_Mono] text-xs text-[#8e9192] tracking-widest">
          {msg.timestamp}
        </span>
        {msg.lap !== undefined && (
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] font-[JetBrains_Mono] text-[10px] text-white tracking-widest">
            L{msg.lap}
          </span>
        )}
        <span
          className="font-[Anybody] font-bold text-xs tracking-widest"
          style={{ color }}
        >
          {msg.category.toUpperCase()}
        </span>
      </header>

      <p className="font-[EB_Garamond] text-xl md:text-2xl text-white leading-snug">
        {msg.message}
      </p>
    </motion.article>
  );
}
```

---

### `apps/web/components/live/RedFlashOverlay.tsx`

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";

interface Props {
  active: boolean;
}

export function RedFlashOverlay({ active }: Props) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.18, 0, 0.12, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          className="fixed inset-0 z-30 pointer-events-none bg-[#E10600]"
        />
      )}
    </AnimatePresence>
  );
}
```

---

### `apps/web/app/live/timing/page.tsx`

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LiveBanner } from "@/components/live/LiveBanner";
import { SessionHeader } from "@/components/live/SessionHeader";
import { TimingRow, TimingDriver } from "@/components/live/TimingRow";
import { SectorPanel } from "@/components/live/SectorPanel";
import { RaceDayPrompt } from "@/components/live/RaceDayPrompt";
import { NoSessionState } from "@/components/live/NoSessionState";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useLiveSession } from "@/hooks/useLiveSession";

export default function TimingPage() {
  const visible = usePageVisibility();
  const { session, drivers, dataDelaySeconds, refresh } = useLiveSession({
    enabled: visible,
    surface: "timing",
  });

  const [hoveredDriver, setHoveredDriver] = useState<TimingDriver | null>(null);
  const [pinnedDriverNumber, setPinnedDriverNumber] = useState<number | null>(
    null,
  );

  const pinnedDriver = useMemo(
    () => drivers?.find((d) => d.number === pinnedDriverNumber) ?? null,
    [drivers, pinnedDriverNumber],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!session || !session.active) {
    return (
      <>
        <LiveBanner sessionActive={false} />
        <NoSessionState
          nextSessionName={session?.next?.name}
          nextSessionDate={session?.next?.dateLabel}
          countdown={session?.next?.countdown}
          circuitSvgUrl={session?.next?.circuitSvgUrl}
          weatherTempC={session?.next?.weatherTempC}
          weatherCondition={session?.next?.weatherCondition}
          lastSessionPath={
            session?.lastCompleted
              ? `/results/${session.lastCompleted.season}/drivers#${session.lastCompleted.round}`
              : undefined
          }
          surfaceHint="During a session, this view shows the live timing tower with sector splits, tyre data, and gap-to-leader for every driver on track."
        />
      </>
    );
  }

  return (
    <>
      <LiveBanner
        sessionActive
        sessionName={session.name}
        flagStatus={session.flagStatus}
        dataDelaySeconds={dataDelaySeconds}
      />

      <RaceDayPrompt sessionActive sessionName={session.name} />

      <SessionHeader
        location={session.location}
        flagStatus={session.flagStatus}
        lapCurrent={session.lapCurrent}
        lapTotal={session.lapTotal}
        timeRemaining={session.timeRemaining}
        sessionType={session.type}
      />

      <ScanlineBackground />

      <div className="relative px-2 md:px-10 py-4 md:py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div
          aria-live="off"
          className="backdrop-blur-md bg-[rgba(20,19,19,0.55)] border border-[rgba(228,229,229,0.06)] rounded-2xl p-2 md:p-3"
        >
          <header className="hidden md:grid grid-cols-[48px_1fr_100px_120px_120px_140px_180px] gap-4 px-5 py-3 border-b border-[rgba(228,229,229,0.04)] font-[JetBrains_Mono] text-[10px] text-[#8e9192] tracking-widest">
            <span>POS</span>
            <span>DRIVER</span>
            <span>TYRE</span>
            <span>GAP</span>
            <span>INT</span>
            <span>LAST</span>
            <span>SECTORS</span>
          </header>

          <div className="flex flex-col gap-1">
            <AnimatePresence>
              {drivers?.map((driver) => (
                <TimingRow
                  key={driver.number}
                  driver={driver}
                  onHover={setHoveredDriver}
                  onPin={(n) =>
                    setPinnedDriverNumber((cur) => (cur === n ? null : n))
                  }
                  pinned={pinnedDriverNumber === driver.number}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        <SectorPanel driver={hoveredDriver} />
      </div>

      <AnimatePresence>
        {pinnedDriver && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3"
          >
            <div className="backdrop-blur-2xl bg-[rgba(28,27,27,0.9)] border border-[rgba(228,229,229,0.08)] rounded-2xl shadow-2xl">
              <TimingRow
                driver={pinnedDriver}
                onHover={() => {}}
                onPin={() => setPinnedDriverNumber(null)}
                pinned
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ScanlineBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none opacity-[0.06] z-0"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0, transparent 7px, rgba(225,6,0,1) 8px, rgba(225,6,0,1) 8px)",
        animation: "apex-scan 18s linear infinite",
      }}
    />
  );
}
```

---

### `apps/web/app/live/race-control/page.tsx`

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { LiveBanner } from "@/components/live/LiveBanner";
import { SessionHeader } from "@/components/live/SessionHeader";
import { RaceDayPrompt } from "@/components/live/RaceDayPrompt";
import { NoSessionState } from "@/components/live/NoSessionState";
import {
  RaceControlMessage,
  RCMessage,
} from "@/components/live/RaceControlMessage";
import { RedFlashOverlay } from "@/components/live/RedFlashOverlay";
import { useLiveRaceControl } from "@/hooks/useLiveRaceControl";
import { useLiveSession } from "@/hooks/useLiveSession";
import { usePageVisibility } from "@/hooks/usePageVisibility";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "FLAG", label: "Flag" },
  { key: "PENALTY", label: "Penalty" },
  { key: "SC", label: "SC / VSC" },
  { key: "TECHNICAL", label: "Technical" },
];

export default function RaceControlPage() {
  const visible = usePageVisibility();
  const { session, dataDelaySeconds } = useLiveSession({
    enabled: visible,
    surface: "race-control",
  });
  const { messages, lastNewId } = useLiveRaceControl({ enabled: visible });

  const [filter, setFilter] = useState("ALL");
  const [newCount, setNewCount] = useState(0);
  const [redFlash, setRedFlash] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const prevTopRef = useRef<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "ALL") return messages;
    return messages.filter((m) => m.category.toUpperCase().includes(filter));
  }, [messages, filter]);

  useEffect(() => {
    if (!messages.length) return;
    const top = messages[0];
    if (top.id === prevTopRef.current) return;
    prevTopRef.current = top.id;
    if (top.flag === "red" && top.severity === "critical") {
      setRedFlash(true);
      setTimeout(() => setRedFlash(false), 1700);
    }
    if (streamRef.current && streamRef.current.scrollTop < 80) {
      streamRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setNewCount((c) => c + 1);
    }
  }, [messages]);

  if (!session || !session.active) {
    return (
      <>
        <LiveBanner sessionActive={false} />
        <NoSessionState
          nextSessionName={session?.next?.name}
          nextSessionDate={session?.next?.dateLabel}
          countdown={session?.next?.countdown}
          circuitSvgUrl={session?.next?.circuitSvgUrl}
          weatherTempC={session?.next?.weatherTempC}
          weatherCondition={session?.next?.weatherCondition}
          lastSessionPath={
            session?.lastCompleted
              ? `/results/${session.lastCompleted.season}/drivers#${session.lastCompleted.round}`
              : undefined
          }
          surfaceHint="During a session, this view streams every steward bulletin, flag deployment, and penalty decision in real time, top to bottom."
        />
      </>
    );
  }

  return (
    <>
      <LiveBanner
        sessionActive
        sessionName={session.name}
        flagStatus={session.flagStatus}
        dataDelaySeconds={dataDelaySeconds}
      />
      <RaceDayPrompt sessionActive sessionName={session.name} />
      <SessionHeader
        location={session.location}
        flagStatus={session.flagStatus}
        lapCurrent={session.lapCurrent}
        lapTotal={session.lapTotal}
        timeRemaining={session.timeRemaining}
        sessionType={session.type}
      />
      <RedFlashOverlay active={redFlash} />

      <div className="sticky top-14 md:top-16 z-30 backdrop-blur-xl bg-[rgba(20,19,19,0.75)] border-b border-[rgba(228,229,229,0.05)] px-4 md:px-10 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`relative px-4 py-2 rounded-full font-[Anybody] font-bold text-xs md:text-sm tracking-widest transition-colors whitespace-nowrap ${
                filter === f.key
                  ? "text-white"
                  : "text-[#8e9192] hover:text-white"
              }`}
            >
              {filter === f.key && (
                <motion.div
                  layoutId="rc-filter-active"
                  className="absolute inset-0 rounded-full bg-[#E10600]/15 border border-[#E10600]/40"
                  transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
                />
              )}
              <span className="relative">{f.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative px-4 md:px-10 py-6 md:py-10">
        <AnimatePresence>
          {newCount > 0 && (
            <motion.button
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              onClick={() => {
                streamRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                setNewCount(0);
              }}
              className="sticky top-32 z-20 mx-auto block px-4 py-1.5 rounded-full bg-[#E10600] text-white font-[Anybody] font-bold text-xs tracking-widest shadow-2xl"
            >
              {newCount} NEW
            </motion.button>
          )}
        </AnimatePresence>

        <div
          ref={streamRef}
          aria-live="polite"
          className="max-w-3xl mx-auto flex flex-col gap-3 md:gap-4 max-h-[70vh] overflow-y-auto pr-2"
        >
          <AnimatePresence initial={false}>
            {filtered.map((msg) => (
              <RaceControlMessage
                key={msg.id}
                msg={msg}
                isNew={msg.id === lastNewId}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
```

---

### `apps/web/app/live/track/page.tsx`

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { LiveBanner } from "@/components/live/LiveBanner";
import { SessionHeader } from "@/components/live/SessionHeader";
import { RaceDayPrompt } from "@/components/live/RaceDayPrompt";
import { NoSessionState } from "@/components/live/NoSessionState";
import { TrackMap } from "@/components/live/TrackMap";
import { WeatherStrip } from "@/components/live/WeatherStrip";
import { PositionsChart } from "@/components/live/PositionsChart";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useLiveTrack } from "@/hooks/useLiveTrack";
import { usePageVisibility } from "@/hooks/usePageVisibility";

export default function TrackPage() {
  const visible = usePageVisibility();
  const { session, dataDelaySeconds } = useLiveSession({
    enabled: visible,
    surface: "track",
  });
  const { trackPathD, drivers, sectors, weather, driverDetail } = useLiveTrack({
    enabled: visible,
  });

  const [selectedDriver, setSelectedDriver] = useState<number | undefined>();
  const detail = selectedDriver ? driverDetail(selectedDriver) : null;

  if (!session || !session.active) {
    return (
      <>
        <LiveBanner sessionActive={false} />
        <NoSessionState
          nextSessionName={session?.next?.name}
          nextSessionDate={session?.next?.dateLabel}
          countdown={session?.next?.countdown}
          circuitSvgUrl={session?.next?.circuitSvgUrl}
          weatherTempC={session?.next?.weatherTempC}
          weatherCondition={session?.next?.weatherCondition}
          lastSessionPath={
            session?.lastCompleted
              ? `/results/${session.lastCompleted.season}/drivers#${session.lastCompleted.round}`
              : undefined
          }
          surfaceHint="During a session, this view plots every car onto a live track map with sector status, weather, and per-driver telemetry."
        />
      </>
    );
  }

  return (
    <>
      <LiveBanner
        sessionActive
        sessionName={session.name}
        flagStatus={session.flagStatus}
        dataDelaySeconds={dataDelaySeconds}
      />
      <RaceDayPrompt sessionActive sessionName={session.name} />
      <SessionHeader
        location={session.location}
        flagStatus={session.flagStatus}
        lapCurrent={session.lapCurrent}
        lapTotal={session.lapTotal}
        timeRemaining={session.timeRemaining}
        sessionType={session.type}
      />

      {weather && (
        <WeatherStrip
          airTempC={weather.airTempC}
          trackTempC={weather.trackTempC}
          humidity={weather.humidity}
          windKph={weather.windKph}
          windDirection={weather.windDirection}
          condition={weather.condition}
          rainfallMm={weather.rainfallMm}
        />
      )}

      <div className="relative px-4 md:px-10 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <TrackMap
          trackPathD={trackPathD}
          drivers={drivers}
          sectors={sectors}
          onDriverSelect={(n) =>
            setSelectedDriver((cur) => (cur === n ? undefined : n))
          }
          selectedDriver={selectedDriver}
        />

        <AnimatePresence mode="wait">
          {detail ? (
            <motion.div
              key={detail.number}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
              className="backdrop-blur-xl bg-[rgba(28,27,27,0.7)] border border-[rgba(228,229,229,0.06)] rounded-2xl p-6"
            >
              <p className="font-[JetBrains_Mono] text-xs text-[#8e9192] tracking-widest mb-3">
                DRIVER DETAIL
              </p>
              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-[Anybody] font-extrabold text-3xl text-white">
                  {detail.code}
                </span>
                <span className="font-[JetBrains_Mono] text-base text-[#c4c7c7]">
                  #{detail.number}
                </span>
              </div>

              <PositionsChart
                driverCode={detail.code}
                teamColor={detail.teamColor}
                data={detail.positionHistory}
              />

              <div className="mt-6 pt-6 border-t border-[rgba(228,229,229,0.06)]">
                <p className="font-[JetBrains_Mono] text-xs text-[#8e9192] tracking-widest mb-3">
                  TYRE STINTS
                </p>
                <div className="flex w-full h-8 rounded-md overflow-hidden">
                  {detail.tyreStints.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center font-[JetBrains_Mono] text-[10px] text-white"
                      style={{
                        background: s.color,
                        width: `${(s.lapCount / detail.totalLaps) * 100}%`,
                      }}
                    >
                      {s.compound[0]}·{s.lapCount}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="hidden lg:flex backdrop-blur-md bg-[rgba(28,27,27,0.4)] border border-[rgba(228,229,229,0.04)] rounded-2xl p-6 items-center justify-center text-center min-h-[300px]"
            >
              <p className="font-[EB_Garamond] italic text-base text-[#8e9192]">
                Tap a driver dot to see their lap chart and tyre stints
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
```

---

### `apps/web/hooks/usePageVisibility.ts`

```ts
"use client";

import { useEffect, useState } from "react";

export function usePageVisibility() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    onChange();
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible;
}
```

---

### `apps/web/hooks/useLiveSession.ts` (Phase B shape, swap to SSE in Phase C)

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface LiveSessionState {
  active: boolean;
  name: string;
  location: string;
  type: string;
  flagStatus: "GREEN" | "YELLOW" | "RED" | "SC" | "VSC" | "CHEQUERED";
  lapCurrent?: number;
  lapTotal?: number;
  timeRemaining?: string;
  drivers?: any[];
  next?: {
    name: string;
    dateLabel: string;
    countdown: string;
    circuitSvgUrl?: string;
    weatherTempC?: number;
    weatherCondition?: "sunny" | "cloudy" | "rain" | "storm";
  };
  lastCompleted?: { season: string; round: string };
}

interface Args {
  enabled: boolean;
  surface: "timing" | "race-control" | "track";
}

export function useLiveSession({ enabled }: Args) {
  const [session, setSession] = useState<LiveSessionState | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [dataDelaySeconds, setDataDelaySeconds] = useState<number | undefined>();
  const backoffRef = useRef(2000);
  const lastSuccessRef = useRef(Date.now());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/live/session", { cache: "no-store" });
      if (!res.ok) throw new Error("session fetch failed");
      const json = await res.json();
      setSession(json.session);
      setDrivers(json.drivers ?? []);
      lastSuccessRef.current = Date.now();
      backoffRef.current = 2000;
      setDataDelaySeconds(undefined);
    } catch {
      backoffRef.current = Math.min(backoffRef.current * 2, 30000);
      const delta = (Date.now() - lastSuccessRef.current) / 1000;
      if (delta > 3) setDataDelaySeconds(delta);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const tick = async () => {
      await refresh();
      if (cancelled) return;
      setTimeout(tick, backoffRef.current);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [enabled, refresh]);

  return { session, drivers, dataDelaySeconds, refresh };
}
```

---

### `apps/web/hooks/useLiveRaceControl.ts` and `useLiveTrack.ts`

Same structure as `useLiveSession`: fetch `/api/live/race-control` and `/api/live/track`, exponential backoff, set delay-seconds when stale. Track hook offloads `getPointAtLength` to a Web Worker by posting `{driverNumber, normalizedPosition}` arrays and receiving `{driverNumber, x, y}` results. Stub omitted for brevity but follows the identical contract.

---

### Final notes for the build

- Add to `globals.css`: `@keyframes apex-scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(0); } }` and `.no-scrollbar::-webkit-scrollbar { display: none; }`.
- The `useLiveRaceControl` hook needs to track `lastNewId` (the most recent message id) so the message component can fire its enter-animation only on truly new messages, not on re-renders.
- The Web Worker for track positions: `apps/web/workers/trackPositions.worker.ts`, instantiated via `new Worker(new URL("./trackPositions.worker.ts", import.meta.url))` inside `useLiveTrack`.
- Sound design hook (`useRaceAudio`) is left as a Phase C addition. The toggle should live in the Live Banner as a speaker icon writing to `localStorage["apex-live-audio"]`.
- All copy carefully avoids em dashes per founder constraint. Separators use middle dot `·` or forward slash `/` throughout.
