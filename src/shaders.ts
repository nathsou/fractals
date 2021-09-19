import { Params } from "./params";

export const shaders = (params: Params) => ({
  vertex: `        
    precision highp float;

    attribute vec2 a_pos;
    uniform vec2 u_res;
    uniform float u_zoom;
    uniform vec2 u_center;
    varying vec2 v_pos;
    
    void main() {
      gl_Position = vec4(a_pos, 0, 1);
      v_pos = (1.0 / u_zoom) * a_pos + u_center;
      v_pos.x *= u_res.x / u_res.y;
    }
  `,
  fragment: `
    precision highp float;

    #define MAX_ITERS ${params.maxIterations}
    #define ETA ${params.convergencePrecision}

    varying vec2 v_pos;

    vec2 cplx_mult(vec2 a, vec2 b) {
      return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
    }

    vec2 cplx_div(vec2 a, vec2 b) {
      float d = b.x * b.x + b.y * b.y;

      return vec2(
        (a.x * b.x + a.y * b.y) / d,
        (a.y * b.x - a.x * b.y) / d
      );
    }

    float cplx_arg(vec2 z) {
      return atan(z.y, z.x);
    }

    vec2 cplx_pow_scalar(vec2 z, float p) {
      float c_p = pow(length(z), p);
      float angle = p * cplx_arg(z);
      return vec2(c_p * cos(angle), c_p * sin(angle));
    }

    vec2 cplx_ln(vec2 z) {
      return vec2(log(length(z)), cplx_arg(z));
    }

    vec2 cplx_pow(vec2 z, vec2 w) {
      float p = length(z);
      float theta = cplx_arg(z);
      float c = w.x;
      float d = w.y;
      float v = d * log(p) + c * theta;

      return pow(p, c) * exp(-d * theta) * vec2(cos(v), sin(v));
    }

    vec2 cplx_sin(vec2 z) {
      vec2 z2 = cplx_mult(z, z);
      vec2 z3 = cplx_mult(z, z2);
      vec2 z5 = cplx_mult(z3, z2);
      vec2 z7 = cplx_mult(z5, z2);
      vec2 z9 = cplx_mult(z7, z2);
      vec2 z11 = cplx_mult(z9, z2);
      vec2 z13 = cplx_mult(z11, z2);
      vec2 z15 = cplx_mult(z13, z2);

      vec2 t2 = cplx_div(z3, vec2(6.0, 0.0));
      vec2 t3 = cplx_div(z5, vec2(120.0, 0.0));
      vec2 t4 = cplx_div(z7, vec2(5040.0, 0.0));
      vec2 t5 = cplx_div(z9, vec2(362880.0, 0.0));
      vec2 t6 = cplx_div(z11, vec2(39916800.0, 0.0));
      vec2 t7 = cplx_div(z13, vec2(6227020800.0, 0.0));
      vec2 t8 = cplx_div(z15, vec2(1307674368000.0, 0.0));

      return z - t2 + t3 - t4 + t5 - t6 + t7 - t8;
    }

    vec2 cplx_cos(vec2 z) {
      vec2 z2 = cplx_mult(z, z);
      vec2 z4 = cplx_mult(z2, z2);
      vec2 z6 = cplx_mult(z4, z2);
      vec2 z8 = cplx_mult(z6, z2);
      vec2 z10 = cplx_mult(z8, z2);
      vec2 z12 = cplx_mult(z10, z2);
      vec2 z14 = cplx_mult(z12, z2);

      vec2 t2 = cplx_div(z2, vec2(2.0, 0.0));
      vec2 t3 = cplx_div(z4, vec2(24.0, 0.0));
      vec2 t4 = cplx_div(z6, vec2(720.0, 0.0));
      vec2 t5 = cplx_div(z8, vec2(40320.0, 0.0));
      vec2 t6 = cplx_div(z10, vec2(3628800.0, 0.0));
      vec2 t7 = cplx_div(z12, vec2(479001600.0, 0.0));
      vec2 t8 = cplx_div(z14, vec2(87178291200.0, 0.0));

      return z - t2 + t3 - t4 + t5 - t6 + t7 - t8;
    }

    vec2 cplx_exp(vec2 z) {
      return exp(z.x) * vec2(cos(z.y), sin(z.y));
    }

    vec3 newton_method(vec2 z0, float eps) {
      vec2 z = vec2(z0);
      float n = 0.0;

      for (int j = 0; j < MAX_ITERS; j++) {
        vec2 delta = cplx_div(${params.function.f}, ${params.function.df});
        z -= delta;
        n++;

        if (length(delta) <= eps) {
          break;
        }
      }

      return vec3(z, n);
    }

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    vec3 root_color(vec2 z, float n) {
      float p = float(${params.brightnessFactor}); // color brightness factor
      float m = 1.0 - (exp(p * n / float(MAX_ITERS)) - 1.0) / (exp(p) - 1.0);
      float hue = cplx_arg(z) / 6.2831853 + float(${params.colorShift});

      return hsv2rgb(vec3(hue, 1.0, m));
    }

    void main() {
      vec3 color = vec3(0.0);
      vec3 r = newton_method(v_pos, ETA);

      if (r.z > 0.0) {
        float m = r.z / float(MAX_ITERS);
        color = mix(root_color(vec2(r.x, r.y), r.z), vec3(0.0), m);
      }
  
      gl_FragColor = vec4(color, 1.0);
    }
  `
});