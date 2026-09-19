import 'nerdamer/Calculus.js';
import { createRenderer } from '../src/renderer';
import { funcOf } from '../src/functions';
import { compilePrecise } from '../src/precise-function';
import { orbit, pixelPoint } from '../src/precise-orbit';
import type { Params } from '../src/params';
import type { View } from '../src/precision';

const output=document.querySelector('#result')!;
const canvas=document.querySelector('canvas')!;
const gl=canvas.getContext('webgl2',{preserveDrawingBuffer:true})!;
let status='';
const params:Params={function:funcOf('z^3-1'),method:'newton',maxIterations:100,convergencePrecision:0.001,colorShift:1.6,brightnessFactor:0};
const renderer=createRenderer(canvas,params,text=>{status=text;});
const assert=(v:unknown,message:string)=>{if(!v) throw new Error(message);};
const measurements:string[]=[];
try {
  for(const [source,view] of [
    ['z^3-1',{center:['0','0'],zoom:'1e80'}],
    ['z^2-1',{center:['0','1'],zoom:'1e80'}],
    ['z^4-1',{center:['0.013','0.01'],zoom:'1e40'}],
    ['z^3-2*z+3',{center:['-0.5','0.5'],zoom:'1e40'}],
  ] as [string,View][]) {
    renderer.updateParams({...params,function:funcOf(source)});
    const started=performance.now();
    renderer.render(view,undefined,()=>{});
    while(canvas.dataset.renderState!=='done') {
      assert(!status.startsWith('Render failed'),status);
      assert(performance.now()-started<60000,`${source}: timeout ${status}`);
      await new Promise(r=>setTimeout(r,20));
    }
    const elapsed=performance.now()-started;
    assert(Number(canvas.dataset.gpuPixels)>0,`${source}: no GPU pixels`);
    const pixels=new Uint8Array(canvas.width*canvas.height*4);
    gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const math=compilePrecise(source,200);
    for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
      const point=pixelPoint(math,view,x+.5,y+.5,canvas.width,canvas.height);
      const result=orbit(math,point,'newton',4096,'1e-100');
      assert(result.converged,`${source}: oracle did not converge at ${x},${y}`);
      const hue=((math.D.atan2(result.root[1],result.root[0]).toNumber()/(2*Math.PI)+params.colorShift)%1+1)%1;
      const h=hue*6,f=h-Math.floor(h);
      const rgb=[[1,f,0],[1-f,1,0],[0,1,f],[0,1-f,1],[f,0,1],[1,0,1-f]][Math.floor(h)];
      const index=((canvas.height-1-y)*canvas.width+x)*4;
      assert(rgb.every((v,k)=>Math.abs(v*255-pixels[index+k])<3),`${source} ${view.zoom}: basin mismatch at ${x},${y}: ${pixels.slice(index,index+3)} vs ${rgb}`);
    }
    measurements.push(`${source} @ ${view.zoom}: ${Math.round(elapsed)}ms, ${canvas.dataset.gpuPixels}/32 GPU pixels, ${canvas.dataset.repairPixels} repairs`);
    output.textContent=measurements.join('\n');
  }
  canvas.width=128;canvas.height=64;
  renderer.updateParams(params);
  renderer.render({center:['0','0'],zoom:'1e80'},undefined,()=>{});
  await new Promise(r=>setTimeout(r,200));
  let pathLength=0;
  renderer.render({center:['1','0'],zoom:'1e80'},['1','0'],points=>{pathLength=points.length;});
  const cancellationStart=performance.now();
  while(canvas.dataset.renderState!=='done') {
    assert(performance.now()-cancellationStart<30000,'Cancellation/path test timed out');
    await new Promise(r=>setTimeout(r,20));
  }
  assert(pathLength>0,'GPU mode lost the selected convergence path');
  assert(Number(canvas.dataset.gpuPixels)===128*64,'Replacement view was not completely rendered');
  const replacement=new Uint8Array(128*64*4);
  gl.readPixels(0,0,128,64,gl.RGBA,gl.UNSIGNED_BYTE,replacement);
  assert(replacement.every((v,i)=>i<4 || v===replacement[i%4]),'Cancelled view overwrote the replacement');
  output.textContent=`PASS: 128 pixels compared against independent 200-digit Newton orbits; active GPU cancellation and selected path preservation.\n${measurements.join('\n')}`;
} catch(error) {output.textContent=`FAIL: ${error}\n${measurements.join('\n')}`;throw error;}
finally {renderer.dispose();}
