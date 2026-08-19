import {getPublicPlatformSettings} from '@/components/PlatformSocialLinks';

type Props={variant:'dark'|'light';priority?:boolean};

export default async function PlatformLogo({variant}:Props){
  const settings=await getPublicPlatformSettings();
  const key=variant==='light'?'brand_logo_light_url':'brand_logo_dark_url';
  const fallback=variant==='light'?'/mettelo-logo-light.svg':'/mettelo-logo-dark.svg';
  const src=settings.get(key)?.trim()||fallback;
  // Admin-governed branding may point at an approved HTTPS asset outside Next/Image's
  // compile-time remote allow-list. Keep dimensions explicit to prevent layout shift.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="brandLogo" src={src} alt="Mettelo" width={1630} height={370}/>;
}
