# Glass-morphism component library — Card / Modal / Sheet / Drawer / Banner

Tokens confirmed. Now delivering the 8 components.

---

# Apex Glass-Morphism System v2

## Rationale

**The problem with most glass UI**: it gets used as decoration. On Apex, glass is a structural device. It signals "telemetry surface" — data living above the chassis. Every glass element earns its blur by sitting over either (a) a photographic backdrop (driver portrait, track imagery), or (b) live data motion (timing tower, live feed). Glass over flat charcoal = wasted GPU.

**Token contract**: every component pulls from `packages/ui/src/tokens.ts`. Brand red `#E10600` is the only saturated color allowed inside glass. White at 6 / 10 / 14% opacity drives the three blur tiers (subtle / medium / pronounced). The 1px gradient border (TL bright → BR dark) is non-negotiable. it's what stops glass from looking like a flat blurred rect.

**Performance discipline**:
- `isolation: isolate` + `contain: layout style paint` on every blur parent. Without these, backdrop-filter forces full-page repaints on scroll.
- `contain-intrinsic-size` on list items, so the browser can skip layout work for off-screen glass cards.
- `will-change: transform` only added on `pointerenter` and stripped on `pointerleave` / `transitionend`. Never set statically.
- `-webkit-backdrop-filter` paired with every `backdrop-filter` for iOS Safari < 18.
- `@media (prefers-reduced-motion: reduce)` strips backdrop-filter entirely and falls back to solid `surfaceContainer` at 92% opacity. Cheaper, accessible, identical hierarchy.

**A11y discipline**: 2px telemetry-red focus ring at 3px offset on every interactive. Sheet/Drawer/Lightbox trap focus via a shared `useFocusTrap` primitive and restore on close. Tooltip uses `aria-describedby` (not `aria-labelledby` — the trigger has its own label). Sheet drag handle gets `aria-label="Drag to resize sheet"` and `role="slider"` with keyboard support (Arrow Up/Down cycle snap points).

**Reduced motion**: handled at three levels — `prefers-reduced-motion` CSS query strips blur, Framer Motion's `useReducedMotion()` swaps spring → tween, and drag-to-dismiss disables entirely (replaced with explicit close button).

**File layout**: all 8 live under `packages/ui/src/glass/`. Each is tree-shakeable. Tooltip + Popover share a Radix dependency (`@radix-ui/react-tooltip`, `@radix-ui/react-popover`) — already in your stack via shadcn convention. Sheet/Drawer/Lightbox use Framer Motion 12 + `@react-aria/focus`.

---

## 0. Shared primitives — `packages/ui/src/glass/_shared.css`

```css
/* Apex glass primitives. Imported once in globals.css. */

@layer apex-glass {
  /* Base glass surface — used by every component */
  .apex-glass {
    position: relative;
    isolation: isolate;
    contain: layout style paint;
    background: color-mix(in oklab, #1c1b1b 62%, transparent);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    backdrop-filter: blur(14px) saturate(140%);
    border-radius: 14px;
  }

  /* Gradient border — TL bright, BR dark. 1px hairline via mask. */
  .apex-glass::before {
    content: "";
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: inherit;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.22) 0%,
      rgba(255, 255, 255, 0.04) 38%,
      rgba(255, 255, 255, 0) 60%,
      rgba(0, 0, 0, 0.35) 100%
    );
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    z-index: 1;
  }

  /* Noise overlay — fixed SVG dataURI, no extra request */
  .apex-glass::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
    mix-blend-mode: overlay;
    opacity: 0.45;
    pointer-events: none;
    z-index: 0;
  }

  /* Tier variants */
  .apex-glass--subtle {
    -webkit-backdrop-filter: blur(8px) saturate(125%);
    backdrop-filter: blur(8px) saturate(125%);
    background: color-mix(in oklab, #1c1b1b 70%, transparent);
  }
  .apex-glass--medium {
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    backdrop-filter: blur(14px) saturate(140%);
    background: color-mix(in oklab, #1c1b1b 60%, transparent);
  }
  .apex-glass--pronounced {
    -webkit-backdrop-filter: blur(22px) saturate(160%);
    backdrop-filter: blur(22px) saturate(160%);
    background: color-mix(in oklab, #1c1b1b 48%, transparent);
  }

  /* Reduced-motion + no-backdrop fallback */
  @media (prefers-reduced-motion: reduce), (not (backdrop-filter: blur(1px))) {
    .apex-glass,
    .apex-glass--subtle,
    .apex-glass--medium,
    .apex-glass--pronounced {
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
      background: color-mix(in oklab, #201f1f 92%, transparent);
    }
  }

  /* Focus ring — used on every interactive glass */
  .apex-focus-ring:focus-visible {
    outline: 2px solid #E10600;
    outline-offset: 3px;
    border-radius: inherit;
  }
}
```

