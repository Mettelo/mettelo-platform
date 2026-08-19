type LocalParts={year:number;month:number;day:number;hour:number;minute:number};

function parseLocal(value:string):LocalParts|null{
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if(!match)return null;
  const parts={year:Number(match[1]),month:Number(match[2]),day:Number(match[3]),hour:Number(match[4]),minute:Number(match[5])};
  if(parts.month<1||parts.month>12||parts.day<1||parts.day>31||parts.hour>23||parts.minute>59)return null;
  const check=new Date(Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute));
  if(check.getUTCFullYear()!==parts.year||check.getUTCMonth()+1!==parts.month||check.getUTCDate()!==parts.day)return null;
  return parts;
}

function formatter(timeZone:string){
  try{return new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});}catch{return null;}
}
function partsAt(value:Date,timeZone:string):LocalParts|null{
  const format=formatter(timeZone);if(!format)return null;
  const map=Object.fromEntries(format.formatToParts(value).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  return {year:Number(map.year),month:Number(map.month),day:Number(map.day),hour:Number(map.hour),minute:Number(map.minute)};
}
function partsEpoch(parts:LocalParts){return Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute);}
function same(a:LocalParts,b:LocalParts){return a.year===b.year&&a.month===b.month&&a.day===b.day&&a.hour===b.hour&&a.minute===b.minute;}

export function isValidTimeZone(timeZone:string){return Boolean(formatter(timeZone.trim()));}

/**
 * Convert an HTML datetime-local value in an explicit IANA timezone to UTC.
 * Returns null for invalid/non-existent local wall times (for example a DST gap).
 */
export function zonedLocalToIso(value:string,timeZone:string){
  const desired=parseLocal(value);const zone=timeZone.trim();if(!desired||!zone||!formatter(zone))return null;
  let candidate=partsEpoch(desired);
  for(let attempt=0;attempt<4;attempt++){
    const represented=partsAt(new Date(candidate),zone);if(!represented)return null;
    if(same(represented,desired))return new Date(candidate).toISOString();
    candidate+=partsEpoch(desired)-partsEpoch(represented);
  }
  const finalParts=partsAt(new Date(candidate),zone);
  return finalParts&&same(finalParts,desired)?new Date(candidate).toISOString():null;
}

/** Format a stored UTC instant back into an HTML datetime-local value in a timezone. */
export function isoToZonedLocal(value:string|null|undefined,timeZone:string){
  if(!value)return '';
  const date=new Date(value);const zone=timeZone.trim();if(Number.isNaN(date.getTime())||!zone)return '';
  const parts=partsAt(date,zone);if(!parts)return '';
  return `${String(parts.year).padStart(4,'0')}-${String(parts.month).padStart(2,'0')}-${String(parts.day).padStart(2,'0')}T${String(parts.hour).padStart(2,'0')}:${String(parts.minute).padStart(2,'0')}`;
}

export function formatZonedDateTime(value:string|null|undefined,timeZone:string){
  if(!value)return '';
  const date=new Date(value);if(Number.isNaN(date.getTime()))return '';
  try{return new Intl.DateTimeFormat('en-GB',{timeZone:timeZone.trim(),dateStyle:'medium',timeStyle:'short'}).format(date);}catch{return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(date);}
}
