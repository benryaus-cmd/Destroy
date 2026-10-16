// Permanent run rewards are separate from the legacy conquest save.
export const RUN_PROGRESS_STORAGE_KEY = 'monster-rampage-progression-v1';
export const UPGRADES = Object.freeze([
  { id: 'health', name: 'Titan hide', description: 'Start each run with 12% more maximum health per level.', baseCost: 8, maxLevel: 10 },
  { id: 'bite', name: 'Savage bite', description: 'Increase feeding reach by 12% per level.', baseCost: 6, maxLevel: 10 },
  { id: 'smash', name: 'Seismic smash', description: 'Smash for 12% more damage per level.', baseCost: 8, maxLevel: 10 },
  { id: 'throw', name: 'Heavy throw', description: 'Thrown objects deal 12% more damage per level.', baseCost: 6, maxLevel: 10 },
  { id: 'heal', name: 'Rapid recovery', description: 'Eating restores 12% more health per level.', baseCost: 7, maxLevel: 10 },
].map(Object.freeze));

const fields = ['score', 'eaten', 'destroyed', 'crushed'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const count = value => typeof value === 'number' && Number.isFinite(value) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))) : 0;
const safeId = id => (typeof id === 'string' || typeof id === 'number') && String(id).trim().length > 0 && String(id).length < 200 && !['__proto__', 'constructor', 'prototype'].includes(String(id));
const empty = () => ({ version: 1, points: 0, upgrades: {}, bests: { score: 0, eaten: 0, destroyed: 0, crushed: 0 }, bankedRuns: {}, lastRun: null });
const runRecord = run => ({ id: String(run.id), ...Object.fromEntries(fields.map(field => [field, count(run[field])])), pointsEarned: count(run.pointsEarned) });

function sanitize(raw) {
  const state = empty();
  if (!object(raw) || raw.version !== 1) return state;
  state.points = count(raw.points);
  for (const upgrade of UPGRADES) {
    const level = object(raw.upgrades) && own(raw.upgrades, upgrade.id) ? Math.min(upgrade.maxLevel, count(raw.upgrades[upgrade.id])) : 0;
    if (level) state.upgrades[upgrade.id] = level;
  }
  for (const field of fields) state.bests[field] = count(object(raw.bests) ? raw.bests[field] : 0);
  if (object(raw.bankedRuns)) for (const [id, banked] of Object.entries(raw.bankedRuns)) {
    if (safeId(id) && banked === true) state.bankedRuns[id] = true;
  }
  if (object(raw.lastRun) && safeId(raw.lastRun.id)) state.lastRun = runRecord(raw.lastRun);
  return state;
}

function storageOrDefault(storage) {
  try { return storage ?? globalThis.localStorage; } catch { return null; }
}

export function readRunProgress(storage) {
  try {
    const raw = storageOrDefault(storage)?.getItem(RUN_PROGRESS_STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : empty();
  } catch { return empty(); }
}

// Returns the normalized snapshot even when browser storage is unavailable.
export function writeRunProgress(state, storage) {
  const saved = sanitize(state);
  try { storageOrDefault(storage)?.setItem(RUN_PROGRESS_STORAGE_KEY, JSON.stringify(saved)); } catch { /* Keep play available when storage is blocked or full. */ }
  return saved;
}

export function upgradeCost(state, id) {
  const upgrade = UPGRADES.find(candidate => candidate.id === id);
  if (!upgrade) return null;
  const level = sanitize(state).upgrades[id] ?? 0;
  return level >= upgrade.maxLevel ? null : upgrade.baseCost * (level + 1);
}

export function purchaseUpgrade(state, id) {
  const next = sanitize(state);
  const cost = upgradeCost(next, id);
  if (cost === null || next.points < cost) return next;
  next.points -= cost;
  next.upgrades[id] = (next.upgrades[id] ?? 0) + 1;
  return next;
}

export function upgradeModifiers(state) {
  const { upgrades } = sanitize(state);
  return Object.fromEntries(UPGRADES.map(({ id }) => [id, 1 + .12 * (upgrades[id] ?? 0)]));
}

export function settleRun(state, run) {
  const next = sanitize(state);
  if (!object(run) || !safeId(run.id) || own(next.bankedRuns, String(run.id))) return next;
  const record = runRecord(run);
  record.pointsEarned = Math.floor(record.score / 100);
  next.points = count(next.points + record.pointsEarned);
  next.bankedRuns[record.id] = true;
  for (const field of fields) next.bests[field] = Math.max(next.bests[field], record[field]);
  next.lastRun = record;
  return next;
}
