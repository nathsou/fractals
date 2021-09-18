import { Complex } from "./complex";
import { newtonSteps } from "./newton";
import { createPane } from './pane';
import { Params } from "./params";
import { createRenderer } from "./renderer";

// x : [a, b] -> [A, B] 
const map = (x: number, a: number, b: number, A: number, B: number) => (x - a) * (B - A) / (b - a) + A;

const drawPath = (
  overlay: HTMLCanvasElement,
  cplxToPos: (z: Complex) => Complex,
  f: (z: Complex) => Complex,
  z0: Complex,
  clear = false,
  df?: (z: Complex) => Complex,
): void => {
  const ctx = overlay.getContext('2d');

  if (ctx !== null) {
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (Complex.isNaN(z0)) {
      return;
    }

    if (!clear) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'white';

      ctx.beginPath();
      const [x0, y0] = cplxToPos(z0);
      ctx.moveTo(x0, y0);

      for (const [x, y] of newtonSteps(f, z0, df).map(cplxToPos)) {
        ctx.lineTo(x, y);
      }

      ctx.stroke();
    }
  }
};

const createApp = (width: number, height: number, params: Params, originalScale = 1) => {
  const cnv = document.querySelector('#cnv') as HTMLCanvasElement;
  const overlay = document.querySelector('#overlay') as HTMLCanvasElement;
  cnv.width = width;
  cnv.height = height;
  overlay.width = width;
  overlay.height = height;

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
    const x_len = zoom * cnv.width / cnv.height;
    const [d1, d2] = [-x_len + options.offset.x, x_len + options.offset.x];
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

  const cplxToPos = ([a, b]: Complex): Complex => {
    const { d1, d2, d3, d4 } = ranges();
    return [
      map(a, d1, d2, 0, cnv.width),
      map(b, d3, d4, 0, cnv.height)
    ];
  };

  const z0 = {
    value: Complex.NaN(),
    clickTimestamp: 0
  };

  const onMouseDown = (ev: MouseEvent) => {
    isPanning = true;
    z0.value = posToCplx([ev.clientX, ev.clientY]);
    z0.clickTimestamp = Date.now();
    overlay.style.cursor = 'grab';
  };

  const onMouseUp = () => {
    isPanning = false;
    if (Date.now() - z0.clickTimestamp < 100) {
      drawPath(overlay, cplxToPos, params.function.native, z0.value);
    }

    z0.value = Complex.NaN();
    overlay.style.cursor = 'auto';
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
      drawPath(overlay, cplxToPos, params.function.native, z0.value, true);
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (isPanning) {
      const x = options.offset.x - e.movementX / (width * options.scale * 0.5);
      const y = options.offset.y + e.movementY / (height * options.scale * 0.5);
      setOffset(x, y);
      update();
    }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const newScale = options.scale * (e.deltaY < 0 ? 1.1 : 0.9);
    const [deltaX, deltaY] = zoomOffset(
      2 * (e.clientX / width - 0.5),
      2 * (-e.clientY / height + 0.5),
      options.scale,
      newScale
    );

    options.scale = newScale;

    options.offset.x += deltaX;
    options.offset.y += deltaY;

    update();
  };

  const onResize = (): void => {
    width = cnv.clientWidth;
    height = cnv.clientHeight;
    cnv.width = width;
    cnv.height = height;
    overlay.width = width;
    overlay.height = height;
    update();
  };

  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('wheel', onWheel);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onResize);

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