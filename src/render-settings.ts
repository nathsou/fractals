export const MAX_RENDER_ITERATIONS = 400;

export const iterationLimit = (base: number, zoom: number): number => {
  const zoomBonus = 12 * Math.max(0, Math.log2(zoom));
  return Math.min(MAX_RENDER_ITERATIONS, Math.max(1, Math.ceil(base + zoomBonus)));
};

export const convergenceThreshold = (base: number, zoom: number): number => {
  return Math.max(Number.EPSILON, Math.min(base, 0.25 / zoom));
};

export const needsFloat64 = (
  width: number,
  height: number,
  zoom: number,
  center: { x: number, y: number }
): boolean => {
  const pixelSize = 2 / (height * zoom);
  const centerX = center.x * width / height;

  return (
    Math.fround(centerX) === Math.fround(centerX + pixelSize) ||
    Math.fround(center.y) === Math.fround(center.y + pixelSize)
  );
};
