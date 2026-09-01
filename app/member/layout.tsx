import MemberAppShell from '@/components/MemberAppShell';
import MemberPathContextSurface from '@/components/MemberPathContextSurface';

export default function MemberLayout({children}:{children:React.ReactNode}){
  return <MemberAppShell><MemberPathContextSurface/>{children}</MemberAppShell>;
}