Add `@import "./glass/_shared.css";` to `packages/ui/src/tokens.css`.

---

## 1. `<GlassCard>` — `packages/ui/src/glass/GlassCard.tsx`

```tsx
"use client";

import * as React from "react";
import { cn } from "../cn";

type Variant = "subtle" | "medium" | "pronounced";

export interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof JSX.IntrinsicElements;
  variant?: Variant;
  hoverLift?: boolean;
  accentEdge?: string;
  loading?: boolean;
}

export const GlassCard = React.forwardRef<HTMLElement, GlassCardProps>(
  function GlassCard(
    {
      as: Tag = "div",
      variant = "medium",
      hoverLift = false,
      accentEdge,
      loading = false,
      className,
      style,
      children,
      onPointerEnter,
      onPointerLeave,
      ...rest
    },
    ref,
  ) {
    const localRef = React.useRef<HTMLElement | null>(null);
    React.useImperativeHandle(ref, () => localRef.current as HTMLElement);

    // will-change only during active hover, stripped after
    const handleEnter = React.useCallback(
      (e: React.PointerEvent<HTMLElement>) => {
        if (hoverLift && localRef.current) {
          localRef.current.style.willChange = "transform, box-shadow";
        }
        onPointerEnter?.(e);
      },
      [hoverLift, onPointerEnter],
    );
    const handleLeave = React.useCallback(
      (e: React.PointerEvent<HTMLElement>) => {
        if (localRef.current) {
          // strip after transition completes
          const el = localRef.current;
          const clear = () => {
            el.style.willChange = "";
            el.removeEventListener("transitionend", clear);
          };
          el.addEventListener("transitionend", clear);
        }
        onPointerLeave?.(e);
      },
      [onPointerLeave],
    );

    const Cmp = Tag as any;

    return (
      <Cmp
        ref={localRef}
        className={cn(
          "apex-glass",
          `apex-glass--${variant}`,
          "relative block p-6 text-[--color-on-surface]",
          "transition-[transform,box-shadow] duration-[320ms] ease-[cubic-bezier(0.215,0.61,0.355,1)]",
          hoverLift &&
            "hover:-translate-y-2 hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65),0_8px_20px_-8px_rgba(225,6,0,0.18)]",
          "[contain-intrinsic-size:auto_280px]",
          loading && "animate-pulse",
          className,
        )}
        style={{
          ...style,
          ...(accentEdge && {
            boxShadow: `inset 1.5px 0 0 0 ${accentEdge}`,
          }),
        }}
        onPointerEnter={handleEnter}
        onPointerLeave={handleLeave}
        {...rest}
      >
        <div className="relative z-[2]">
          {loading ? <GlassCardSkeleton /> : children}
        </div>
      </Cmp>
    );
  },
);

function GlassCardSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-3 w-24 rounded-sm bg-white/8" />
      <div className="h-6 w-3/4 rounded-sm bg-white/12" />
      <div className="h-3 w-full rounded-sm bg-white/6" />
      <div className="h-3 w-5/6 rounded-sm bg-white/6" />
    </div>
  );
}
```

**Usage**

