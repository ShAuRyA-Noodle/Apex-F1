'use client';

import Link, { type LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode, MouseEvent } from 'react';

type Props = LinkProps & {
  children: ReactNode;
  className?: string;
};

/**
 * ViewTransitionLink
 * Wraps next/link. On click, if the browser supports the View Transition API,
 * uses document.startViewTransition to navigate. Otherwise falls back to a
 * normal Next.js router push (default Link behavior).
 *
 * Pair with `view-transition-name: <id>` CSS declarations on hero elements
 * across profile <-> career <-> history pages to morph between them.
 */
export function ViewTransitionLink({ children, className, href, ...rest }: Props) {
  const router = useRouter();

  function handle(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const docAny = typeof document !== 'undefined' ? (document as Document & {
      startViewTransition?: (cb: () => void) => void;
    }) : null;
    if (docAny?.startViewTransition && typeof href === 'string') {
      e.preventDefault();
      docAny.startViewTransition(() => {
        router.push(href);
      });
    }
  }

  return (
    <Link href={href} {...rest} className={className} onClick={handle}>
      {children}
    </Link>
  );
}
