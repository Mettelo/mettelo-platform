import {expect,test} from '@playwright/test';
import {formatIsoForDateTimeLocal,parseEventDateTime,zonedLocalDateTimeToUtc} from '../lib/event-time';

test.describe('event source timezone contract',()=>{
 test('Europe/London summer wall time is persisted as the correct UTC instant',()=>{
  const instant=zonedLocalDateTimeToUtc('2026-08-25T07:20','Europe/London');
  expect(instant?.toISOString()).toBe('2026-08-25T06:20:00.000Z');
  expect(formatIsoForDateTimeLocal(instant?.toISOString(),'Europe/London')).toBe('2026-08-25T07:20');
 });

 test('Europe/London winter wall time remains GMT',()=>{
  const instant=zonedLocalDateTimeToUtc('2026-12-15T07:20','Europe/London');
  expect(instant?.toISOString()).toBe('2026-12-15T07:20:00.000Z');
  expect(formatIsoForDateTimeLocal(instant?.toISOString(),'Europe/London')).toBe('2026-12-15T07:20');
 });

 test('explicit UTC API timestamps stay explicit and invalid wall times are rejected',()=>{
  expect(parseEventDateTime('2026-08-25T06:20:00.000Z','Europe/London')?.toISOString()).toBe('2026-08-25T06:20:00.000Z');
  expect(parseEventDateTime('2026-08-25T07:20','Not/A_Timezone')).toBeNull();
  expect(zonedLocalDateTimeToUtc('2026-03-29T01:30','Europe/London')).toBeNull();
 });
});
