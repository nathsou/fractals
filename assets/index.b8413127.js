import{n as e,t}from"./vendor.080e648e.js";!function(){const e=document.createElement("link").relList;if(!(e&&e.supports&&e.supports("modulepreload"))){for(const e of document.querySelectorAll('link[rel="modulepreload"]'))t(e);new MutationObserver((e=>{for(const n of e)if("childList"===n.type)for(const e of n.addedNodes)"LINK"===e.tagName&&"modulepreload"===e.rel&&t(e)})).observe(document,{childList:!0,subtree:!0})}function t(e){if(e.ep)return;e.ep=!0;const t=function(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerpolicy&&(t.referrerPolicy=e.referrerpolicy),"use-credentials"===e.crossorigin?t.credentials="include":"anonymous"===e.crossorigin?t.credentials="omit":t.credentials="same-origin",t}(e);fetch(e.href,t)}}();const n={},r={zero:()=>r.of(0,0),one:()=>r.of(1,0),i:()=>r.of(0,1),NaN:()=>r.of(NaN,NaN),isNaN:([e,t])=>Number.isNaN(e)||Number.isNaN(t),isReal:([e,t])=>0===t,isImaginary:([e,t])=>0===e&&0!==t,of:(e,t)=>[e,t],add:([e,t],[n,r])=>[e+n,t+r],sub:([e,t],[n,r])=>[e-n,t-r],times:([e,t],n)=>[e*n,t*n],mult:([e,t],[n,r])=>[e*n-t*r,e*r+n*t],div:([e,t],[n,c])=>{const o=n*n+c*c;return 0===o?r.NaN():[(e*n+t*c)/o,(t*n-e*c)/o]},powScalar:(e,t)=>{const n=Math.pow(r.abs(e),t),c=t*r.arg(e);return[n*Math.cos(c),n*Math.sin(c)]},pow:(e,[t,n])=>{const c=r.abs(e),o=r.arg(e),a=n*Math.log(c)+t*o,s=c**t*Math.exp(-n*o);return[s*Math.cos(a),s*Math.sin(a)]},abs:([e,t])=>Math.sqrt(e*e+t*t),arg:([e,t])=>Math.atan2(t,e),conj:([e,t])=>[e,-t],dist:(e,t)=>r.abs(r.sub(e,t)),ln:e=>[Math.log(r.abs(e)),r.arg(e)],sin:e=>{const{add:t,sub:n,mult:c,div:o}=r,a=c(e,e),s=c(e,a),l=c(s,a),i=c(l,a),p=c(i,a),u=c(p,a),d=c(u,a),v=c(d,a),f=o(s,[6,0]),h=o(l,[120,0]),m=o(i,[5040,0]),x=o(p,[362880,0]),_=o(u,[39916800,0]),z=o(d,[6227020800,0]),y=o(v,[1307674368e3,0]);return n(t(n(t(n(t(n(e,f),h),m),x),_),z),y)},cos:e=>{const{add:t,sub:n,mult:c,div:o}=r,a=c(e,e),s=c(a,a),l=c(s,a),i=c(l,a),p=c(i,a),u=c(p,a),d=c(u,a),v=o(a,[2,0]),f=o(s,[24,0]),h=o(l,[720,0]),m=o(i,[40320,0]),x=o(p,[3628800,0]),_=o(u,[479001600,0]),z=o(d,[87178291200,0]);return n(t(n(t(n(t(n(e,v),f),h),m),x),_),z)},exp:([e,t])=>r.times([Math.cos(t),Math.sin(t)],Math.exp(e))},{abs:c,div:o,sub:a,add:s,times:l}=r,i=(e,t,n=(t=>((e,t,n=r.of(10**-4,0))=>o(a(e(s(t,n)),e(a(t,n))),l(n,2)))(e,t)),i=1e-12,p=40)=>{let u=t;const d=[];for(let r=0;r<p;r++){const t=o(e(u),n(u));if(u=a(u,t),d.push(u),c(t)<i)return d}return[]},p=["z^3 - 1","(z - 1)^2 - 1","z^3 - 2 * z + 3","z^4 - 1","z^z - 2","log(z)","z^log(z + i) - 1","sin(z) * cos(z)","exp(z) - z^5"],u=e=>{switch(e.type){case"VARIABLE_OR_LITERAL":switch(e.value){case"z":return{type:"literal",name:"z"};case"i":return{type:"complex",a:{type:"real",x:0},b:{type:"real",x:1}};case"e":return{type:"complex",a:{type:"real",x:Math.E},b:{type:"real",x:0}};case"pi":return{type:"complex",a:{type:"real",x:Math.PI},b:{type:"real",x:0}};case"tau":return{type:"complex",a:{type:"real",x:2*Math.PI},b:{type:"real",x:0}};case"phi":return{type:"complex",a:{type:"real",x:(1+Math.sqrt(5))/2},b:{type:"real",x:0}};default:{const t=Number(e.value);return Number.isNaN(t)?{type:"error",message:`unknown variable '${e.value}'`}:{type:"complex",a:{type:"real",x:t},b:{type:"real",x:0}}}}case"OPERATOR":switch(e.value){case"+":{const t=u(e.left),n=u(e.right);return"complex"===t.type&&"complex"===n.type?{type:"complex",a:{type:"binary_op",op:"+",lhs:t.a,rhs:n.a},b:{type:"binary_op",op:"+",lhs:t.b,rhs:n.b}}:{type:"binary_op",op:"+",lhs:t,rhs:n}}case"-":{if(void 0===e.right)return{type:"unary_op",op:"-",arg:u(e.left)};const t=u(e.left),n=u(e.right);return"complex"===t.type&&"complex"===n.type?{type:"complex",a:{type:"binary_op",op:"-",lhs:t.a,rhs:n.a},b:{type:"binary_op",op:"-",lhs:t.b,rhs:n.b}}:{type:"binary_op",op:"-",lhs:t,rhs:n}}case"*":const t=u(e.left),n=u(e.right),r="complex"===t.type&&"real"===t.b.type&&0===t.b.x,c="complex"===n.type&&"real"===n.b.type&&0===n.b.x;return!r&&c?{type:"binary_op",op:"*x",lhs:t,rhs:n}:r&&!c?{type:"binary_op",op:"*x",lhs:n,rhs:t}:r&&c?{type:"binary_op",op:"x*y",lhs:t,rhs:n}:{type:"binary_op",op:"*",lhs:t,rhs:n};case"/":return{type:"binary_op",op:"/",lhs:u(e.left),rhs:u(e.right)};case"^":{const t=u(e.left),n=u(e.right);if("complex"===t.type&&"real"===t.a.type&&t.a.x===Math.E&&"real"===t.b.type&&0===t.b.x)return{type:"func",value:"exp",arg:n};return{type:"binary_op",op:"complex"===n.type&&"real"===n.b.type&&0===n.b.x?"^x":"^",lhs:t,rhs:n}}}case"FUNCTION":return{type:"func",value:e.value,arg:u(e.right)}}},d=t=>u(e.tree(t)),v=(e,t)=>{switch(e.type){case"literal":switch(e.name){case"z":return t}break;case"real":return[e.x,0];case"unary_op":switch(e.op){case"-":return r.times(v(e.arg,t),-1)}case"binary_op":const n=v(e.lhs,t),c=v(e.rhs,t);switch(e.op){case"+":return r.add(n,c);case"-":return r.sub(n,c);case"*":return r.mult(n,c);case"*x":return r.times(n,c[0]);case"x*y":return[n[0]*c[0],0];case"/":return r.div(n,c);case"^":return r.pow(n,c);case"^x":return r.powScalar(n,c[0])}case"func":const o=v(e.arg,t);switch(e.value){case"log":return r.ln(o);case"sin":return r.sin(o);case"cos":return r.cos(o);case"sqrt":return r.powScalar(o,.5);case"exp":return r.exp(o)}case"complex":const[a]=v(e.a,t),[,s]=v(e.b,t);return[a,s]}throw Error(`invalid expression: ${JSON.stringify(e,null,2)}`)},f=e=>{const t=e=>{const t=/vec2\((\d*\.\d+), (\d*\.\d+)\)/.exec(e);return null!==t?t[1]:`${e}.x`};switch(e.type){case"literal":return e.name;case"unary_op":switch(e.op){case"-":return`(-1.0 * ${f(e.arg)})`}case"binary_op":{const n=f(e.lhs),r=f(e.rhs);switch(e.op){case"+":return`${n} + ${r}`;case"-":return`${n} - ${r}`;case"*":return`cplx_mult(${n}, ${r})`;case"*x":return`${n} * ${t(r)}`;case"x*y":return`${t(n)} * ${t(r)}`;case"/":return`cplx_div(${n}, ${r})`;case"^":return`cplx_pow(${n}, ${r})`;case"^x":return`cplx_pow_scalar(${n}, ${t(r)})`}}case"func":{const t=f(e.arg);switch(e.value){case"log":return`cplx_ln(${t})`;case"sin":return`cplx_sin(${t})`;case"cos":return`cplx_cos(${t})`;case"sqrt":return`cplx_pow_scalar(${t}, 0.5)`;case"exp":return`cplx_exp(${t})`}}case"real":{const t=Number(e.x);return Number.isInteger(t)?`${t}.0`:`${t}`}case"complex":return`vec2(${f(e.a)}, ${f(e.b)})`;case"error":throw e}},h=e=>t=>v(e,t),m=t=>{const n=d(t);return{f:f(n),native:h(n),diff:n=>f(d(`${e.diff(t,"z",n)}`))}},x=["newton","halley"],_={newton:(e,t)=>`\n    vec3 ${e}(vec2 z0, float eps) {\n      vec2 z = vec2(z0);\n      float n = 0.0;\n\n      for (int j = 0; j < MAX_ITERS; j++) {\n        vec2 delta = cplx_div(${t.function.f}, ${t.function.diff()});\n        z -= delta;\n        n++;\n\n        if (length(delta) <= eps) {\n          break;\n        }\n      }\n\n      return vec3(z, n);\n    }\n  `,halley:(e,t)=>`\n    vec3 ${e}(vec2 z0, float eps) {\n      vec2 z = vec2(z0);\n      float n = 0.0;\n\n      for (int j = 0; j < MAX_ITERS; j++) {\n        vec2 f_z = ${t.function.f};\n        vec2 f_prime_z = ${t.function.diff(1)};\n        vec2 f_prime_prime_z = ${t.function.diff(2)};\n        vec2 top = 2.0 * cplx_mult(f_z, f_prime_z);\n        vec2 bot = 2.0 * cplx_mult(f_prime_z, f_prime_z) - cplx_mult(f_z, f_prime_prime_z);\n        vec2 delta = cplx_div(top, bot);\n        z -= delta;\n        n++;\n\n        if (length(delta) <= eps) {\n          break;\n        }\n      }\n\n      return vec3(z, n);\n    }\n  `},z=(e,t)=>{const n=e.getContext("webgl",{preserveDrawingBuffer:!0});if(null===n)throw new Error("could not get webgl context");const r=e=>{const t=n.createShader(n.VERTEX_SHADER);if(null===t)throw new Error("vertShader is null");const{vertex:r,fragment:c}=(e=>({vertex:"        \n    precision highp float;\n\n    attribute vec2 a_pos;\n    uniform vec2 u_res;\n    uniform float u_zoom;\n    uniform vec2 u_center;\n    varying vec2 v_pos;\n    \n    void main() {\n      gl_Position = vec4(a_pos, 0, 1);\n      v_pos = (1.0 / u_zoom) * a_pos + u_center;\n      v_pos.x *= u_res.x / u_res.y;\n    }\n  ",fragment:`\n    precision highp float;\n\n    #define MAX_ITERS ${e.maxIterations}\n    #define ETA ${e.convergencePrecision}\n\n    varying vec2 v_pos;\n\n    vec2 cplx_mult(vec2 a, vec2 b) {\n      return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);\n    }\n\n    vec2 cplx_div(vec2 a, vec2 b) {\n      float d = b.x * b.x + b.y * b.y;\n\n      return vec2(\n        (a.x * b.x + a.y * b.y) / d,\n        (a.y * b.x - a.x * b.y) / d\n      );\n    }\n\n    float cplx_arg(vec2 z) {\n      return atan(z.y, z.x);\n    }\n\n    vec2 cplx_pow_scalar(vec2 z, float p) {\n      float c_p = pow(length(z), p);\n      float angle = p * cplx_arg(z);\n      return vec2(c_p * cos(angle), c_p * sin(angle));\n    }\n\n    vec2 cplx_ln(vec2 z) {\n      return vec2(log(length(z)), cplx_arg(z));\n    }\n\n    vec2 cplx_pow(vec2 z, vec2 w) {\n      float p = length(z);\n      float theta = cplx_arg(z);\n      float c = w.x;\n      float d = w.y;\n      float v = d * log(p) + c * theta;\n\n      return pow(p, c) * exp(-d * theta) * vec2(cos(v), sin(v));\n    }\n\n    vec2 cplx_sin(vec2 z) {\n      vec2 z2 = cplx_mult(z, z);\n      vec2 z3 = cplx_mult(z, z2);\n      vec2 z5 = cplx_mult(z3, z2);\n      vec2 z7 = cplx_mult(z5, z2);\n      vec2 z9 = cplx_mult(z7, z2);\n      vec2 z11 = cplx_mult(z9, z2);\n      vec2 z13 = cplx_mult(z11, z2);\n      vec2 z15 = cplx_mult(z13, z2);\n\n      vec2 t2 = cplx_div(z3, vec2(6.0, 0.0));\n      vec2 t3 = cplx_div(z5, vec2(120.0, 0.0));\n      vec2 t4 = cplx_div(z7, vec2(5040.0, 0.0));\n      vec2 t5 = cplx_div(z9, vec2(362880.0, 0.0));\n      vec2 t6 = cplx_div(z11, vec2(39916800.0, 0.0));\n      vec2 t7 = cplx_div(z13, vec2(6227020800.0, 0.0));\n      vec2 t8 = cplx_div(z15, vec2(1307674368000.0, 0.0));\n\n      return z - t2 + t3 - t4 + t5 - t6 + t7 - t8;\n    }\n\n    vec2 cplx_cos(vec2 z) {\n      vec2 z2 = cplx_mult(z, z);\n      vec2 z4 = cplx_mult(z2, z2);\n      vec2 z6 = cplx_mult(z4, z2);\n      vec2 z8 = cplx_mult(z6, z2);\n      vec2 z10 = cplx_mult(z8, z2);\n      vec2 z12 = cplx_mult(z10, z2);\n      vec2 z14 = cplx_mult(z12, z2);\n\n      vec2 t2 = cplx_div(z2, vec2(2.0, 0.0));\n      vec2 t3 = cplx_div(z4, vec2(24.0, 0.0));\n      vec2 t4 = cplx_div(z6, vec2(720.0, 0.0));\n      vec2 t5 = cplx_div(z8, vec2(40320.0, 0.0));\n      vec2 t6 = cplx_div(z10, vec2(3628800.0, 0.0));\n      vec2 t7 = cplx_div(z12, vec2(479001600.0, 0.0));\n      vec2 t8 = cplx_div(z14, vec2(87178291200.0, 0.0));\n\n      return z - t2 + t3 - t4 + t5 - t6 + t7 - t8;\n    }\n\n    vec2 cplx_exp(vec2 z) {\n      return exp(z.x) * vec2(cos(z.y), sin(z.y));\n    }\n\n    ${_[e.method]("findRoot",e)}\n\n    vec3 hsv2rgb(vec3 c) {\n      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n    }\n\n    vec3 root_color(vec2 z, float n) {\n      float p = float(${e.brightnessFactor}); // color brightness factor\n      float m = 1.0 - (exp(p * n / float(MAX_ITERS)) - 1.0) / (exp(p) - 1.0);\n      float hue = cplx_arg(z) / 6.2831853 + float(${e.colorShift});\n\n      return hsv2rgb(vec3(hue, 1.0, m));\n    }\n\n    void main() {\n      vec3 color = vec3(0.0);\n      vec3 r = findRoot(v_pos, ETA);\n\n      if (r.z > 0.0) {\n        float m = r.z / float(MAX_ITERS);\n        color = mix(root_color(vec2(r.x, r.y), r.z), vec3(0.0), m);\n      }\n  \n      gl_FragColor = vec4(color, 1.0);\n    }\n  `}))(e);n.shaderSource(t,r),n.compileShader(t);const o=n.createShader(n.FRAGMENT_SHADER);if(null===o)throw new Error("fragShader is null");n.shaderSource(o,c),n.compileShader(o);const a=n.createProgram();if(null===a)throw new Error("prog is null");return n.attachShader(a,t),n.attachShader(a,o),n.linkProgram(a),n.getProgramParameter(a,n.LINK_STATUS)||console.error(n.getProgramInfoLog(a)),a};let c=r(t);return{render:(t,r)=>{n.useProgram(c);const o=n.getUniformLocation(c,"u_res");n.uniform2f(o,e.width,e.height);const a=n.getUniformLocation(c,"u_zoom");n.uniform1f(a,t);const s=n.getUniformLocation(c,"u_center");n.uniform2f(s,r.x,r.y),n.viewport(0,0,e.width,e.height);const l=n.createBuffer();n.bindBuffer(n.ARRAY_BUFFER,l),n.bufferData(n.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),n.STATIC_DRAW);const i=n.getAttribLocation(c,"a_pos");n.enableVertexAttribArray(i),n.vertexAttribPointer(i,2,n.FLOAT,!1,0,0),n.drawArrays(n.TRIANGLES,0,6)},updateParams:e=>{c=r(e)}}},y=()=>{const e=new Map;let t=0,n=1;const r=[];return{addPinchListener:e=>{r.push(e)},onPointerDown:t=>{e.set(t.pointerId,t)},onPointerUp:n=>{t=0,(t=>{e.delete(t.pointerId)})(n)},onPointerMove:c=>{if(e.set(c.pointerId,c),2===e.size){const[c,o]=[...e.values()],a=Math.sqrt((o.clientX-c.clientX)**2+(o.clientY-c.clientY)**2);0===t&&(t=a);const s=n*(a/t),l=(o.clientX+c.clientX)/2,i=(o.clientY+c.clientY)/2;for(const e of r)e(l,i,s);t=a,n=s}},isZooming:()=>2===e.size}},g=(e,t,n,r,c)=>(e-t)*(c-r)/(n-t)+r,b=(e,t,n,c,o=!1,a)=>{const s=e.getContext("2d");if(null!==s){if(s.clearRect(0,0,e.width,e.height),r.isNaN(c))return;if(!o){s.lineWidth=2,s.strokeStyle="white",s.beginPath();const[e,r]=t(c);s.moveTo(e,r);for(const[o,l]of i(n,c,a).map(t))s.lineTo(o,l);s.stroke()}}},w=(e,t,n,c=1)=>{const o=document.querySelector("#cnv"),a=document.querySelector("#overlay");o.width=e,o.height=t,a.width=e,a.height=t;let s=!1;const l={offset:{x:0,y:0},scale:c},i=(e,t,n=l.scale)=>[e/n+l.offset.x,t/n+l.offset.y],p=()=>{const e=1/l.scale,t=e*o.width/o.height,[n,r]=[-t+l.offset.x,t+l.offset.x],[c,a]=[e+l.offset.y,-e+l.offset.y];return{d1:n,d2:r,d3:c,d4:a}},u=([e,t])=>{const{d1:n,d2:r,d3:c,d4:a}=p();return[g(e,0,o.width,n,r),g(t,0,o.height,c,a)]},d=([e,t])=>{console.log("offset: ",l.offset);const{d1:n,d2:r,d3:c,d4:a}=p();return[g(e,n,r,0,o.width),g(t,c,a,0,o.height)]},v={value:r.NaN(),clickTimestamp:0},f=y(),h=()=>{s=!1,v.value=r.NaN(),a.style.cursor="auto"},m=z(o,n);let x=0;const _=()=>{const e=Date.now();e-x>=8.333333333333334&&(x=e,m.render(l.scale,l.offset),b(a,d,n.function.native,v.value,!0))},w=(n,r,c)=>{const[o,a]=((e,t,n,r)=>{const[c,o]=i(e,t,n),[a,s]=i(e,t,r);return[c-a,o-s]})(2*(n/e-.5),2*(-r/t+.5),l.scale,c);l.scale=c,l.offset.x+=o,l.offset.y+=a,_()};return a.addEventListener("pointerdown",(e=>{e.preventDefault(),s=!0,console.log([e.clientX,e.clientY],u([e.clientX,e.clientY])),v.value=u([e.clientX,e.clientY]),v.clickTimestamp=Date.now(),a.style.cursor="grab",f.onPointerDown(e)})),a.addEventListener("pointerup",(e=>{e.preventDefault(),Date.now()-v.clickTimestamp<100&&b(a,d,n.function.native,v.value),h(),f.onPointerUp(e)})),a.addEventListener("pointercancel",h),a.addEventListener("wheel",(e=>{e.preventDefault();const t=l.scale*(e.deltaY<0?1.1:.9);w(e.clientX,e.clientY,t)})),a.addEventListener("pointermove",(n=>{if(n.preventDefault(),f.isZooming())f.onPointerMove(n);else if(s){const r="touch"===n.pointerType?.5:1;((e,t)=>{l.offset.x=e,l.offset.y=t})(l.offset.x-r*n.movementX/(e*l.scale*.5),l.offset.y+r*n.movementY/(t*l.scale*.5)),_()}})),window.addEventListener("resize",(()=>{e=o.clientWidth,t=o.clientHeight,o.width=e,o.height=t,a.width=e,a.height=t,_()})),f.addPinchListener(w),_(),{updateParams:e=>{m.updateParams(e),n=e,_()}}};(async()=>{var e,r;await(e=()=>import("./Calculus.75988da5.js").then((function(e){return e.C})),r=["assets/Calculus.75988da5.js","assets/vendor.080e648e.js"],r&&0!==r.length?Promise.all(r.map((e=>{if((e=`/fractals/${e}`)in n)return;n[e]=!0;const t=e.endsWith(".css"),r=t?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${e}"]${r}`))return;const c=document.createElement("link");return c.rel=t?"stylesheet":"modulepreload",t||(c.as="script",c.crossOrigin=""),c.href=e,document.head.appendChild(c),t?new Promise(((e,t)=>{c.addEventListener("load",e),c.addEventListener("error",t)})):void 0}))).then((()=>e())):e());const c=(()=>{const e={"f(z)":p[0],"custom function":"z^2 - 1",method:"newton","color shift":1.6,"max iterations":50,"convergence threshold":.001,"brightness factor":4,error:""},n=new t.exports.Pane({container:document.querySelector("#pane"),title:"parameters"});n.addInput(e,"f(z)",{options:p.reduce(((e,t)=>(e[t]=t,e)),{custom:"custom"})});const r=n.addInput(e,"custom function",{disabled:!0}),c=n.addMonitor(e,"error",{multiline:!0,lineCount:2,hidden:!0}),o=t=>{var n;let r=m("0");try{r=m("custom"===t["f(z)"]?t["custom function"]:t["f(z)"]),c.hidden=!0}catch(o){e.error=null!=(n=null==o?void 0:o.message)?n:"invalid expression",c.hidden=!1}return{function:r,method:t.method,colorShift:t["color shift"],maxIterations:t["max iterations"],convergencePrecision:t["convergence threshold"],brightnessFactor:-t["brightness factor"]}};return n.addInput(e,"method",{options:x.reduce(((e,t)=>(e[t]=t,e)),{})}),n.addInput(e,"color shift",{min:0,max:Math.PI}),n.add,n.addInput(e,"brightness factor",{min:.01,max:12}),n.addInput(e,"max iterations",{min:1,max:400,step:1}),n.addInput(e,"convergence threshold",{min:1e-4,max:.999}),n.addButton({title:"save image"}).on("click",(()=>{const e=document.querySelector("#download-link"),t=document.querySelector("#cnv");e.href=t.toDataURL("image/png"),console.log(e.href),e.click()})),{params:()=>o(e),onChange:t=>{n.on("change",(()=>{r.disabled="custom"!==e["f(z)"],t(o(e))}))}}})(),o=w(window.innerWidth,window.innerHeight,c.params(),1);c.onChange(o.updateParams)})();
