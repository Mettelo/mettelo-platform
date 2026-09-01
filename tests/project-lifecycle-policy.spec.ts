import {expect,test} from '@playwright/test';
import {assertLifecycleShape,lifecyclePatch,projectAcceptsApplications,publicationReadiness} from '../lib/project-lifecycle-policy';

const openBase={project_type:'open' as const,status:'draft',visibility:'private',applications_open:false,partner_name:null,title:'Test project',summary:'Useful project summary',problem_statement:'A real problem statement',team_size_threshold:5};

test('safe draft never accepts applications',()=>{
  expect(projectAcceptsApplications(openBase)).toBe(false);
  expect(()=>assertLifecycleShape(openBase)).not.toThrow();
});

test('publish pilot is public and can accept applications',()=>{
  const pilot={...openBase,...lifecyclePatch(openBase,'publish_pilot')};
  expect(pilot).toMatchObject({status:'pilot',visibility:'public',applications_open:true});
  expect(projectAcceptsApplications(pilot)).toBe(true);
  expect(()=>assertLifecycleShape(pilot)).not.toThrow();
});

test('open publish is continuous and application-ready',()=>{
  const published={...openBase,...lifecyclePatch(openBase,'publish_open')};
  expect(projectAcceptsApplications(published)).toBe(true);
  expect(publicationReadiness(openBase,1)).toEqual({ready:true,missing:[]});
});

test('invalid lifecycle combinations fail closed',()=>{
  expect(()=>assertLifecycleShape({...openBase,visibility:'public',applications_open:true})).toThrow();
  expect(()=>assertLifecycleShape({...openBase,status:'archived',visibility:'private',applications_open:true})).toThrow();
  expect(()=>lifecyclePatch({...openBase,project_type:'partner'},'publish_open')).toThrow();
});

test('partner publication requires partner identity',()=>{
  expect(publicationReadiness({...openBase,project_type:'partner'},1).ready).toBe(false);
  expect(()=>assertLifecycleShape({...openBase,project_type:'partner'})).toThrow();
});
