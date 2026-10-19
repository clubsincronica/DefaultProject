import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {gunzipSync, gzipSync} from 'node:zlib';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=dirname(fileURLToPath(import.meta.url));
const ROOT=resolve(HERE, 'cancionero-rojo');
let xml=gunzipSync(readFileSync(resolve(ROOT,'ableton/template.als'))).toString('utf8');
// find first midi and audio track and inject one clip each at scene 0
// Simplified: use the builder's inject functions
import {readFileSync as rfs} from 'node:fs';
import {gunzipSync as gz} from 'node:zlib';
import {inventory} from './cancionero-rojo/scripts/inspect-als.js';
// For minimal, just copy template and add one midi clip via builder
import {execSync} from 'node:child_process';
console.log('building minimal via build.js with --only 1 scene');
// Create a minimal structure
const minimal={
  slug:"je-veux-minimal",
  title:"Je Veux Minimal",
  artist:"Test",
  key:"Am",
  tempo:98,
  timeSig:"4/4",
  scenes:[{name:"Intro",bars:4}],
  arrangement:["Intro"],
  parts:{midi:["keys"],audio:["strings"]}
};
mkdirSync(resolve(ROOT,'songs/je-veux-minimal'),{recursive:true});
writeFileSync(resolve(ROOT,'songs/je-veux-minimal/structure.json'), JSON.stringify(minimal,null,2));
writeFileSync(resolve(ROOT,'songs/je-veux-minimal/chords.json'), JSON.stringify({Intro:["Am"]},null,2));
// need orca grids and patterns for Intro
import {mkdirSync as mk} from 'node:fs';
mk(resolve(ROOT,'songs/je-veux-minimal/orca'),{recursive:true});
mk(resolve(ROOT,'songs/je-veux-minimal/patterns'),{recursive:true});
mk(resolve(ROOT,'songs/je-veux-minimal/clips'),{recursive:true});
mk(resolve(ROOT,'songs/je-veux-minimal/stems'),{recursive:true});
// copy one grid from je-veux
import {copyFileSync} from 'node:fs';
try{ copyFileSync(resolve(ROOT,'songs/je-veux/orca/keys--Intro.grid'), resolve(ROOT,'songs/je-veux-minimal/orca/keys--Intro.grid')); }catch{}
try{ copyFileSync(resolve(ROOT,'songs/je-veux/orca/strings--Intro.grid'), resolve(ROOT,'songs/je-veux-minimal/orca/strings--Intro.grid')); }catch{}
// dummy pattern for strings (use existing)
try{ copyFileSync(resolve(ROOT,'songs/je-veux/patterns/strings.js'), resolve(ROOT,'songs/je-veux-minimal/patterns/strings.js')); }catch{}
try{ copyFileSync(resolve(ROOT,'songs/je-veux/patterns/texture.js'), resolve(ROOT,'songs/je-veux-minimal/patterns/texture.js')); }catch{}
console.log('minimal structure created');
