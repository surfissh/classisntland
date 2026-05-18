const DEFAULT_MAX_SPEED = 8;

export function computePressure(
  prevPoint: { x: number; y: number; time: number },
  currentPoint: { x: number; y: number; time: number },
  maxSpeed: number = DEFAULT_MAX_SPEED
): number {
  const dx = currentPoint.x - prevPoint.x;
  const dy = currentPoint.y - prevPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const timeDelta = currentPoint.time - prevPoint.time;

  if (timeDelta <= 0) return prevPoint.time > 0 ? 1 : 0.5;

  const speed = distance / timeDelta;
  const pressure = 1 - Math.max(0, Math.min(1, speed / maxSpeed));
  return pressure;
}
