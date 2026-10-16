// Pure local progression. Creator saves (mmr5) and the online leaderboard are separate.
export const CONQUEST_STORAGE_KEY = 'monster-conquest-v1';

export const MUTATIONS = [
  { id: 'crusher-horns', name: 'Crusher horns', description: 'Heavy horns strengthen charge impacts.', cost: 20, unlockXP: 60, unlockLabel: 'Earn 60 XP', config: { horns: 4, hornLen: .9 }, modifiers: { charge: 1.35, smash: 1.12 } },
  { id: 'iron-hide', name: 'Iron hide', description: 'Armored spikes add lasting toughness.', cost: 45, unlockXP: 180, unlockLabel: 'Earn 180 XP', config: { spikes: 7, fat: 1.3 }, modifiers: { health: 1.3 } },
  { id: 'raptor-legs', name: 'Raptor legs', description: 'Extra legs improve speed and trampling.', cost: 70, unlockXP: 360, unlockLabel: 'Earn 360 XP', config: { legs: 4, clawLen: 1.8 }, modifiers: { speed: 1.2, bite: 1.15 } },
  { id: 'storm-wings', name: 'Storm wings', description: 'Charged wings amplify your monster power.', cost: 100, unlockXP: 650, unlockLabel: 'Earn 650 XP', config: { wings: 1.3, tail: 1.6 }, modifiers: { power: 1.4, speed: 1.08 } },
];

const DISTRICTS = [
  { id: 'old-town', name: 'Old Town' },
  { id: 'market', name: 'Market Quarter' },
  { id: 'harbor', name: 'Harbor' },
  { id: 'uptown', name: 'Uptown' },
];
const EVENT_RULES = {
  eat: { field: 'eaten', xp: 12, currency: 3 },
  car: { field: 'cars', xp: 20, currency: 4 },
  building: { field: 'buildings', xp: 80, currency: 12 },
  throw: { field: 'throws', xp: 10, currency: 2 },
  slam: { field: 'slams', xp: 12, currency: 2 },
  charge: { field: 'charges', xp: 8, currency: 1 },
  power: { field: 'powers', xp: 10, currency: 2 },
};
const CHALLENGE_RULES = [
  { key: 'feast', field: 'eaten', name: 'Neighborhood feast', target: 6, reward: 15 },
  { key: 'wreck', field: 'cars', name: 'Traffic breaker', target: 3, reward: 20 },
  { key: 'demolish', field: 'buildings', name: 'Block buster', target: 2, reward: 30 },
  { key: 'throw', field: 'throws', name: 'Flying traffic', target: 3, reward: 20 },
];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = value => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))) : 0;
const safeKey = value => (typeof value === 'string' || typeof value === 'number') && String(value).length > 0 && String(value).length < 200 && !['__proto__', 'prototype', 'constructor'].includes(String(value));
const clone = value => {
  try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
};
const emptyDistrict = () => ({ eaten: 0, cars: 0, buildings: 0, throws: 0, slams: 0, charges: 0, powers: 0, score: 0 });
const seedValue = seed => typeof seed === 'number' && Number.isFinite(seed) ? seed >>> 0 : Math.floor(Math.random() * 4294967296);

export function createConquest(seed = Math.floor(Math.random() * 4294967296)) {
  return {
    version: 1, seed: seedValue(seed), xp: 0, currency: 0,
    unlocked: [], owned: [], equipped: [],
    districts: Object.fromEntries(DISTRICTS.map(district => [district.id, emptyDistrict()])),
    buildings: {}, events: {}, eventSequence: 0, bankedRuns: {}, challengeClaims: [],
    activeRun: null, bests: { score: 0, eaten: 0, destroyed: 0, crushed: 0 },
  };
}

function refreshUnlocks(state) {
  state.unlocked = MUTATIONS.filter(mutation => state.xp >= mutation.unlockXP).map(mutation => mutation.id);
}

function sanitizeMap(value, transform) {
  if (!object(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key]) => safeKey(key)).map(([key, entry]) => [key, transform(entry)]).filter(([, entry]) => entry !== undefined));
}

function sanitize(raw) {
  if (!object(raw) || raw.version !== 1) return createConquest();
  const state = createConquest(raw.seed);
  state.xp = count(raw.xp);
  state.currency = count(raw.currency);
  refreshUnlocks(state);
  const known = ids => Array.isArray(ids) ? [...new Set(ids.filter(id => state.unlocked.includes(id)))] : [];
  state.owned = known(raw.owned);
  state.equipped = known(raw.equipped).filter(id => state.owned.includes(id)).slice(0, 1);
  for (const district of DISTRICTS) {
    const record = object(raw.districts) && object(raw.districts[district.id]) ? raw.districts[district.id] : {};
    for (const field of Object.keys(state.districts[district.id])) state.districts[district.id][field] = count(record[field]);
  }
  state.buildings = sanitizeMap(raw.buildings, value => object(value) ? clone(value) : undefined);
  state.events = sanitizeMap(raw.events, value => value === true ? true : undefined);
  state.eventSequence = count(raw.eventSequence);
  state.bankedRuns = sanitizeMap(raw.bankedRuns, value => value === true ? true : undefined);
  state.challengeClaims = Array.isArray(raw.challengeClaims) ? [...new Set(raw.challengeClaims.filter(id => getChallenges(state).some(challenge => challenge.id === id)))] : [];
  for (const field of Object.keys(state.bests)) state.bests[field] = count(raw.bests?.[field]);
  state.activeRun = object(raw.activeRun) ? clone(raw.activeRun) : null;
  return state;
}

