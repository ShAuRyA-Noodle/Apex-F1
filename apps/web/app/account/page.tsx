import { redirect } from 'next/navigation';

// /account was a vaporware "sign in / create" page that promised features
// (Supabase Auth, OAuth, account-bound predictions) that are not on the
// Phase 1 roadmap. The page is removed to honour the project's "every
// surface must hit a real live source or be hidden" rule. Anyone landing
// here is redirected to /support so the visit still lands somewhere real.
export default function AccountPage() {
  redirect('/support');
}
