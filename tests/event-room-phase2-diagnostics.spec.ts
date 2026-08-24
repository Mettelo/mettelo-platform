import {expect,test} from '@playwright/test';
import {classifyConnectionFailure,classifyTokenFailure,safeEventRoomDiagnostic} from '../lib/event-room-errors';

const eventId='00000000-0000-4000-8000-00000000e299';

const cases=[
 {code:'TOO_EARLY',status:425,category:'too_early',heading:'Session not open yet',retryable:false},
 {code:'SESSION_ENDED',status:410,category:'session_ended',heading:'This session has ended',retryable:false},
 {code:'EVENT_CANCELLED',status:410,category:'cancelled',heading:'This session has been cancelled',retryable:false},
 {code:'NO_PERMISSION',status:403,category:'no_permission',heading:'You don’t have access to this session',retryable:false},
 {code:'PROVIDER_NOT_CONFIGURED',status:503,category:'provider_not_configured',heading:'Live video is currently unavailable',retryable:false},
 {code:'SERVICE_UNAVAILABLE',status:503,category:'service_unavailable',heading:'Live video is currently unavailable',retryable:true},
 {code:'TOKEN_ISSUE_FAILED',status:502,category:'token_failure',heading:'We couldn’t prepare the room',retryable:true}
] as const;

for(const item of cases){
 test(`${item.code} maps to the correct user state and retry rule`,()=>{
  const failure=classifyTokenFailure({eventId,status:item.status,code:item.code});
  expect(failure.category).toBe(item.category);
  expect(failure.heading).toBe(item.heading);
  expect(failure.retryable).toBe(item.retryable);
  expect(failure.stage).toBe('token');
  expect(failure.eventId).toBe(eventId);
 });
}

test('network/LiveKit connection failure is distinct and retryable',()=>{
 const failure=classifyConnectionFailure(eventId);
 expect(failure).toMatchObject({eventId,category:'connection_failure',stage:'connection',retryable:true,heading:'We couldn’t connect to the room'});
});

test('unknown token failure uses a safe retryable fallback',()=>{
 const failure=classifyTokenFailure({eventId,status:500,code:'UNEXPECTED_INTERNAL'});
 expect(failure).toMatchObject({category:'unknown',stage:'token',retryable:true,heading:'Something went wrong while joining'});
});

test('safe diagnostics contain only the approved non-sensitive fields',()=>{
 const secretMarker='phase2-provider-secret-value';
 const tokenMarker='eyJhbGciOiJIUzI1NiJ9.phase2.payload';
 const failure=classifyTokenFailure({eventId,status:502,code:'TOKEN_ISSUE_FAILED',message:`${secretMarker} ${tokenMarker} wss://private-provider.invalid`});
 const diagnostic=safeEventRoomDiagnostic(failure);
 expect(diagnostic).toEqual({eventId,category:'token_failure',stage:'token',status:502,retryable:true});
 const serialized=JSON.stringify(diagnostic);
 for(const forbidden of [secretMarker,tokenMarker,'wss://private-provider.invalid','LIVEKIT_API_SECRET','LIVEKIT_API_KEY'])expect(serialized).not.toContain(forbidden);
});
