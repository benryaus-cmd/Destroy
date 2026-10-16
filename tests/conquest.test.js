import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MUTATIONS, createConquest, readConquest, writeConquest, growthFor,
  recordEvent, bankRun, equipMutation, getModifiers, districtAt,
  getChallenges, snapshotRun, resumeRun,
} from '../src/game/conquest.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('save and resume preserve seed, world damage, creature, health and all progress', () => {
  const state = createConquest(1234);
  recordEvent(state, { type: 'eat', id: 'person-1', x: 10, z: -10 });
  state.buildings['building-9'] = { removed: ['front-2'], collapsed: false };
  const run = { id: 'sortie-7', score: 420, health: 71, config: { horns: 3 }, position: [4, 0, 9], destroyed: 2 };
  snapshotRun(state, run);
  run.health = 0;
  const storage = memoryStorage();
  assert.equal(writeConquest(state, storage), true);
  const restored = readConquest(storage);
  assert.deepEqual(restored, state);
  assert.equal(resumeRun(restored).health, 71);
  const resumed = resumeRun(restored);
  resumed.config.horns = 0;
  assert.equal(resumeRun(restored).config.horns, 3);
});

test('stable event IDs and run IDs cannot grant the same rewards twice, including after reload', () => {
  const state = createConquest(13);
  const event = { type: 'building', id: 'building-4', x: -8, z: 5, score: 300 };
  assert.equal(recordEvent(state, event).duplicate, false);
  const afterEvent = structuredClone(state);
  assert.equal(recordEvent(state, event).duplicate, true);
  assert.deepEqual(state, afterEvent);
  const run = { id: 'run-1', score: 700, eaten: 4, destroyed: 2, crushed: 3 };
  bankRun(state, run);
  const storage = memoryStorage();
  writeConquest(state, storage);
  const restored = readConquest(storage);
  const banked = structuredClone(restored);
  assert.equal(bankRun(restored, run).duplicate, true);
  assert.deepEqual(restored, banked);
  bankRun(restored, { id: 'run-2', score: 3, eaten: 1, destroyed: 0, crushed: 0 });
  assert.deepEqual(restored.bests, { score: 700, eaten: 4, destroyed: 2, crushed: 3 });
});

test('mutation unlocks require earned XP, equip requires currency, and saved IDs restore modifiers', () => {
  const state = createConquest(2);
  assert.equal(state.unlocked.length, 0);
  assert.equal(equipMutation(state, MUTATIONS[0].id).ok, false);
  for (let i = 0; i < 12; i++) recordEvent(state, { type: 'eat', id: `p-${i}` });
  const mutation = MUTATIONS[0];
  assert.ok(state.unlocked.includes(mutation.id));
  const before = state.currency;
  assert.equal(equipMutation(state, mutation.id).ok, true);
  assert.equal(state.currency, before - mutation.cost);
  assert.deepEqual(state.equipped, [mutation.id]);
  assert.ok(Object.values(getModifiers(state)).some(value => value > 1));
  const paid = state.currency;
  equipMutation(state, mutation.id);
  assert.equal(state.currency, paid);
  const storage = memoryStorage();
  writeConquest(state, storage);
  assert.deepEqual(getModifiers(readConquest(storage)), getModifiers(state));
});

test('growth stage boundaries, permanent growth and district ownership are deterministic', () => {
  assert.equal(growthFor(0).stage, 0);
  assert.equal(growthFor(5).stage, 0);
  assert.equal(growthFor(6).stage, 1);
  assert.equal(growthFor(18).stage, 2);
  assert.equal(growthFor(40).stage, 3);
  assert.equal(growthFor(40).next, null);
  assert.ok(growthFor(0, 600).scale > growthFor(0, 0).scale);
  assert.equal(growthFor(Infinity, NaN).scale, 1);
  assert.notEqual(districtAt(-1, -1).id, districtAt(1, -1).id);
  assert.equal(districtAt(5, 5).id, districtAt(6, 6).id);
});

test('district challenges are rewarded once and event types maintain separate records', () => {
  const state = createConquest(3);
  for (let i = 0; i < 6; i++) recordEvent(state, { type: 'eat', id: `civilian-${i}`, x: 5, z: 5 });
  const completed = getChallenges(state).filter(challenge => challenge.complete);
  assert.ok(completed.length > 0);
  assert.ok(completed.every(challenge => challenge.claimed));
  const claims = [...state.challengeClaims];
  const currency = state.currency;
  recordEvent(state, { type: 'eat', id: 'civilian-5', x: 5, z: 5 });
  assert.deepEqual(state.challengeClaims, claims);
  assert.equal(state.currency, currency);
  recordEvent(state, { type: 'car', id: 'same-object', x: 5, z: 5 });
  recordEvent(state, { type: 'throw', id: 'same-object', x: 5, z: 5 });
  assert.equal(state.districts[districtAt(5, 5).id].cars, 1);
  assert.equal(state.districts[districtAt(5, 5).id].throws, 1);
});

test('malformed and unavailable storage recover safely without accepting invalid progress', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.equal(readConquest(broken).version, 1);
  assert.equal(writeConquest(createConquest(), broken), false);
  assert.equal(readConquest({ getItem: () => '{broken' }).version, 1);
  const raw = { version: 1, seed: 17, xp: -99, currency: 'free', equipped: ['unknown'], unlocked: ['unknown'], districts: [], bests: { score: -100 }, activeRun: false };
  const restored = readConquest({ getItem: () => JSON.stringify(raw) });
  assert.equal(restored.seed, 17);
  assert.equal(restored.xp, 0);
  assert.equal(restored.currency, 0);
  assert.deepEqual(restored.equipped, []);
  assert.equal(restored.bests.score, 0);
  assert.equal(resumeRun(restored), null);
  assert.equal(recordEvent(restored, { type: 'unknown', id: '__proto__' }).ok, false);
  assert.equal(bankRun(restored, { score: 300 }).ok, false);
  assert.equal(recordEvent(restored, null).ok, false);
  assert.equal(bankRun(restored, null).ok, false);
});

test('writing an older state never lowers a previously saved local best', () => {
  const storage = memoryStorage();
  const older = createConquest(5);
  const newer = createConquest(5);
  bankRun(newer, { id: 'great-run', score: 900, eaten: 7, destroyed: 4, crushed: 2 });
  writeConquest(newer, storage);
  writeConquest(older, storage);
  assert.deepEqual(readConquest(storage).bests, newer.bests);
});
