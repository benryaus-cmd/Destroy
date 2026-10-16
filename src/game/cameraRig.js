const TAU = Math.PI * 2;
const radians = degrees => degrees * Math.PI / 180;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, fallback) => Number.isFinite(value) ? value : fallback;
const wrap = angle => ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
const mix = (from, to, alpha) => from + (to - from) * alpha;

/**
 * Pure orbit camera. Retain the returned state between frames. Angles in the
 * settings are degrees; target.facing and the returned yaw are radians.
 * Position smoothing damps the tracked center and orbit height/radius, while
 * turn smoothing damps yaw independently so the orbit remains frame invariant.
 */
export function cameraStep(current, target, settings = {}, dt = 0) {
  const size = Math.max(.01, number(target.size, 1));
  const desiredLookAt = {
    x: number(target.x, 0),
    y: number(target.y, 0) + 1.6 * size,
    z: number(target.z, 0),
  };
  const follow = Number(settings.cameraFollowHeading ?? 0) >= .5;
  const desiredYaw = wrap((follow ? number(target.facing, 0) + Math.PI : 0)
    + radians(number(settings.cameraYawOffset, 0)));
  const pitch = radians(clamp(number(settings.cameraPitchDegrees, 70), 10, 85));
  const distance = (25 + 7 * Math.sqrt(size))
    * Math.max(.01, number(settings.cameraDistance, 1))
    * Math.max(.01, number(settings.cameraZoom, number(settings.zoom, 1)));
  const desiredRadius = distance * Math.cos(pitch);
  const desiredHeight = distance * Math.sin(pitch);
  const initialized = current?.position && current?.lookAt && Number.isFinite(current.yaw);
  const seconds = Math.max(0, number(dt, 0));
  const positionAlpha = initialized
    ? -Math.expm1(-clamp(number(settings.cameraPositionSmoothness, 7), 1, 20) * seconds) : 1;
  const turnAlpha = initialized
    ? -Math.expm1(-clamp(number(settings.cameraTurnSmoothness, 3), .5, 15) * seconds) : 1;
  const lookAt = initialized ? {
    x: mix(current.lookAt.x, desiredLookAt.x, positionAlpha),
    y: mix(current.lookAt.y, desiredLookAt.y, positionAlpha),
    z: mix(current.lookAt.z, desiredLookAt.z, positionAlpha),
  } : desiredLookAt;
  const yaw = initialized ? wrap(current.yaw + wrap(desiredYaw - current.yaw) * turnAlpha) : desiredYaw;
  const radius = initialized ? mix(Math.hypot(
    current.position.x - current.lookAt.x,
    current.position.z - current.lookAt.z,
  ), desiredRadius, positionAlpha) : desiredRadius;
  const height = initialized
    ? mix(current.position.y - current.lookAt.y, desiredHeight, positionAlpha) : desiredHeight;
  return {
    position: initialized && seconds === 0 ? { ...current.position } : {
      x: lookAt.x + Math.sin(yaw) * radius,
      y: lookAt.y + height,
      z: lookAt.z + Math.cos(yaw) * radius,
    },
    yaw: initialized && seconds === 0 ? current.yaw : yaw,
    fov: clamp(number(settings.cameraFOV, 65), 20, 110),
    lookAt,
  };
}
