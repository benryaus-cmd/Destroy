export const ARCHETYPES=Object.freeze({
 creator:{name:'Your monster',description:'Your custom creature and balanced stats',modifiers:{}},
 godzilla:{name:'Godzilla',description:'+25% health · +25% smash · +20% power · 10% slower',modifiers:{health:1.25,smash:1.25,power:1.2,speed:.9}},
 kong:{name:'Kong',description:'+35% throws · +40% climbing · +15% speed · 10% less health',modifiers:{throw:1.35,climb:1.4,speed:1.15,health:.9}}
});
export const archetype=id=>ARCHETYPES[id]||ARCHETYPES.creator;
export function selectedArchetype(storage=globalThis.localStorage){try{const id=storage?.getItem('monster-character-trial');return ARCHETYPES[id]?id:'creator';}catch{return 'creator';}}
export function selectArchetype(id,storage=globalThis.localStorage){id=ARCHETYPES[id]?id:'creator';try{storage?.setItem('monster-character-trial',id);}catch{}return id;}
export function combineArchetypeModifiers(base,id){const result={...base};for(const [key,value]of Object.entries(archetype(id).modifiers))result[key]=(result[key]??1)*value;return result;}
