import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraStep } from '../src/game/cameraRig.js';

const target = { x: 4, y: 2, z: -6, facing: 0, size: 1, moving: true };
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);

test('starts at a 70 degree overhead pitch with a 65 degree field of view', () => {
  const result = cameraStep(null, target, {}, 1 / 60);
  close(result.fov, 65);
  close(result.yaw, 0);
  close(result.lookAt.y, 3.6);
  close(result.position.y - result.lookAt.y, 32 * Math.sin(70 * Math.PI / 180));
  close(result.position.z - result.lookAt.z, 32 * Math.cos(70 * Math.PI / 180));
});

test('fixed north ignores monster facing while follow heading orbits behind it', () => {
  const changed = { ...target, facing: Math.PI / 2 };
  close(cameraStep(null, changed, { cameraFollowHeading: 0 }, 1).yaw, 0);
  close(cameraStep(null, changed, { cameraFollowHeading: 1 }, 1).yaw, -Math.PI / 2);
  const offset = cameraStep(null, changed, { cameraFollowHeading: 1, cameraYawOffset: 90 }, 1);
  close(offset.yaw, 0);
});

test('heading takes the shortest path across the negative/positive pi boundary', () => {
  const current = cameraStep(null, target, { cameraYawOffset: 179 }, 0);
  const next = cameraStep(current, target, { cameraYawOffset: -179 }, .1);
  assert.ok(Math.abs(next.yaw) > 179 * Math.PI / 180);
  assert.ok(Math.abs(next.yaw) <= Math.PI);
});

test('damping produces the same result across frame rates', () => {
  const current = cameraStep(null, target, {}, 0);
  const moved = { x: 30, y: 9, z: -20, facing: .7, size: 3, moving: true };
  const settings = { cameraFollowHeading: 1, cameraPositionSmoothness: 7, cameraTurnSmoothness: 3 };
  const advance = (fps) => {
    let result = current;
    for (let frame = 0; frame < fps; frame++) result = cameraStep(result, moved, settings, 1 / fps);
    return result;
  };
  const a = advance(30), b = advance(120);
  for (const axis of ['x', 'y', 'z']) {
    close(a.position[axis], b.position[axis]);
    close(a.lookAt[axis], b.lookAt[axis]);
  }
  close(a.yaw, b.yaw);
});

test('tracks movement and elevation gradually without changing the supplied state', () => {
  const current = cameraStep(null, target, {}, 0);
  const snapshot = structuredClone(current);
  const next = cameraStep(current, { ...target, x: 24, y: 12 }, {}, .1);
  assert.ok(next.lookAt.x > 4 && next.lookAt.x < 24);
  assert.ok(next.lookAt.y > 3.6 && next.lookAt.y < 13.6);
  assert.ok(next.position.y > current.position.y);
  assert.deepEqual(current, snapshot);
  assert.deepEqual(cameraStep(current, target, {}, 0), current);
});

test('distance and zoom multiply and idle heading remains stable', () => {
  const settings = { cameraFollowHeading: 1, cameraDistance: 2, cameraZoom: .5 };
  const current = cameraStep(null, target, settings, 0);
  const idle = cameraStep(current, { ...target, moving: false }, settings, .2);
  close(idle.yaw, current.yaw);
  close(Math.hypot(idle.position.x - idle.lookAt.x, idle.position.y - idle.lookAt.y, idle.position.z - idle.lookAt.z), 32);
  const facingChanged = cameraStep(current, { ...target, facing: .5, moving: false }, settings, .2);
  assert.notEqual(facingChanged.yaw, current.yaw);
});
