export type NotificationPolicyEvent={event_key:string;product_area:string;urgency:string};

export function isRequiredCommunication(event:NotificationPolicyEvent){
  const key=event.event_key.toLowerCase();
  const area=event.product_area.toLowerCase();
  return event.urgency==='critical'||area.includes('account')||area.includes('auth')||area.includes('security')||/(verification|password|security|account)/.test(key);
}
