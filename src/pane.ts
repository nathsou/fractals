import { Pane } from "tweakpane";
import { funcOf, functions } from "./functions";
import { Params } from "./params";

export const createPane = () => {
  const params = {
    'f(z)': functions[0],
    'custom function': 'z^2 - 1',
    'color shift': 1.6,
    'max iterations': 50,
    'convergence threshold': 0.001,
    'brightness factor': 4,
    'error': '',
  };

  const pane = new Pane({
    container: document.querySelector('#pane') as HTMLElement,
    title: 'parameters'
  });

  pane.addInput(params, 'f(z)', {
    options: functions.reduce<Record<string, string>>((obj, f) => {
      obj[f] = f;
      return obj;
    }, { custom: 'custom' }),
  });

  const customFunc = pane.addInput(
    params,
    'custom function',
    { disabled: true }
  );

  const errorMessage = pane.addMonitor(params, 'error', {
    multiline: true,
    lineCount: 2,
    hidden: true
  });

  const genParams = (ps: typeof params): Params => {
    let f = funcOf('0'); // all black

    try {
      f = funcOf(ps['f(z)'] === 'custom' ? ps['custom function'] : ps['f(z)']);
      errorMessage.hidden = true;
    } catch (err) {
      params.error = (err as any)?.message ?? 'invalid expression';
      errorMessage.hidden = false;
    }

    return {
      function: f,
      colorShift: ps['color shift'],
      maxIterations: ps['max iterations'],
      convergencePrecision: ps['convergence threshold'],
      brightnessFactor: -ps['brightness factor']
    };
  };

  pane.addInput(
    params,
    'color shift',
    { min: 0, max: Math.PI }
  );

  pane.add

  pane.addInput(
    params,
    'brightness factor',
    { min: 0.01, max: 12 }
  );

  pane.addInput(
    params,
    'max iterations',
    { min: 1, max: 400, step: 1 }
  );

  pane.addInput(
    params,
    'convergence threshold',
    { min: 0.0001, max: 0.999 }
  );

  const btn = pane.addButton({
    title: 'save image'
  });

  btn.on('click', () => {
    const downloadLink = document.querySelector('#download-link') as HTMLAnchorElement;
    const cnv = document.querySelector('#cnv') as HTMLCanvasElement;
    downloadLink.href = cnv.toDataURL('image/png');
    console.log(downloadLink.href);
    downloadLink.click();
  });

  return {
    params: () => genParams(params),
    onChange: (handler: (params: Params) => void) => {
      pane.on('change', () => {
        customFunc.disabled = params['f(z)'] !== 'custom';
        handler(genParams(params));
      });
    },
  };
};