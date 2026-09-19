import { createPane } from './pane';
import type { Params } from './params';
import { createRenderer } from './renderer';
import { createPinchZoomHandler } from './zoompan';
import { Camera, precisionFor, type Point } from './precision';
import { compilePrecise } from './precise-function';
import { orbit } from './precise-orbit';
import { iterationLimit } from './render-settings';

const createApp = (initial: Params) => {
  const cnv = document.querySelector('#cnv') as HTMLCanvasElement;
  const overlay = document.querySelector('#overlay') as HTMLCanvasElement;
  const status = document.createElement('div');
  status.id = 'render-status';
  status.setAttribute('role', 'status');
  document.body.append(status);
  const report = (text: string) => { status.textContent = text; };
  const camera = new Camera();
  let params = initial;
  let selected: Point | undefined;
  let path: Point[] = [];
  let gesture: { x: number; y: number; moved: boolean } | undefined;
  const drawPath = (points = path) => {
    path = points;
    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2 * overlay.width / overlay.clientWidth;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const [x, y] = camera.project(points[i], overlay.width, overlay.height);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  const renderer = createRenderer(cnv, params, report);
  let scheduled = false;
  const update = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      try {
        drawPath();
        const view = camera.snapshot();
        const precise = renderer.render(view, selected, drawPath);
        if (!precise && selected) {
          const math = compilePrecise(params.function.source, precisionFor(view, cnv.height) + 24);
          drawPath(orbit(math, selected, params.method, iterationLimit(params.maxIterations, view.zoom), String(params.convergencePrecision), true).path);
        }
      } catch (error) { report(String(error)); }
    });
  };
  const resize = () => {
    const bounds = cnv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cnv.width = overlay.width = Math.max(1, Math.round(bounds.width * dpr));
    cnv.height = overlay.height = Math.max(1, Math.round(bounds.height * dpr));
    update();
  };
  const pinch = createPinchZoomHandler();
  overlay.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    overlay.setPointerCapture(ev.pointerId);
    gesture = { x: ev.clientX, y: ev.clientY, moved: false };
    pinch.onPointerDown(ev);
    if (pinch.isZooming()) gesture.moved = true;
  });
  overlay.addEventListener('pointermove', ev => {
    const [dx, dy] = pinch.movement(ev);
    if (!gesture) return;
    if (Math.hypot(ev.clientX - gesture.x, ev.clientY - gesture.y) > 3) gesture.moved = true;
    if (pinch.isZooming()) { gesture.moved = true; pinch.onPointerMove(ev); }
    else if (gesture.moved) { camera.pan(dx, dy, overlay.clientHeight); update(); }
  });
  overlay.addEventListener('pointerup', ev => {
    if (gesture && !gesture.moved && !pinch.isZooming()) {
      const b = overlay.getBoundingClientRect();
      selected = camera.point(ev.clientX - b.left, ev.clientY - b.top, b.width, b.height);
      drawPath([]);
      update();
    }
    pinch.onPointerUp(ev);
    gesture = undefined;
  });
  overlay.addEventListener('pointercancel', ev => { pinch.onPointerUp(ev); gesture = undefined; });
  const zoom = (x: number, y: number, factor: string) => {
    const b = overlay.getBoundingClientRect();
    try { camera.zoomAt(x - b.left, y - b.top, b.width, b.height, factor); update(); }
    catch (error) { report(String(error)); }
  };
  overlay.addEventListener('wheel', ev => { ev.preventDefault(); zoom(ev.clientX, ev.clientY, ev.deltaY < 0 ? '1.1' : '0.9'); }, { passive: false });
  pinch.addPinchListener((x, y, factor) => zoom(x, y, String(factor)));
  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', () => renderer.dispose(), { once: true });
  resize();
  return { updateParams(next: Params) { try { renderer.updateParams(next); params = next; path = []; update(); } catch (error) { report(String(error)); } } };
};

(async () => {
  // @ts-ignore Nerdamer's calculus extension has no separate declaration.
  await import('nerdamer/Calculus.js');
  try { const pane = createPane(); const app = createApp(pane.params()); pane.onChange(app.updateParams); }
  catch (error) { const message = document.createElement('p'); message.textContent = String(error); document.body.append(message); }
})();
