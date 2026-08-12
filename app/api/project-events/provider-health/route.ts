import {NextResponse} from 'next/server';
import {RoomServiceClient} from 'livekit-server-sdk';

export const dynamic='force-dynamic';

function validLiveKitUrl(value:string|undefined){
  if(!value)return false;
  try{return ['wss:','https:'].includes(new URL(value).protocol)}catch{return false}
}

export async function GET(){
  const serverUrl=process.env.LIVEKIT_URL;
  const publicUrl=process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey=process.env.LIVEKIT_API_KEY;
  const apiSecret=process.env.LIVEKIT_API_SECRET;
  const configured={
    serverUrl:validLiveKitUrl(serverUrl),
    publicUrl:validLiveKitUrl(publicUrl),
    apiKey:Boolean(apiKey?.trim()),
    apiSecret:Boolean(apiSecret?.trim()),
  };
  const urlMatch=configured.serverUrl&&configured.publicUrl&&serverUrl===publicUrl;
  if(!Object.values(configured).every(Boolean))return NextResponse.json({ready:false,configured,urlMatch,providerReachable:false},{status:503,headers:{'cache-control':'no-store'}});
  try{
    const apiUrl=serverUrl!.replace(/^wss:/,'https:').replace(/^ws:/,'http:');
    const client=new RoomServiceClient(apiUrl,apiKey!,apiSecret!);
    await Promise.race([
      client.listRooms(),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Provider timeout')),5000)),
    ]);
    return NextResponse.json({ready:true,configured,urlMatch,providerReachable:true},{headers:{'cache-control':'no-store'}});
  }catch{
    return NextResponse.json({ready:false,configured,urlMatch,providerReachable:false},{status:503,headers:{'cache-control':'no-store'}});
  }
}
