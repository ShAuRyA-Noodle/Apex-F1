import { redirect } from 'next/navigation';

// "Hall of Fame" link in the shell predates the Champions page; we redirect
// to /drivers/champions which carries the same intent (every World Drivers
// Champion) and is the only honest source we can cite from Jolpica today.
export default function HallOfFameRedirect(): never {
  redirect('/drivers/champions');
}
