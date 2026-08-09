import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic='force-static';

export async function GET(){
  const source=await readFile(path.join(process.cwd(),'public','founder-o-johnson-taiwo.webp.b64'),'utf8');
  const image=Buffer.from(source.trim(),'base64');
  return new Response(image,{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=31536000, immutable'}});
}