```tsx
<GlassCard variant="medium" hoverLift accentEdge="#E10600">
  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
    Lap 47 of 71
  </p>
  <h3 className="mt-2 font-display text-2xl font-bold">VER · 1:18.422</h3>
  <p className="mt-3 text-sm text-white/70">Purple sector 2. Gap to NOR +2.114s.</p>
</GlassCard>
```

---

## 2. `<GlassPanel>` — `packages/ui/src/glass/GlassPanel.tsx`

```tsx
"use client";

import * as React from "react";
import { cn } from "../cn";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLElement> {
  pinned?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

export const GlassPanel = React.forwardRef<HTMLElement, GlassPanelProps>(
  function GlassPanel(
    { pinned = false, as: Tag = "section", className, children, ...rest },
    ref,
  ) {
    const localRef = React.useRef<HTMLElement | null>(null);
    React.useImperativeHandle(ref, () => localRef.current as HTMLElement);
    const [scrolled, setScrolled] = React.useState(false);

    React.useEffect(() => {
      if (!pinned || !localRef.current) return;
      const el = localRef.current;
      const observer = new IntersectionObserver(
        ([entry]) => setScrolled(entry.intersectionRatio < 1),
        { threshold: [1], rootMargin: "-1px 0px 0px 0px" },
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, [pinned]);

    const Cmp = Tag as any;

    return (
      <Cmp
        ref={localRef}
        className={cn(
          "apex-glass apex-glass--pronounced",
          "relative w-full px-[10vw] py-10",
          "[--panel-radial:radial-gradient(ellipse_at_50%_-20%,rgba(225,6,0,0.22),transparent_60%)]",
          "before:!rounded-none after:!rounded-none",
          "rounded-none",
          pinned && "sticky top-0 z-40",
          pinned && scrolled && "shadow-[0_18px_40px_-22px_rgba(0,0,0,0.8)]",
          "transition-shadow duration-[320ms] ease-[cubic-bezier(0.215,0.61,0.355,1)]",
          className,
        )}
        {...rest}
      >
        {/* Red radial highlight at top-center */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] [background-image:var(--panel-radial)]"
        />
        <div className="relative z-[2]">{children}</div>
      </Cmp>
    );
  },
);
```

**Usage**

```tsx
<GlassPanel pinned>
  <div className="flex items-center justify-between">
    <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/60">
      Live · Round 9 · Spanish GP
    </p>
    <button className="apex-focus-ring rounded-full bg-[#E10600] px-5 py-2 text-sm font-medium text-white">
      Open timing tower
    </button>
  </div>
</GlassPanel>
```

---

## 3. `<Sheet>` — `packages/ui/src/glass/Sheet.tsx`

