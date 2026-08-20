import {expect,test} from '@playwright/test';
import {memberProjectCatalogueAction,memberProjectPrimaryAction,resolveMemberProjectState} from '../lib/member-project-journey';

const open={status:'open',project_type:'open',applications_open:true,application_deadline:'2099-01-01T00:00:00.000Z'};
const base={project:open,applicationReady:true,hasAvailableRole:true,roleAvailabilityKnown:true,now:new Date('2026-08-19T12:00:00Z').getTime()};

test('member project resolver implements the release-blocking CTA matrix',()=>{
  expect(resolveMemberProjectState(base)).toBe('open_eligible');
  expect(resolveMemberProjectState({...base,application:{id:'a',status:'submitted'}})).toBe('application_submitted');
  expect(resolveMemberProjectState({...base,application:{id:'a',status:'action_required'}})).toBe('application_action_required');
  expect(resolveMemberProjectState({...base,application:{id:'a',status:'in_review'}})).toBe('application_in_review');
  expect(resolveMemberProjectState({...base,application:{id:'a',status:'waiting_for_team'}})).toBe('team_forming');
  expect(resolveMemberProjectState({...base,membership:{membership_status:'waiting'},run:{status:'forming'}})).toBe('confirmed');
  expect(resolveMemberProjectState({...base,membership:{membership_status:'active'},run:{status:'active'}})).toBe('active');
  expect(resolveMemberProjectState({...base,membership:{membership_status:'completed'},run:{status:'completed'}})).toBe('completed');
  expect(resolveMemberProjectState({...base,project:{...open,applications_open:false}})).toBe('closed');
  expect(resolveMemberProjectState({...base,applicationReady:false})).toBe('ineligible');
  expect(resolveMemberProjectState({...base,project:{...open,status:'cancelled'}})).toBe('cancelled');
});

test('resolver hands lifecycle ownership to the correct destination',()=>{
  expect(memberProjectPrimaryAction('open_eligible','p1')).toEqual({label:'Apply to this project',href:'/member/discover/p1/apply'});
  for(const state of ['application_submitted','application_action_required','application_in_review','team_forming'] as const)expect(memberProjectPrimaryAction(state,'p1')).toEqual({label:'View application',href:'/member/applications'});
  for(const state of ['confirmed','active'] as const)expect(memberProjectPrimaryAction(state,'p1')).toEqual({label:'Open in Projects',href:'/member/projects'});
  expect(memberProjectPrimaryAction('completed','p1')).toEqual({label:'View in Projects',href:'/member/projects?state=completed'});
  for(const state of ['closed','ineligible','cancelled'] as const)expect(memberProjectPrimaryAction(state,'p1')).toBeNull();
  expect(memberProjectCatalogueAction('open_eligible','p1')).toEqual({label:'View project',href:'/member/discover/p1'});
  expect(memberProjectCatalogueAction('application_in_review','p1')).toEqual({label:'View application',href:'/member/applications'});
  expect(memberProjectCatalogueAction('active','p1')).toEqual({label:'Open in Projects',href:'/member/projects'});
});
