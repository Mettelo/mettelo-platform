type DateTimeParts={year:number;month:number;day:number;hour:number;minute:number;second:number};

function parseLocalDateTime(value:string):DateTimeParts|null{
 const match=value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
 if(!match)return null;
 const parts={year:Number(match[1]),month:Number(match[2]),day:Number(match[3]),hour:Number(match[4]),minute:Number(match[5]),second:Number(match[6]||0)};
 const check=new Date(Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second));
 if(check.getUTCFullYear()!==parts.year||check.getUTCMonth()+1!==parts.month||check.getUTCDate()!==parts.day||check.getUTCHours()!==parts.hour||check.getUTCMinutes()!==parts.minute||check.getUTCSeconds()!==parts.second)return null;
 return parts;
}

function zonedParts(date:Date,timeZone:string):DateTimeParts|null{
 try{
  const values=new Map(new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(part=>[part.type,part.value]));
  return {year:Number(values.get('year')),month:Number(values.get('month')),day:Number(values.get('day')),hour:Number(values.get('hour')),minute:Number(values.get('minute')),second:Number(values.get('second'))};
 }catch{return null;}
}

function asUtc(parts:DateTimeParts){return Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second)}
function sameParts(left:DateTimeParts,right:DateTimeParts){return left.year===right.year&&left.month===right.month&&left.day===right.day&&left.hour===right.hour&&left.minute===right.minute&&left.second===right.second}

export function zonedLocalDateTimeToUtc(value:string,timeZone:string):Date|null{
 const wanted=parseLocalDateTime(value);
 if(!wanted||!timeZone.trim())return null;
 let instant=asUtc(wanted);
 for(let pass=0;pass<3;pass+=1){
  const actual=zonedParts(new Date(instant),timeZone);
  if(!actual)return null;
  const delta=asUtc(wanted)-asUtc(actual);
  if(delta===0)break;
  instant+=delta;
 }
 const result=new Date(instant);
 const roundTrip=zonedParts(result,timeZone);
 return roundTrip&&sameParts(roundTrip,wanted)?result:null;
}

export function parseEventDateTime(value:string,timeZone:string):Date|null{
 const trimmed=value.trim();
 if(!trimmed)return null;
 if(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)){
  const explicit=new Date(trimmed);
  return Number.isNaN(explicit.valueOf())?null:explicit;
 }
 return zonedLocalDateTimeToUtc(trimmed,timeZone);
}

export function formatIsoForDateTimeLocal(value:string|null|undefined,timeZone:string):string{
 if(!value)return '';
 const date=new Date(value);
 if(Number.isNaN(date.valueOf()))return '';
 const parts=zonedParts(date,timeZone);
 if(!parts)return '';
 const pad=(number:number)=>String(number).padStart(2,'0');
 return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}
