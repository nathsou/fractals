import { polynomial } from './polynomial';
import { perturbationFragment, perturbationVertex } from './perturbation-shader';
import type { Reference, Region } from './perturbation-reference';
import type { DeepRenderRequest } from './deep-renderer.types';

export function createPerturbation(gl: WebGL2RenderingContext, compile: (v: string,f: string) => WebGLProgram,
  present: (x:number,y:number,w:number,h:number,pixels:Uint8Array,displayWidth?:number,displayHeight?:number) => void) {
  const program=compile(perturbationVertex,perturbationFragment);
  const framebuffer=gl.createFramebuffer(), target=gl.createTexture(), reference=gl.createTexture();
  for(const texture of [target,reference]) {
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  }
  let worker: Worker | undefined;
  let generation=0;
  const tasks:(()=>void)[]=[];
  const channel=new MessageChannel();
  channel.port1.onmessage=()=>tasks.shift()?.();
  const schedule=(task:()=>void)=>{tasks.push(task);channel.port2.postMessage(null);};
  const cancel=()=>{generation++;tasks.length=0;worker?.terminate();worker=undefined;};
  return {
    supports: (request:DeepRenderRequest)=>request.method==='newton' && !!polynomial(request.functionSource),
    cancel,
    render(request:DeepRenderRequest, preview:()=>void, progress:(valid:number,references:number,precision:number)=>void, done:(mask:Uint8Array)=>void) {
      cancel();
      const token=generation;
      const {width,height}=request;
      const mask=new Uint8Array(width*height).fill(1);
      let remaining=mask.length, references=0;
      const queue:Region[]=[{x:0,y:0,width,height,depth:0}];
      worker=new Worker(new URL('./perturbation.worker.ts',import.meta.url),{type:'module'});
      gl.bindTexture(gl.TEXTURE_2D,target);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,target,0);
      const complete=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      if(!complete) { cancel(); done(mask); return; }
      const next=()=>{
        const region=queue.shift();
        if(!region) {cancel();done(mask);return;}
        worker!.postMessage({id:request.id,source:request.functionSource,view:request.view,width,height,iterations:request.maxIterations,region});
      };
      worker.onerror=()=>{if(token!==generation) return;cancel();done(mask);};
      worker.onmessage=({data}:MessageEvent<(Reference & {type:'reference'})|{type:'error'}>)=>{
        if(token!==generation) return;
        if(data.type==='error') {cancel();done(mask);return;}
        const r=data.region;
        if(data.length) {
          gl.bindTexture(gl.TEXTURE_2D,reference);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,data.degree+3,data.length,0,gl.RGBA,gl.FLOAT,data.data.subarray(0,(data.degree+3)*data.length*4));
        }
        let tileX=r.x,tileY=r.y;
        const drawTile=()=>{
          if(token!==generation) return;
          const tile={x:tileX,y:tileY,width:Math.min(128,r.x+r.width-tileX),height:Math.min(128,r.y+r.height-tileY)};
          let needed=false;
          for(let y=tile.y;y<tile.y+tile.height&&!needed;y++) for(let x=tile.x;x<tile.x+tile.width;x++) if(mask[y*width+x]) {needed=true;break;}
          if(data.length && needed) {
            gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
            gl.viewport(0,0,width,height);
            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(tile.x,height-tile.y-tile.height,tile.width,tile.height);
            gl.useProgram(program);
            gl.bindTexture(gl.TEXTURE_2D,reference);
            const loc=(name:string)=>gl.getUniformLocation(program,name);
            gl.uniform1i(loc('u_reference'),0);
            gl.uniform2f(loc('u_resolution'),width,height);
            gl.uniform2f(loc('u_pixelScale'),1,1);
            gl.uniform2f(loc('u_anchor'),...data.anchor);
            gl.uniform1f(loc('u_scale'),data.scale);
            gl.uniform1i(loc('u_exponent'),data.exponent);
            gl.uniform1i(loc('u_degree'),data.degree);
            gl.uniform1i(loc('u_length'),data.length);
            gl.uniform1i(loc('u_iterations'),request.maxIterations);
            gl.uniform1f(loc('u_shift'),request.colorShift);
            gl.uniform1f(loc('u_brightness'),request.brightnessFactor);
            if(references===0 && tileX===0 && tileY===0) {
              const pw=Math.min(64,width),ph=Math.min(64,height);
              gl.viewport(0,0,pw,ph);
              gl.scissor(0,0,pw,ph);
              gl.uniform2f(loc('u_pixelScale'),width/pw,height/ph);
              gl.drawArrays(gl.TRIANGLES,0,6);
              const raw=new Uint8Array(pw*ph*4),pixels=new Uint8Array(raw.length);
              gl.readPixels(0,0,pw,ph,gl.RGBA,gl.UNSIGNED_BYTE,raw);
              for(let y=0;y<ph;y++) for(let x=0;x<pw;x++) {
                const src=((ph-1-y)*pw+x)*4,dest=(y*pw+x)*4;
                pixels.set(raw[src+3]?raw.subarray(src,src+4):[24,24,24,255],dest);
              }
              gl.disable(gl.SCISSOR_TEST);
              gl.bindFramebuffer(gl.FRAMEBUFFER,null);
              present(0,0,pw,ph,pixels,width,height);
              preview();
              gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
              gl.useProgram(program);
              gl.bindTexture(gl.TEXTURE_2D,reference);
              gl.viewport(0,0,width,height);
              gl.enable(gl.SCISSOR_TEST);
              gl.scissor(tile.x,height-tile.y-tile.height,tile.width,tile.height);
              gl.uniform2f(loc('u_pixelScale'),1,1);
            }
            gl.drawArrays(gl.TRIANGLES,0,6);
            const raw=new Uint8Array(tile.width*tile.height*4), pixels=new Uint8Array(raw.length);
            gl.readPixels(tile.x,height-tile.y-tile.height,tile.width,tile.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);
            gl.disable(gl.SCISSOR_TEST);
            gl.bindFramebuffer(gl.FRAMEBUFFER,null);
            // Framebuffer rows are bottom-up; overlay uploads are top-down.
            for(let y=0;y<tile.height;y++) for(let x=0;x<tile.width;x++) {
              const src=((tile.height-1-y)*tile.width+x)*4, dest=(y*tile.width+x)*4;
              const index=(tile.y+y)*width+tile.x+x;
              if(raw[src+3] && mask[index]) {pixels.set(raw.subarray(src,src+4),dest);mask[index]=0;remaining--;}
            }
            present(tile.x,tile.y,tile.width,tile.height,pixels);
          }
          progress(mask.length-remaining,references+1,data.precision);
          tileX+=tile.width;
          if(tileX===r.x+r.width) {tileX=r.x;tileY+=tile.height;}
          if(tileY<r.y+r.height) {schedule(drawTile);return;}
          progress(mask.length-remaining,++references,data.precision);
          // Local references recover cancellation/glitches without rerunning the
          // entire image with arbitrary precision. Bound work during interaction.
          if(r.depth<2 && r.width>1 && r.height>1) {
            const w=Math.floor(r.width/2),h=Math.floor(r.height/2);
            for(const [x,y,rw,rh] of [[r.x,r.y,w,h],[r.x+w,r.y,r.width-w,h],[r.x,r.y+h,w,r.height-h],[r.x+w,r.y+h,r.width-w,r.height-h]]) {
              let nearest=Infinity;
              let anchor: [number,number] | undefined;
              // Rebase on an actually rejected pixel, not on an already-resolved
              // region center. Prefer central failures to reduce displacement.
              for(let j=y;j<y+rh;j++) for(let i=x;i<x+rw;i++) if(mask[j*width+i]) {
                const distance=(i-x-rw/2)**2+(j-y-rh/2)**2;
                if(distance<nearest) {nearest=distance;anchor=[i+.5,j+.5];}
              }
              if(anchor) queue.push({x,y,width:rw,height:rh,depth:r.depth+1,anchor});
            }
          }
          next();
        };
        drawTile();
      };
      next();
    },
    dispose() {cancel();channel.port1.close();channel.port2.close();gl.deleteProgram(program);gl.deleteTexture(reference);gl.deleteTexture(target);gl.deleteFramebuffer(framebuffer);},
  };
}
