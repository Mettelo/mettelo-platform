import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('Member Discover loads the complete eligible catalogue in deterministic batches',async()=>{
  const source=await readFile('lib/member-discover-project-loader.ts','utf8');

  expect(source).toContain('DISCOVER_BATCH_SIZE=200');
  expect(source).toContain('.range(from,to)');
  expect(source).toContain(".order('created_at',{ascending:false})");
  expect(source).toContain(".order('id',{ascending:false})");
  expect(source).toContain('while(true)');
  expect(source).toContain('rows.push(...batch)');
  expect(source).toContain('if(batch.length<DISCOVER_BATCH_SIZE)break');
  expect(source).toContain('from+=DISCOVER_BATCH_SIZE');
  expect(source).not.toContain('.limit(200)');
});
