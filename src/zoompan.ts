
export type PinchListener = (centerX: number, centerY: number, newScale: number) => void;

export const createPinchZoomHandler = () => {
  const pointers = new Map<number, PointerEvent>();
  let lastDist = 0;
  let lastScale = 1;
  let lastX = 0;
  let lastY = 0;

  const removeEvent = (ev: PointerEvent) => {
    pointers.delete(ev.pointerId);
  };

  const updatePosition = (ev: PointerEvent): void => {
    lastX = ev.clientX;
    lastY = ev.clientY;
  };

  const onPointerDown = (ev: PointerEvent) => {
    updatePosition(ev);
    pointers.set(ev.pointerId, ev);
  };

  const onPointerUp = (ev: PointerEvent) => {
    lastDist = 0;
    removeEvent(ev);
  };

  const pinchListeners: PinchListener[] = [];

  const addPinchListener = (listener: PinchListener): void => {
    pinchListeners.push(listener);
  };

  const onPointerMove = (ev: PointerEvent) => {
    pointers.set(ev.pointerId, ev);
    updatePosition(ev);

    if (pointers.size === 2) {
      const [e1, e2] = [...pointers.values()];

      const dist = Math.sqrt((e2.clientX - e1.clientX) ** 2 + (e2.clientY - e1.clientY) ** 2);

      if (lastDist === 0) {
        lastDist = dist;
      }


      const scale = lastScale * (dist / lastDist);

      const centerX = (e2.clientX + e1.clientX) / 2;
      const centerY = (e2.clientY + e1.clientY) / 2;

      for (const listener of pinchListeners) {
        listener(centerX, centerY, scale);
      }

      lastDist = dist;
      lastScale = scale;
    }
  };

  const movement = (ev: PointerEvent): [number, number] => {
    const mvt: [number, number] = [ev.clientX - lastX, ev.clientY - lastY];
    updatePosition(ev);
    return mvt;
  };

  return {
    addPinchListener,
    onPointerDown,
    onPointerUp,
    onPointerMove,
    isZooming: () => pointers.size === 2,
    movement,
  };
};