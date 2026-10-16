import test from 'node:test';
import assert from 'node:assert/strict';
import * as progress from '../src/game/runProgress.js';

const memoryStorage = () => {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) };
};

test('new saves start small with no earned power or points', () => {
  const state = progress.readRunProgress(memoryStorage());
  assert.deepEqual(state, { version: 1, points: 0, upgrades: {}, bests: { score: 0, eaten: 0, destroyed: 0, crushed: 0 }, bankedRuns: {}, lastRun: null });
  assert.deepEqual(progress.upgradeModifiers(state), { health: 1, bite: 1, smash: 1, throw: 1, heal: 1 });
});

test('settlement awards score points once per stable run ID, persists, and keeps best records', () => {
  const initial = progress.readRunProgress(memoryStorage());
  const run = { id: 'run-1', score: 1250, eaten: 5, destroyed: 3, crushed: 8 };
  const banked = progress.settleRun(initial, run);
  assert.equal(initial.points, 0);
  assert.equal(banked.points, 12);
  assert.equal(banked.lastRun.pointsEarned, 12);
  assert.deepEqual(banked.bests, { score: 1250, eaten: 5, destroyed: 3, crushed: 8 });
  const storage = memoryStorage();
  assert.deepEqual(progress.writeRunProgress(banked, storage), banked);
  assert.deepEqual(progress.settleRun(progress.readRunProgress(storage), run), banked);
  const next = progress.settleRun(banked, { id: 'run-2', score: 0, eaten: 1 });
  assert.equal(next.points, 12);
  assert.equal(next.lastRun.pointsEarned, 0);
  assert.deepEqual(next.bests, banked.bests);
});

test('permanent upgrades spend points, increase in cost, cap levels, and never change starting size', () => {
  const initial = { ...progress.readRunProgress(memoryStorage()), points: 10000 };
  assert.equal(progress.UPGRADES.length, 5);
  for (const upgrade of progress.UPGRADES) {
    const cost = progress.upgradeCost(initial, upgrade.id);
    const purchased = progress.purchaseUpgrade(initial, upgrade.id);
    assert.equal(purchased.points, initial.points - cost);
    assert.equal(purchased.upgrades[upgrade.id], 1);
    assert.ok(progress.upgradeCost(purchased, upgrade.id) > cost);
    assert.ok(progress.upgradeModifiers(purchased)[upgrade.id] > 1);
    const capped = { ...initial, upgrades: { [upgrade.id]: upgrade.maxLevel } };
    assert.equal(progress.upgradeCost(capped, upgrade.id), null);
    assert.deepEqual(progress.purchaseUpgrade(capped, upgrade.id), capped);
  }
  assert.equal(initial.upgrades.health, undefined);
  assert.equal(progress.upgradeModifiers(initial).size, undefined);
  const broke = progress.readRunProgress(memoryStorage());
  assert.deepEqual(progress.purchaseUpgrade(broke, 'health'), broke);
  assert.deepEqual(progress.purchaseUpgrade(initial, '__proto__'), initial);
});

test('corrupt storage and unsafe values cannot grant invalid points or pollute prototypes', () => {
  const storage = memoryStorage();
  storage.setItem(progress.RUN_PROGRESS_STORAGE_KEY, '{bad');
  assert.equal(progress.readRunProgress(storage).points, 0);
  storage.setItem(progress.RUN_PROGRESS_STORAGE_KEY, JSON.stringify({version: 1, points: -5, upgrades: {health: 999, bite: -2, unknown: 10}, bankedRuns: JSON.parse('{"__proto__":true,"constructor":true}'), bests: {score: -20}}));
  const clean = progress.readRunProgress(storage);
  assert.equal(clean.points, 0);
  assert.equal(clean.upgrades.health, progress.UPGRADES.find(x => x.id === 'health').maxLevel);
  assert.equal(clean.upgrades.bite, undefined);
  assert.deepEqual(clean.bankedRuns, {});
  for (const id of ['', '__proto__', 'constructor', null]) assert.deepEqual(progress.settleRun(clean, {id, score: 1000}), clean);
  const invalid = progress.settleRun(clean, { id: 'safe', score: Infinity, eaten: -1, destroyed: NaN });
  assert.equal(invalid.points, 0);
  assert.equal(invalid.bests.score, 0);
  assert.doesNotThrow(() => progress.writeRunProgress(invalid, {setItem() { throw Error('full'); }}));
  assert.equal(progress.readRunProgress({getItem() { throw Error('blocked'); }}).points, 0);
});
