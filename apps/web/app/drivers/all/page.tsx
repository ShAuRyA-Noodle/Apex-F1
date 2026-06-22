import { redirect } from 'next/navigation';

// Shell still references /drivers/all (historic / "all drivers" view). The
// current grid already lives at /drivers; the historical archive is
// covered by /drivers/champions. Redirect avoids a 404 while we keep
// labels honest.
export default function AllDriversRedirect(): never {
  redirect('/drivers');
}