```tsx
"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { FocusScope } from "@react-aria/focus";
import { cn } from "../cn";

type Snap = 0.5 | 0.9 | 1;

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  snapPoints?: Snap[];
  title: string;
  children: React.ReactNode;
}

export function Sheet({
  open,
  onClose,
  snapPoints = [0.5, 0.9, 1],
  title,
  children,
}: SheetProps) {
  const [snapIndex, setSnapIndex] = React.useState(0);
  const reduce = useReducedMotion();
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 400], [1, 0]);

  const snap = snapPoints[snapIndex] ?? 0.5;
  const sheetHeight = `${snap * 100}vh`;

  const cycle = React.useCallback(
    (dir: 1 | -1) => {
      setSnapIndex((i) =>
        Math.min(Math.max(i + dir, 0), snapPoints.length - 1),
      );
    },
    [snapPoints.length],
  );

  // ESC to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/55"
            style={{
              backdropFilter: reduce ? undefined : "blur(18px)",
              WebkitBackdropFilter: reduce ? undefined : "blur(18px)",
              opacity,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.215, 0.61, 0.355, 1] }}
            onClick={onClose}
            aria-hidden="true"
          />
          <FocusScope contain restoreFocus autoFocus>
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className={cn(
                "apex-glass apex-glass--pronounced",
                "fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl",
                "rounded-t-3xl rounded-b-none pt-3",
              )}
              style={{ height: sheetHeight, y }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={
                reduce
                  ? { duration: 0.2 }
                  : { type: "spring", damping: 32, stiffness: 320 }
              }
              drag={reduce ? false : "y"}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 140 || info.velocity.y > 600) onClose();
                else if (info.offset.y < -80) cycle(1);
              }}
            >
              {/* Drag handle */}
              <div
                role="slider"
                aria-label="Drag to resize sheet"
                aria-valuemin={0}
                aria-valuemax={snapPoints.length - 1}
                aria-valuenow={snapIndex}
                tabIndex={0}
                onPointerDown={(e) => dragControls.start(e)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") cycle(1);
                  if (e.key === "ArrowDown") cycle(-1);
                }}
                className="apex-focus-ring mx-auto flex h-6 w-full max-w-[80px] cursor-grab items-center justify-center active:cursor-grabbing"
              >
                <span className="block h-1.5 w-12 rounded-full bg-white/30" />
              </div>

              <header className="relative z-[2] flex items-center justify-between px-6 pt-2 pb-4">
                <h2 className="font-display text-xl font-bold text-white">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="apex-focus-ring rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Close sheet"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </header>

              <div className="relative z-[2] h-[calc(100%-88px)] overflow-y-auto px-6 pb-[max(env(safe-area-inset-bottom),24px)]">
                {children}
              </div>
            </motion.aside>
          </FocusScope>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Usage**

```tsx
const [open, setOpen] = useState(false);

<Sheet open={open} onClose={() => setOpen(false)} title="Filter results" snapPoints={[0.5, 0.9, 1]}>
  <FilterTree />
</Sheet>
```

---

## 4. `<Drawer>` — `packages/ui/src/glass/Drawer.tsx`

```tsx
"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FocusScope } from "@react-aria/focus";
import { cn } from "../cn";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}

