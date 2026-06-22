import { redirect } from 'next/navigation';

// /membership was a "$29 lifetime Apex+" pre-sale page for a subscription
// tier that is not implemented and has no payment backend. Per the project
// no-vaporware rule (any surface must hit a real live source or be
// hidden), the page redirects to /support · the real, free tip jar that
// keeps the platform running today.
export default function MembershipPage() {
  redirect('/support');
}
