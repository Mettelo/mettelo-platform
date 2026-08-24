'use client';

import {useCallback,useEffect,useState} from 'react';
import {LiveKitRoom,RoomAudioRenderer,VideoConference} from '@livekit/components-react';
import '@livekit/components-styles';
import {classifyConnectionFailure,classifyTokenFailure,safeEventRoomDiagnostic,type EventRoomFailureView} from '@/lib/event-room-errors';
import styles from './Phase6Events.module.css';

type RoomState={
 token?:string;
 url?:string;
 title?:string;
 failure?:EventRoomFailureView;
};

export default function ProjectVideoRoom({eventId}:{eventId:string}){
 const [state,setState]=useState<RoomState>({});
 const [attempt,setAttempt]=useState(0);

 const retry=useCallback(()=>{
  setState({});
  setAttempt(value=>value+1);
 },[]);

 useEffect(()=>{
  let active=true;
  void fetch(`/api/project-events/${eventId}/token`,{method:'POST'})
   .then(async response=>{
    const body=await response.json().catch(()=>({}));
    if(!response.ok){
     const failure=classifyTokenFailure({eventId,status:response.status,code:body.code,message:body.error});
     console.error('[event-room]',safeEventRoomDiagnostic(failure));
     if(active)setState({failure});
     return;
    }
    if(active)setState({token:body.token,url:body.url,title:body.event?.title});
   })
   .catch(()=>{
    const failure=classifyTokenFailure({eventId,code:'TOKEN_ISSUE_FAILED'});
    console.error('[event-room]',safeEventRoomDiagnostic(failure));
    if(active)setState({failure});
   });
  return()=>{active=false};
 },[eventId,attempt]);

 if(state.failure){
  const {failure}=state;
  return <div className={`${styles.videoState} emptyState`} role={failure.category==='too_early'?'status':'alert'} data-event-room-category={failure.category} data-event-room-stage={failure.stage} data-event-room-status={failure.status??''}>
   <h2>{failure.heading}</h2>
   <p>{failure.message}</p>
   <div className="actions">
    {failure.retryable&&<button className="button" type="button" onClick={retry}>Try again</button>}
    <a className="button ghost" href="/member/events">View upcoming events</a>
   </div>
  </div>;
 }

 if(!state.token||!state.url)return <div className={`${styles.videoState} emptyState`} aria-live="polite"><h2>Preparing your secure room…</h2><p>Mettelo is checking your event permission.</p></div>;

 return <div className={styles.videoRoom} data-lk-theme="default">
  <div className={styles.videoNotice}><strong>{state.title}</strong><span>Recording and transcription are disabled for this phase.</span></div>
  <LiveKitRoom
   key={attempt}
   token={state.token}
   serverUrl={state.url}
   connect
   audio
   video
   onError={()=>{
    const failure=classifyConnectionFailure(eventId);
    console.error('[event-room]',safeEventRoomDiagnostic(failure));
    setState({failure});
   }}
  >
   <VideoConference/>
   <RoomAudioRenderer/>
  </LiveKitRoom>
 </div>;
}
