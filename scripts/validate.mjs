import { readFile,stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const file of ['app.js','audio.js','physics.js','profiles.js','surface.js','catalog.js','shop-models.js']){
  const result=spawnSync(process.execPath,['--check',path.join(root,'dist',file)],{encoding:'utf8'});
  if(result.status!==0)throw new Error(result.stderr);
}
for(const file of ['index.html','style.css','favicon.svg','vendor/three.module.js','vendor/three.core.js','vendor/LICENSE','audio/foam.wav','audio/rubber.wav','audio/squelch.wav']){
  if(!(await stat(path.join(root,'dist',file))).size)throw new Error('Empty asset: '+file);
}
for(const name of ['foam','rubber','squelch']){
  const data=await readFile(path.join(root,'dist/audio',name+'.wav'));
  if(data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WAVE')throw new Error('Invalid audio: '+name);
}
const config=JSON.parse(await readFile(path.join(root,'vercel.json'),'utf8'));
if(config.outputDirectory!=='dist')throw new Error('Unexpected Vercel output directory');
console.log('Build verified: standalone static app, seven JS modules, vendored Three.js, three Foley recordings. Output: dist/');
