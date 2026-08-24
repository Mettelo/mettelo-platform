export type EventRoomErrorCategory=
 |'auth_required'
 |'not_found'
 |'cancelled'
 |'no_permission'
 |'too_early'
 |'session_ended'
 |'provider_not_configured'
 |'service_unavailable'
 |'token_failure'
 |'connection_failure'
 |'unknown';

export type EventRoomFailureStage='token'|'connection';

export type EventRoomDiagnostic={
 eventId:string;
 category:EventRoomErrorCategory;
 stage:EventRoomFailureStage;
 status?:number;
 retryable:boolean;
};

export type EventRoomFailureView=EventRoomDiagnostic&{
 heading:string;
 message:string;
};

const TOKEN_CODE_CATEGORY:Record<string,EventRoomErrorCategory>={
 AUTH_REQUIRED:'auth_required',
 EVENT_NOT_FOUND:'not_found',
 EVENT_CANCELLED:'cancelled',
 NO_PERMISSION:'no_permission',
 TOO_EARLY:'too_early',
 SESSION_ENDED:'session_ended',
 PROVIDER_NOT_CONFIGURED:'provider_not_configured',
 SERVICE_UNAVAILABLE:'service_unavailable',
 TOKEN_ISSUE_FAILED:'token_failure'
};

function viewFor(diagnostic:EventRoomDiagnostic):EventRoomFailureView{
 const base={...diagnostic};
 switch(diagnostic.category){
  case 'auth_required':return {...base,heading:'Sign in to join',message:'Please sign in before joining this session.'};
  case 'not_found':return {...base,heading:'Session not found',message:'This session could not be found.'};
  case 'cancelled':return {...base,heading:'This session has been cancelled',message:'This event is no longer taking place.'};
  case 'no_permission':return {...base,heading:'You don’t have access to this session',message:'Your account is not permitted to join this event.'};
  case 'too_early':return {...base,heading:'Session not open yet',message:'The room opens 15 minutes before the event starts.'};
  case 'session_ended':return {...base,heading:'This session has ended',message:'The room is now closed.'};
  case 'provider_not_configured':return {...base,heading:'Live video is currently unavailable',message:'The live-room provider is not configured for this session.'};
  case 'service_unavailable':return {...base,heading:'Live video is currently unavailable',message:'Mettelo could not prepare the secure room. Please try again later.'};
  case 'token_failure':return {...base,heading:'We couldn’t prepare the room',message:'Mettelo could not create your secure room access. Please try again.'};
  case 'connection_failure':return {...base,heading:'We couldn’t connect to the room',message:'The secure room could not be reached. Check your connection and try again.'};
  default:return {...base,heading:'Something went wrong while joining',message:'We could not complete the room connection. Please try again.'};
 }
}

export function classifyTokenFailure(input:{eventId:string;status?:number;code?:string;message?:string}):EventRoomFailureView{
 const category=(input.code&&TOKEN_CODE_CATEGORY[input.code])||
  (input.status===401?'auth_required':input.status===403?'no_permission':input.status===404?'not_found':input.status===425?'too_early':'unknown');
 const retryable=category==='service_unavailable'||category==='token_failure'||category==='unknown';
 return viewFor({eventId:input.eventId,category,stage:'token',status:input.status,retryable});
}

export function classifyConnectionFailure(eventId:string):EventRoomFailureView{
 return viewFor({eventId,category:'connection_failure',stage:'connection',retryable:true});
}

export function safeEventRoomDiagnostic(failure:EventRoomFailureView):EventRoomDiagnostic{
 return {eventId:failure.eventId,category:failure.category,stage:failure.stage,status:failure.status,retryable:failure.retryable};
}
