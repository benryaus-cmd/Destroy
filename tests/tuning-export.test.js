import test from 'node:test';
import assert from 'node:assert/strict';
import {copyTuningJSON,tuningJSON} from '../src/game/tuningExport.js';
const field=()=>({value:'',focus(){this.focused=true;},select(){this.selected=true;},setSelectionRange(a,b){this.range=[a,b];}});
test('copies settings through the clipboard and exposes selected JSON',async()=>{
 const textarea=field();let copied;
 const result=await copyTuningJSON({cameraTurnSmoothness:.5},{textarea,clipboard:{async writeText(s){copied=s;}},document:{}});
 assert.equal(result,true);assert.equal(JSON.parse(copied).settings.cameraTurnSmoothness,.5);assert.equal(textarea.value,copied);assert.deepEqual(textarea.range,[0,copied.length]);
});
test('HTTP clipboard absence uses native copy command with focused selected text',async()=>{
 const textarea=field();let commands=0;
 assert.equal(await copyTuningJSON({shadowDarkness:.55},{textarea,clipboard:null,document:{execCommand(name){commands++;assert.equal(name,'copy');assert.ok(textarea.focused&&textarea.selected);return true;}}}),true);
 assert.equal(commands,1);
});
test('rejected clipboard falls back, and denied copy leaves JSON selected for long press',async()=>{
 const textarea=field();let commands=0;
 assert.equal(await copyTuningJSON({},{textarea,clipboard:{async writeText(){throw Error('denied');}},document:{execCommand(){commands++;return false;}}}),false);
 assert.equal(commands,1);assert.ok(textarea.selected);assert.equal(JSON.parse(textarea.value).version,'monster-conquest-tuning-v1');
});
test('JSON retains the exact numeric tuning snapshot',()=>{
 assert.deepEqual(JSON.parse(tuningJSON({ambientLight:1.75,climbSpeed:6})).settings,{ambientLight:1.75,climbSpeed:6});
});
