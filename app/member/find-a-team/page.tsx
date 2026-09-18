import {redirect} from 'next/navigation';

export default async function LegacyFindATeamPage(){
  redirect('/member/collaboration?view=teams');
}
