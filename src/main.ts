import { Complex } from "./complex";
import { newtonSteps } from "./newton";
import { createPane } from './pane';
import { Method, Params } from "./params";
import { createRenderer } from "./renderer";
import { createPinchZoomHandler } from "./zoompan";

// x : [a, b] -> [A, B] 
const map = (x: number, a: number, b: number, A: number, B: number) => (x - a) * (B - A) / (b - a) + A;

const drawPath = (
  overlay: HTMLCanvasElement,
  cplxToPos: (z: Complex) => Complex,
  f: (z: Complex) => Complex,
  z0: Complex,
  method: Method,
  df?: (z: Complex) => Complex,
): void => {
  const ctx = overlay.getContext('2d');

  if (ctx !== null) {
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (Complex.isNaN(z0) || method !== 'newton') {
      return;
    }

    const deviceScale = overlay.clientWidth > 0 ? overlay.width / overlay.clientWidth : 1;
    ctx.lineWidth = 2 * deviceScale;
    ctx.strokeStyle = 'white';

    ctx.beginPath();
    const [x0, y0] = cplxToPos(z0);
    ctx.moveTo(x0, y0);

    for (const [x, y] of newtonSteps(f, z0, df).map(cplxToPos)) {
      ctx.lineTo(x, y);
    }

    ctx.stroke();
  }
};

const createApp = (width: number, height: number, params: Params, originalScale = 1) => {
  const cnv = document.querySelector('#cnv') as HTMLCanvasElement;
  const overlay = document.querySelector('#overlay') as HTMLCanvasElement;
  const resizeBackingStores = () => {
    const deviceScale = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * deviceScale);
    const pixelHeight = Math.round(height * deviceScale);
    cnv.width = pixelWidth;
    cnv.height = pixelHeight;
    overlay.width = pixelWidth;
    overlay.height = pixelHeight;
  };
  resizeBackingStores();

  let isPanning = false;

  const options = {
    offset: { x: 0, y: 0 },
    scale: originalScale,
  };

  const screenToWorld = (
    x: number,
    y: number,
    s = options.scale
  ): Complex => {
    return [x / s + options.offset.x, y / s + options.offset.y];
  };

  const ranges = () => {
    const zoom = 1 / options.scale;
    const aspectRatio = cnv.width / cnv.height;
    const [d1, d2] = [
      aspectRatio * (-zoom + options.offset.x),
      aspectRatio * (zoom + options.offset.x)
    ];
    const [d3, d4] = [zoom + options.offset.y, -zoom + options.offset.y];
    return { d1, d2, d3, d4 };
  };

  const posToCplx = ([x, y]: Complex): Complex => {
    const { d1, d2, d3, d4 } = ranges();
    return [
      map(x, 0, cnv.width, d1, d2),
      map(y, 0, cnv.height, d3, d4)
    ];
  };

  const eventToCanvasPosition = (ev: PointerEvent): Complex => {
    const bounds = overlay.getBoundingClientRect();
    return [
      (ev.clientX - bounds.left) * overlay.width / bounds.width,
      (ev.clientY - bounds.top) * overlay.height / bounds.height,
    ];
  };

  const cplxToPos = ([a, b]: Complex): Complex => {
    const { d1, d2, d3, d4 } = ranges();
    return [
      map(a, d1, d2, 0, cnv.width),
      map(b, d3, d4, 0, cnv.height)
    ];
  };

  const pointerDown = {
    value: Complex.NaN(),
    clickTimestamp: 0
  };
  let selectedZ = Complex.NaN();

  const pinch = createPinchZoomHandler();

  const onPointerDown = (ev: PointerEvent): void => {
    ev.preventDefault();
    isPanning = true;
    pointerDown.value = posToCplx(eventToCanvasPosition(ev));
    pointerDown.clickTimestamp = Date.now();
    overlay.style.cursor = 'grab';
    pinch.onPointerDown(ev);
  };

  const onPointerCancel = (ev?: PointerEvent): void => {
    ev?.preventDefault();
    isPanning = false;
    pointerDown.value = Complex.NaN();
    overlay.style.cursor = 'auto';
  };

  const onPointerUp = (ev: PointerEvent): void => {
    ev.preventDefault();
    if (Date.now() - pointerDown.clickTimestamp < 100) {
      selectedZ = pointerDown.value;
      drawPath(overlay, cplxToPos, params.function.native, selectedZ, params.method);
    }

    onPointerCancel();
    pinch.onPointerUp(ev);
  };

  const renderer = createRenderer(cnv, params);

  const zoomOffset = (x: number, y: number, prevScale: number, newScale: number): [number, number] => {
    const [xBeforeZoom, yBeforeZoom] = screenToWorld(x, y, prevScale);
    const [xAfterZoom, yAfterZoom] = screenToWorld(x, y, newScale);
    return [xBeforeZoom - xAfterZoom, yBeforeZoom - yAfterZoom];
  };

  const setOffset = (x: number, y: number) => {
    options.offset.x = x;
    options.offset.y = y;
  };

  const minInterval = 1000 / 120;
  let lastUpdateTime = 0;

  const update = () => {
    const now = Date.now();

    if (now - lastUpdateTime >= minInterval) {
      lastUpdateTime = now;
      renderer.render(options.scale, options.offset);
      drawPath(overlay, cplxToPos, params.function.native, selectedZ, params.method);
    }
  };

  const onPointerMove = (ev: PointerEvent) => {
    ev.preventDefault();
    const [movementX, movementY] = pinch.movement(ev);

    if (pinch.isZooming()) {
      pinch.onPointerMove(ev);
    } else if (isPanning) {
      const k = 1;
      const x = options.offset.x - k * movementX / (width * options.scale * 0.5);
      const y = options.offset.y + k * movementY / (height * options.scale * 0.5);
      setOffset(x, y);
      update();
    }
  };

  const zoomInOut = (
    centerX: number,
    centerY: number,
    newScale: number
  ): void => {
    const [deltaX, deltaY] = zoomOffset(
      2 * (centerX / width - 0.5),
      2 * (-centerY / height + 0.5),
      options.scale,
      newScale
    );

    options.scale = newScale;
    options.offset.x += deltaX;
    options.offset.y += deltaY;
    update();
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const newScale = options.scale * (e.deltaY < 0 ? 1.1 : 0.9);
    const bounds = overlay.getBoundingClientRect();
    zoomInOut(e.clientX - bounds.left, e.clientY - bounds.top, newScale);
  };

  const onResize = (): void => {
    width = cnv.clientWidth;
    height = cnv.clientHeight;
    resizeBackingStores();
    update();
  };

  overlay.addEventListener('pointerdown', onPointerDown);
  overlay.addEventListener('pointerup', onPointerUp);
  overlay.addEventListener('pointercancel', onPointerCancel);
  overlay.addEventListener('wheel', onWheel);
  overlay.addEventListener('pointermove', onPointerMove);
  window.addEventListener('resize', onResize);
  pinch.addPinchListener((centerX, centerY, newScale) => {
    const bounds = overlay.getBoundingClientRect();
    zoomInOut(centerX - bounds.left, centerY - bounds.top, newScale);
  });

  update();

  return {
    updateParams: (newParams: Params): void => {
      renderer.updateParams(newParams);
      params = newParams;
      update();
    }
  };
};

(async () => {
  /// @ts-ignore
  await import('nerdamer/Calculus.js');

  const pane = createPane();

  const app = createApp(
    window.innerWidth,
    window.innerHeight,
    pane.params(),
    1
  );

  pane.onChange(app.updateParams);
})();
