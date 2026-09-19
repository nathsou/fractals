export const perturbationVertex = `#version 300 es
layout(location=0) in vec2 a_pos;
void main() { gl_Position=vec4(a_pos,0,1); }
`;

export const perturbationFragment = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_reference;
uniform vec2 u_resolution, u_anchor, u_pixelScale;
uniform float u_scale, u_shift, u_brightness;
uniform int u_exponent, u_degree, u_length, u_iterations;
out vec4 color;
// Extended-range complex numbers. Exponents remain separate even when the
// pixel spacing is far below the range of an IEEE single/double float.
struct X { vec2 m; int e; };
X normx(vec2 m, int e) {
  float a=max(abs(m.x),abs(m.y));
  if(a==0.0) return X(vec2(0),0);
  int shift=int((floatBitsToUint(a)>>23u)&255u)-127;
  return X(m*exp2(float(-shift)),e+shift);
}
X addx(X a,X b) {
  if(all(equal(a.m,vec2(0)))) return b;
  if(all(equal(b.m,vec2(0)))) return a;
  int e=max(a.e,b.e);
  return normx(a.m*exp2(float(max(-120,a.e-e)))+b.m*exp2(float(max(-120,b.e-e))),e);
}
X negx(X a) { return X(-a.m,a.e); }
X subx(X a,X b) { return addx(a,negx(b)); }
X mulx(X a,X b) { return normx(vec2(a.m.x*b.m.x-a.m.y*b.m.y,a.m.x*b.m.y+a.m.y*b.m.x),a.e+b.e); }
X divx(X a,X b) { return normx(vec2(dot(a.m,b.m),a.m.y*b.m.x-a.m.x*b.m.y)/dot(b.m,b.m),a.e-b.e); }
X scale(X a,float b) { return normx(a.m*b,a.e); }
X row(int n,int k) { vec4 v=texelFetch(u_reference,ivec2(k,n),0); return X(v.xy,int(v.z)); }
float size(X a) { return all(equal(a.m,vec2(0))) ? -100000.0 : float(a.e)+log2(length(a.m)); }
bool bad(X a) { return any(isnan(a.m)) || any(isinf(a.m)) || abs(a.e)>100000; }
vec3 hsv(float h,float v) { return v*clamp(abs(fract(h+vec3(0,2.0/3.0,1.0/3.0))*6.0-3.0)-1.0,0.0,1.0); }
void main() {
  color=vec4(0); // alpha zero asks the CPU to rebase/recover, never a guessed basin
  if(u_length==0) return;
  vec2 pixel=gl_FragCoord.xy*u_pixelScale;
  X d=normx(2.0*(vec2(pixel.x,u_resolution.y-pixel.y)-u_anchor)*vec2(1,-1)/u_resolution.y*u_scale,u_exponent);
  X error=X(vec2(0),0);
  for(int n=0;n<4096;n++) {
    if(n>=u_iterations || n>=u_length+64) return;
    int index=min(n,u_length-1);
    X z=row(index,u_degree+1), r=row(index,u_degree+2);
    X actual=addx(z,d);
    // Cancellation against the reference requires a closer reference.
    if(size(actual)<max(size(z),size(d))-18.0) return;
    X f=row(index,u_degree), fp=X(vec2(0),0), fpp=X(vec2(0),0);
    for(int k=7;k>=0;k--) if(k<u_degree) {
      fpp=addx(mulx(fpp,d),scale(fp,2.0));
      fp=addx(mulx(fp,d),f);
      f=addx(mulx(f,d),row(index,k));
    }
    // Absolute forward error estimate follows the derivative of Newton's map.
    // Rebase before roundoff can hide pixel-scale structure.
    if(size(error)>max(0.0,size(actual))-4.0 || bad(f) || bad(fp)) return;
    if(size(fp)<-99999.0) return;
    if(size(f)<-18.0 && size(f)-size(fp)<size(actual)-20.0 && size(error)<size(actual)-14.0 && size(actual)<100.0) {
      float angle=atan(actual.m.y,actual.m.x);
      float v=0.2+0.8*exp(u_brightness*float(n)/50.0);
      color=vec4(hsv(fract(angle/6.28318530718+u_shift),v),1);
      return;
    }
    X derivative=divx(mulx(f,fpp),mulx(fp,fp));
    X b=X(vec2(0),0), t=X(vec2(0),0);
    for(int k=8;k>=2;k--) if(k<=u_degree) {
      b=addx(mulx(b,d),scale(row(index,k),float(k)));
      t=addx(mulx(t,d),row(index,k));
    }
    // Exact polynomial Newton perturbation, factored to avoid subtracting
    // almost equal Newton steps: d' = d*(d*(B-T)+r*B)/(a1+d*B).
    X term1=mulx(d,subx(b,t)), term2=mulx(r,b);
    X numerator=addx(term1,term2);
    X denominator=addx(row(index,1),mulx(d,b));
    if(size(denominator)<max(size(row(index,1)),size(mulx(d,b)))-16.0) return;
    X next=divx(mulx(d,numerator),denominator);
    // Include cancelled numerator operands, not just the rounded result.
    X rounding=scale(divx(mulx(d,addx(X(vec2(length(term1.m),0),term1.e),X(vec2(length(term2.m),0),term2.e))),denominator),0.000002);
    error=addx(X(vec2(length(mulx(error,derivative).m),0),mulx(error,derivative).e),X(vec2(length(rounding.m),0),rounding.e));
    if(bad(next) || bad(error)) return;
    d=next;
  }
}
`;