function storageOrDefault(storage) {
  try { return storage ?? globalThis.localStorage; } catch { return null; }
}

export function readConquest(storage) {
  try {
    const raw = storageOrDefault(storage)?.getItem(CONQUEST_STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : createConquest();
  } catch { return createConquest(); }
}

export function writeConquest(state, storage) {
  try {
    const target = storageOrDefault(storage);
    if (!target?.setItem) return false;
    const saved = sanitize(state);
    // Local records are lifetime records, including when a fresh conquest is saved.
    try {
      const previous = JSON.parse(target.getItem?.(CONQUEST_STORAGE_KEY) ?? 'null');
      if (previous?.version === 1) {
        for (const field of Object.keys(saved.bests)) saved.bests[field] = Math.max(saved.bests[field], count(previous.bests?.[field]));
      }
    } catch { /* A corrupt old save must not prevent a valid new save. */ }
    target.setItem(CONQUEST_STORAGE_KEY, JSON.stringify(saved));
    return true;
  } catch { return false; }
}

export function growthFor(eaten, totalXP = 0) {
  const points = count(eaten) + Math.min(20, Math.floor(count(totalXP) / 100));
  const thresholds = [0, 6, 18, 40];
  const names = ['Hatchling', 'Ravager', 'Behemoth', 'Titan'];
  let stage = 0;
  for (let index = 1; index < thresholds.length; index++) if (points >= thresholds[index]) stage = index;
  return { scale: 1 + Math.min(.85, points * .02125), stage, name: names[stage], next: thresholds[stage + 1] ?? null };
}

export function districtAt(x = 0, z = 0) {
  return { ...DISTRICTS[(Number.isFinite(z) && z >= 0 ? 2 : 0) + (Number.isFinite(x) && x >= 0 ? 1 : 0)] };
}

export function getChallenges(state) {
  return DISTRICTS.flatMap(district => CHALLENGE_RULES.map(rule => {
    const id = `${district.id}:${rule.key}`;
    const progress = count(state.districts?.[district.id]?.[rule.field]);
    return { id, district: district.id, name: rule.name, description: `${rule.target} ${rule.field} in ${district.name}`, progress, target: rule.target, reward: rule.reward, complete: progress >= rule.target, claimed: state.challengeClaims?.includes(id) ?? false };
  }));
}

export function recordEvent(state, event = {}) {
  if (!object(state) || !object(event) || !own(EVENT_RULES, event.type)) return { ok: false, reason: 'Invalid event' };
  if (event.id != null && !safeKey(event.id)) return { ok: false, reason: 'Invalid event ID' };
  const id = event.id == null ? `${event.type}:auto-${state.eventSequence + 1}` : `${event.type}:${event.id}`;
  if (own(state.events, id)) return { ok: true, duplicate: true, xp: 0, currency: 0 };
  state.events[id] = true;
  state.eventSequence += 1;
  const rule = EVENT_RULES[event.type];
  const district = districtAt(event.x, event.z);
  state.districts[district.id][rule.field] += 1;
  state.districts[district.id].score += count(event.score);
  state.xp += rule.xp;
  state.currency += rule.currency;
  const challenges = getChallenges(state).filter(challenge => challenge.complete && !challenge.claimed);
  const bonus = challenges.reduce((total, challenge) => total + challenge.reward, 0);
  state.challengeClaims.push(...challenges.map(challenge => challenge.id));
  state.currency += bonus;
  refreshUnlocks(state);
  return { ok: true, duplicate: false, id, district: district.id, xp: rule.xp, currency: rule.currency + bonus, challenges: challenges.map(challenge => challenge.id) };
}

export function bankRun(state, run = {}) {
  if (!object(state) || !object(run) || !safeKey(run.id)) return { ok: false, reason: 'A stable run ID is required' };
  const id = String(run.id);
  if (own(state.bankedRuns, id)) return { ok: true, duplicate: true, xp: 0, currency: 0 };
  state.bankedRuns[id] = true;
  const score = count(run.score);
  const xp = Math.floor(score / 50);
  const currency = Math.floor(score / 100);
  state.xp += xp;
  state.currency += currency;
  for (const field of Object.keys(state.bests)) state.bests[field] = Math.max(state.bests[field], count(run[field]));
  if (String(state.activeRun?.id) === id) state.activeRun = null;
  refreshUnlocks(state);
  return { ok: true, duplicate: false, xp, currency };
}

export function equipMutation(state, id) {
  const mutation = MUTATIONS.find(item => item.id === id);
  if (!mutation || !state.unlocked.includes(id)) return { ok: false, reason: 'Mutation is locked' };
  if (!state.owned.includes(id)) {
    if (state.currency < mutation.cost) return { ok: false, reason: 'Not enough mutation credits' };
    state.currency -= mutation.cost;
    state.owned.push(id);
  }
  state.equipped = [id];
  return { ok: true, mutation };
}

export function getModifiers(state) {
  const result = { health: 1, speed: 1, smash: 1, bite: 1, charge: 1, power: 1 };
  for (const id of state.equipped ?? []) {
    const mutation = MUTATIONS.find(item => item.id === id);
    if (!mutation || !state.owned?.includes(id) || !state.unlocked?.includes(id)) continue;
    for (const [field, value] of Object.entries(mutation.modifiers)) result[field] *= value;
  }
  return result;
}

export function snapshotRun(state, data) {
  state.activeRun = object(data) ? clone(data) : null;
  return resumeRun(state);
}

export function resumeRun(state) {
  return object(state.activeRun) ? clone(state.activeRun) : null;
}
