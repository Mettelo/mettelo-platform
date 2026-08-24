'use client';

import {useEffect,useState} from 'react';
import {LiveKitRoom,RoomAudioRenderer,VideoConference} from '@livekit/components-react';
import '@livekit/components-styles';
import styles from './Phase6Events.module.css';

type RoomState={
 token?:string;
 url?:string;
 title?:string;
 error?:string;
 status?:number;
};

export default function ProjectVideoRoom({eventId}:{eventId:string}){
 const [state,setState]=useState<RoomState>({});
 useEffect(()=>{
  let active=true;
  void fetch(`/api/project-events/${eventId}/token`,{method:'POST'})
   .then(async response=>{
    const body=await response.json();
    if(!response.ok){
     if(active)setState({error:body.error||'Unable to join this event.',status:response.status});
     return;
    }
    if(active)setState({token:body.token,url:body.url,title:body.event?.title});
   })
   .catch(error=>{
    if(active)setState({error:error instanceof Error?error.message:'Unable to join this event.'});
   });
  return()=>{active=false};
 },[eventId]);

 if(state.status===425)return <div className={`${styles.videoState} emptyState`} aria-live="polite"><h2>Session not open yet</h2><p>{state.error||'The room opens 15 minutes before the event starts.'}</p><a className="button ghost" href="/member/events">View upcoming events</a></div>;
 if(state.error)return <div className={`${styles.videoState} emptyState`} role="alert"><h2>Room unavailable</h2><p>{state.error}</p><a className="button ghost" href="/member/events">View upcoming events</a></div>;
 if(!state.token||!state.url)return <div className={`${styles.videoState} emptyState`} aria-live="polite"><h2>Preparing your secure room…</h2><p>Mettelo is checking your event permission.</p></div>;
 return <div className={styles.videoRoom} data-lk-theme="default"><div className={styles.videoNotice}><strong>{state.title}</strong><span>Recording and transcription are disabled for this phase.</span></div><LiveKitRoom token={state.token} serverUrl={state.url} connect audio video><VideoConference/><RoomAudioRenderer/></LiveKitRoom></div>
}
