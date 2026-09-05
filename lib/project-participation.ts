export const projectParticipationModes=['solo','team','flexible'] as const;
export type ProjectParticipationMode=(typeof projectParticipationModes)[number];

export type ProjectParticipation={
  participation_mode:ProjectParticipationMode;
  min_team_size:number;
  target_team_size:number;
  max_team_size:number;
  team_size_threshold:number;
};

function boundedInteger(value:unknown,fallback:number){
  const parsed=Number(value);
  return Number.isFinite(parsed)?Math.max(1,Math.min(50,Math.floor(parsed))):fallback;
}

/**
 * Parse the canonical participation contract.
 *
 * Missing legacy mode may be mapped from the historical threshold because that
 * mapping is deterministic (threshold 1 => solo, otherwise team). An explicit
 * unknown mode is never guessed: malformed/ambiguous configuration must be
 * corrected by an Admin or migration review before it enters the lifecycle.
 */
export function parseProjectParticipation(input:Record<string,unknown>):ProjectParticipation{
  const legacy=boundedInteger(input.team_size_threshold,5);
  const suppliedMode=input.participation_mode;
  const rawMode=String(suppliedMode??'').trim().toLowerCase();
  const hasExplicitMode=suppliedMode!==null&&suppliedMode!==undefined&&rawMode!=='';
  if(hasExplicitMode&&!(projectParticipationModes as readonly string[]).includes(rawMode)){
    throw new Error('INVALID_PARTICIPATION_MODE');
  }
  const mode=hasExplicitMode
    ? rawMode as ProjectParticipationMode
    : legacy===1?'solo':'team';

  if(mode==='solo')return{participation_mode:'solo',min_team_size:1,target_team_size:1,max_team_size:1,team_size_threshold:1};

  // Flexible keeps a real collaborative minimum. Solo/Either preference resolves
  // to an effective threshold of one at runtime; Team preference uses this value.
  const min=boundedInteger(input.min_team_size,legacy);
  const target=boundedInteger(input.target_team_size,Math.max(min,legacy));
  const max=boundedInteger(input.max_team_size,Math.max(target,legacy));
  return{participation_mode:mode,min_team_size:min,target_team_size:target,max_team_size:max,team_size_threshold:min};
}

export function validateProjectParticipation(value:ProjectParticipation){
  if(value.min_team_size<1||value.target_team_size<1||value.max_team_size<1){
    return 'Team capacity values must be positive.';
  }
  if(value.min_team_size>value.target_team_size||value.target_team_size>value.max_team_size){
    return 'Team capacity must follow minimum ≤ target ≤ maximum.';
  }
  if(value.participation_mode==='team'&&value.min_team_size<2){
    return 'Team projects require a minimum team size of at least 2.';
  }
  if(value.participation_mode==='solo'&&(value.min_team_size!==1||value.target_team_size!==1||value.max_team_size!==1)){
    return 'Solo projects use one participant for minimum, target, and maximum.';
  }
  return null;
}

export function projectParticipationLabel(value:Pick<ProjectParticipation,'participation_mode'|'min_team_size'|'target_team_size'|'max_team_size'>){
  if(value.participation_mode==='solo')return 'Solo · 1 participant';
  const mode=value.participation_mode==='flexible'?'Flexible':'Team';
  return `${mode} · min ${value.min_team_size} · target ${value.target_team_size} · max ${value.max_team_size}`;
}