import {calculateMemberReadiness,type MemberReadinessInput,type MemberReadinessProfile} from './member-readiness';

/** @deprecated Capability gates must use calculateMemberReadiness().applicationReadiness. */
export const PROFILE_APPLICATION_READY=85;
/** @deprecated Matching readiness is requirement-based; use calculateMemberReadiness().matchingReadiness. */
export const PROFILE_INTEREST_READY=60;

/**
 * Compatibility facade for older consumers while Phase 1 migrates every capability gate.
 * New code must consume calculateMemberReadiness and its named states directly.
 */
export type ReadinessProfile=MemberReadinessProfile;
export type ReadinessInput=MemberReadinessInput;

export function calculateProfileReadiness(input:ReadinessInput){
  const readiness=calculateMemberReadiness(input);
  return{
    score:readiness.profileCompletion.percentage,
    checks:readiness.profileCompletion.checks.map(item=>({...item,weight:0})),
    missing:readiness.profileCompletion.missing.map(item=>({...item,weight:0})),
    interestReady:readiness.matchingReadiness.ready,
    applicationReady:readiness.applicationReadiness.ready
  };
}