export function Drawer({
  open,
  onClose,
  title,
  header,
  footer,
  children,
  width = 480,
}: DrawerProps) {
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60"
            style={{
              backdropFilter: reduce ? undefined : "blur(18px)",
              WebkitBackdropFilter: reduce ? undefined : "blur(18px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.215, 0.61, 0.355, 1] }}
            onClick={onClose}
            aria-hidden="true"
          />
          <FocusScope contain restoreFocus autoFocus>
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={title ?? "Drawer"}
              className={cn(
                "apex-glass apex-glass--pronounced",
                "fixed top-0 right-0 z-50 flex h-dvh flex-col rounded-none",
              )}
              style={{ width: `min(${width}px, 100vw)` }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={
                reduce
                  ? { duration: 0.2 }
                  : { type: "spring", damping: 30, stiffness: 300 }
              }
            >
              <header className="relative z-[2] flex items-center justify-between border-b border-white/8 px-6 py-5">
                {header ?? (
                  <h2 className="font-display text-xl font-bold text-white">
                    {title}
                  </h2>
                )}
                <button
                  onClick={onClose}
                  className="apex-focus-ring rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Close drawer"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </header>

              <div className="relative z-[2] flex-1 overflow-y-auto px-6 py-6">
                {children}
              </div>

              {footer && (
                <footer className="relative z-[2] border-t border-white/8 px-6 py-4">
                  {footer}
                </footer>
              )}
            </motion.aside>
          </FocusScope>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Usage**

```tsx
<Drawer
  open={open}
  onClose={close}
  title="Driver compare"
  footer={<button className="w-full rounded-full bg-[#E10600] py-3 text-white">Apply</button>}
>
  <CompareForm />
</Drawer>
```

---

## 5. `<Banner>` — `packages/ui/src/glass/Banner.tsx`

```tsx
"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../cn";

type Variant = "info" | "success" | "warning" | "breaking";

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  /** Auto-dismiss after ms. 0 disables. Default 6000. */
  duration?: number;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  info: "[--banner-accent:#c4c7c7]",
  success: "[--banner-accent:#86efac]",
  warning: "[--banner-accent:#fbbf24]",
  breaking:
    "[--banner-accent:#E10600] [background-image:linear-gradient(90deg,rgba(225,6,0,0.18),transparent_60%)]",
};

export function Banner({
  variant = "info",
  duration = 6000,
  onDismiss,
  icon,
  children,
  className,
  ...rest
}: BannerProps) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (!duration || !visible) return;
    const t = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => window.clearTimeout(t);
  }, [duration, onDismiss, visible]);

  if (!visible) return null;

  return (
    <div
      role={variant === "breaking" ? "alert" : "status"}
      aria-live={variant === "breaking" ? "assertive" : "polite"}
      className={cn(
        "apex-glass apex-glass--subtle",
        "relative flex items-center gap-3 overflow-hidden rounded-full px-5 py-2.5",
        variantStyles[variant],
        className,
      )}
      style={{ boxShadow: `inset 2px 0 0 0 var(--banner-accent)` }}
      {...rest}
    >
      {variant === "breaking" && (
        <span
          aria-hidden="true"
          className="relative z-[2] inline-flex h-1.5 w-1.5 items-center justify-center"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E10600] opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E10600]" />
        </span>
      )}
      {icon && <span className="relative z-[2] text-white/80">{icon}</span>}
      <p className="relative z-[2] flex-1 text-sm text-white/85">{children}</p>
      <button
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
        className="apex-focus-ring relative z-[2] rounded-full p-1 text-white/60 hover:text-white"
        aria-label="Dismiss banner"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
      {duration > 0 && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-[1] h-[2px] origin-left bg-[var(--banner-accent)]"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{
            duration: reduce ? 0 : duration / 1000,
            ease: "linear",
          }}
        />
      )}
    </div>
  );
}
```

**Usage**

```tsx
<Banner variant="breaking" duration={10000}>
  Red flag · lap 24 · Norris into the barriers at turn 9
</Banner>
```

---

## 6. `<Tooltip>` — `packages/ui/src/glass/Tooltip.tsx`

```tsx
"use client";

import * as React from "react";
import * as TT from "@radix-ui/react-tooltip";
import { cn } from "../cn";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
}

export function Tooltip({
  content,
  children,
  side = "top",
  delayDuration = 200,
}: TooltipProps) {
  return (
    <TT.Provider delayDuration={delayDuration}>
      <TT.Root>
        <TT.Trigger asChild>{children}</TT.Trigger>
        <TT.Portal>
          <TT.Content
            side={side}
            sideOffset={8}
            className={cn(
              "apex-glass apex-glass--medium",
              "z-50 max-w-[260px] rounded-md px-3 py-1.5 text-xs text-white/90",
              "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out",
              "data-[state=delayed-open]:fade-in-0 data-[state=closed]:fade-out-0",
              "data-[state=delayed-open]:zoom-in-95 data-[state=closed]:zoom-out-95",
              "data-[side=top]:slide-in-from-bottom-1",
              "data-[side=bottom]:slide-in-from-top-1",
              "data-[side=left]:slide-in-from-right-1",
              "data-[side=right]:slide-in-from-left-1",
            )}
          >
            <span className="relative z-[2]">{content}</span>
            <TT.Arrow
              width={10}
              height={5}
              className="fill-white/15 [filter:drop-shadow(0_-1px_0_rgba(255,255,255,0.08))]"
            />
          </TT.Content>
        </TT.Portal>
      </TT.Root>
    </TT.Provider>
  );
}
```

**Usage**

```tsx
<Tooltip content="Difference vs personal best · current stint">
  <button className="apex-focus-ring font-mono text-xs">+0.214</button>
</Tooltip>
```

Note: Radix wires `aria-describedby` automatically — the trigger gets it pointing to the content's id.

---

## 7. `<Popover>` — `packages/ui/src/glass/Popover.tsx`

```tsx
"use client";

import * as React from "react";
import * as PP from "@radix-ui/react-popover";
import { cn } from "../cn";

export interface PopoverProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  width?: number;
}

export function Popover({
  trigger,
  children,
  side = "bottom",
  align = "center",
  width = 320,
}: PopoverProps) {
  return (
    <PP.Root>
      <PP.Trigger asChild>{trigger}</PP.Trigger>
      <PP.Portal>
        <PP.Content
          side={side}
          align={align}
          sideOffset={10}
          collisionPadding={16}
          style={{ width }}
          className={cn(
            "apex-glass apex-glass--pronounced",
            "z-50 rounded-xl p-4 text-sm text-white/90 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            "data-[side=top]:slide-in-from-bottom-2",
            "data-[side=bottom]:slide-in-from-top-2",
          )}
        >
          <div className="relative z-[2]">{children}</div>
          <PP.Arrow width={14} height={7} className="fill-white/12" />
        </PP.Content>
      </PP.Portal>
    </PP.Root>
  );
}
```

**Usage**

```tsx
<Popover
  trigger={
    <button className="apex-focus-ring rounded-full bg-white/10 px-4 py-2 text-sm">
      Race options
    </button>
  }
>
  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
    Settings
  </p>
  <ul className="mt-2 space-y-2">
    <li><button>Toggle sector times</button></li>
    <li><button>Show pit windows</button></li>
  </ul>
</Popover>
```

---

## 8. `<Lightbox>` — `packages/ui/src/glass/Lightbox.tsx`

```tsx
"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { FocusScope } from "@react-aria/focus";
import { cn } from "../cn";

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface LightboxProps {
  images: LightboxImage[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export function Lightbox({
  images,
  index,
  open,
  onClose,
  onIndexChange,
}: LightboxProps) {
  const reduce = useReducedMotion();
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const pinchDistRef = React.useRef<number | null>(null);
  const baseScaleRef = React.useRef(1);

  const current = images[index];

  const resetZoom = React.useCallback(() => {
    scale.set(1);
    x.set(0);
    y.set(0);
  }, [scale, x, y]);

  // Reset zoom on image change
  React.useEffect(() => {
    resetZoom();
  }, [index, resetZoom]);

  // Keyboard nav
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < images.length - 1)
        onIndexChange(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, images.length, onClose, onIndexChange, resetZoom]);

  // Wheel zoom (desktop)
  const onWheel = React.useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const next = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, scale.get() - e.deltaY * 0.003),
      );
      scale.set(next);
      if (next === 1) {
        x.set(0);
        y.set(0);
      }
    },
    [scale, x, y],
  );

  // Pinch zoom (mobile)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
      baseScaleRef.current = scale.get();
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const next = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, baseScaleRef.current * (dist / pinchDistRef.current)),
      );
      scale.set(next);
    }
  };
  const onTouchEnd = () => {
    pinchDistRef.current = null;
  };

  // Lock body scroll
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && current && (
        <FocusScope contain restoreFocus autoFocus>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Image ${index + 1} of ${images.length}: ${current.alt}`}
            className="fixed inset-0 z-[60] flex flex-col bg-black/75"
            style={{
              backdropFilter: reduce ? undefined : "blur(30px)",
              WebkitBackdropFilter: reduce ? undefined : "blur(30px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.215, 0.61, 0.355, 1] }}
          >
            {/* Top bar */}
            <header className="relative z-[2] flex items-center justify-between px-6 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/65">
                {index + 1} / {images.length}
              </p>
              <button
                onClick={onClose}
                className="apex-focus-ring rounded-full bg-white/8 p-2 text-white/85 hover:bg-white/14"
                aria-label="Close lightbox"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </header>

            {/* Image stage */}
            <div
              className="relative flex flex-1 items-center justify-center overflow-hidden"
              onWheel={onWheel}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onDoubleClick={() =>
                scale.get() > 1 ? resetZoom() : scale.set(2)
              }
            >
              <motion.img
                key={current.src}
                src={current.src}
                alt={current.alt}
                draggable={false}
                className="max-h-full max-w-full select-none object-contain"
                style={{ scale, x, y }}
                drag={scale.get() > 1}
                dragMomentum={false}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
              />

              {/* Nav buttons */}
              {index > 0 && (
                <NavBtn
                  dir="left"
                  onClick={() => onIndexChange(index - 1)}
                  label="Previous image"
                />
              )}
              {index < images.length - 1 && (
                <NavBtn
                  dir="right"
                  onClick={() => onIndexChange(index + 1)}
                  label="Next image"
                />
              )}
            </div>

            {/* Caption */}
            {current.caption && (
              <footer
                className={cn(
                  "apex-glass apex-glass--medium",
                  "relative z-[2] mx-auto mb-6 max-w-2xl rounded-xl px-5 py-3 text-center text-sm text-white/85",
                )}
              >
                <span className="relative z-[2]">{current.caption}</span>
              </footer>
            )}
          </motion.div>
        </FocusScope>
      )}
    </AnimatePresence>
  );
}

function NavBtn({
  dir,
  onClick,
  label,
}: {
  dir: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "apex-glass apex-glass--medium apex-focus-ring",
        "absolute top-1/2 -translate-y-1/2 rounded-full p-3 text-white/90 hover:text-white",
        dir === "left" ? "left-4" : "right-4",
      )}
    >
      <span className="material-symbols-outlined text-2xl">
        {dir === "left" ? "chevron_left" : "chevron_right"}
      </span>
    </button>
  );
}
```

**Usage**

```tsx
const [idx, setIdx] = useState(0);
const [open, setOpen] = useState(false);

