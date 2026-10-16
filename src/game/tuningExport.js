export const tuningJSON=settings=>JSON.stringify({version:'monster-conquest-tuning-v1',settings},null,2);
export function selectTuningJSON(textarea,text){
 textarea.value=text;textarea.focus({preventScroll:true});textarea.select();textarea.setSelectionRange?.(0,text.length);
}
export async function copyTuningJSON(settings,{textarea,clipboard=globalThis.navigator?.clipboard,document=globalThis.document}={}){
 const text=tuningJSON(settings);selectTuningJSON(textarea,text);
 try{if(clipboard?.writeText){await clipboard.writeText(text);return true;}}catch{}
 selectTuningJSON(textarea,text);
 try{return document.execCommand?.('copy')===true;}catch{return false;}
}
export function saveTuningJSON(settings){
 const url=URL.createObjectURL(new Blob([tuningJSON(settings)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='monster-rampage-settings.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
