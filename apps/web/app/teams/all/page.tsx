import { redirect } from 'next/navigation';

export default function AllTeamsRedirect(): never {
  redirect('/teams');
}