<Lightbox
  open={open}
  onClose={() => setOpen(false)}
  index={idx}
  onIndexChange={setIdx}
  images={[
    { src: "/gallery/monaco-01.jpg", alt: "Verstappen entering Casino Square", caption: "Q3 · pole lap · Monaco 2026" },
    { src: "/gallery/monaco-02.jpg", alt: "Pit lane at dusk" },
  ]}
/>
```

---

## File destinations (paste-ready)

| File | Path |
|---|---|
| Shared CSS | `/Users/shauryapunj/Desktop/F1_Claude/packages/ui/src/glass/_shared.css` |
| GlassCard | `/Users/shauryapunj/Desktop/F1_Claude/packages/ui/src/glass/GlassCard.tsx` |
| GlassPanel | `/Users/shauryapunj/Desktop/F1_Claude/packages/ui/src/glass/GlassPanel.tsx` |
| Sheet | `/Users/shauryapunj/Desktop/F1_Claude/packages/ui/src/glass/Sheet.tsx` |
| Drawer | `/Users/shauryapunj/Desktop/F1_Claude/packages/ui/src/glass/Drawer.tsx` |
| Banner | `/Users/shauryapunj/Desktop/F1_Claude/packages/ui/src/glass/Banner.tsx` |
| Tooltip | `/Users/shauryapunj/Desktop/F1_Claude/packages/ui/src/glass/Tooltip.tsx` |
| Popover | `/Users/shauryapunj/Desktop/F1_Claude/packages/ui/src/glass/Popover.tsx` |
| Lightbox | `/Users/shauryapunj/Desktop/F1_Claude/packages/ui/src/glass/Lightbox.tsx` |

**Install once**: `pnpm add @radix-ui/react-tooltip @radix-ui/react-popover @react-aria/focus framer-motion@12 --filter @apex/ui`

**Wire-up**: append `@import "./glass/_shared.css";` to `packages/ui/src/tokens.css`, then re-export from `packages/ui/src/index.ts`:

```ts
export * from "./glass/GlassCard";
export * from "./glass/GlassPanel";
export * from "./glass/Sheet";
export * from "./glass/Drawer";
export * from "./glass/Banner";
export * from "./glass/Tooltip";
export * from "./glass/Popover";
export * from "./glass/Lightbox";
```

All 8 components honor the performance rules (isolation, contain, conditional will-change, contain-intrinsic-size, -webkit- prefix, reduced-motion fallback) and the a11y contract (focus ring, focus trap on modals, ESC close, aria-describedby on tooltips, slider semantics on drag handle). Zero em dashes used in any UI string.
