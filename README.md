## Newton Fractals

Interactive Newton fractals renderer using WebGL 2 and adaptive decimal arithmetic.

[Click to try](https://nathsou.github.io/fractals/)

Features :

- Pan and zoom freely (both on desktop and touchscreens)
- Custom function input
- Click anywhere to draw sucessive approximations starting at the mouse position

### Deep zoom

The camera stores its center and zoom as decimal strings. Pixel spacing determines
the working precision (at least 40 significant digits plus a zoom-dependent guard
budget). The WebGL 2 renderer handles ordinary views; before Float32 roundoff
approaches pixel spacing, a worker takes over with decimal.js complex arithmetic.
Function values and first/second derivatives are evaluated together using automatic
differentiation, retaining literal digits and supporting the same expression syntax.
Integer powers use multiplication rather than polar logarithms.

Deep views start with at most 16×16 samples covering the entire viewport, then
halve the sampling block size each pass down to individual pixels. The previous
frame stays visible while the new preview is computed; a status label identifies
it as the previous preview until replacement tiles arrive. Each sample is
recomputed with 24 additional decimal digits and a larger iteration budget. Root
disagreement or lack of convergence triggers further retries. This is a numerical
stability check, not a mathematical proof of basin membership at a boundary.
Unresolved final pixels are gray and reported in the status line. Computation yields
between batches, and stale frames are cancelled/ignored when the view changes.
Click paths use the same decimal coordinates and iteration arithmetic.

The current resource limits are 512 significant digits, three precision retries,
and 4096 iterations per orbit. The camera stops before exceeding its precision
budget. Transcendental functions use decimal.js's arbitrary-precision routines;
inputs outside those routines' supported range produce an explicit render error.
Full-resolution deep renders can take substantial time, especially on Retina
displays or near complicated boundaries. Refinement is shown as progress; the
coarse passes are previews, and no finite-resolution image can resolve subpixel
structure. GPU perturbation acceleration and adaptive supersampling are not yet
implemented.

### Development and verification

Use a current Node.js version compatible with Vite 8, then run `npm ci`, `npm test`,
and `npm run build`. The numerical tests cover camera motion at 1e100 zoom, exact
literals, complex derivatives, all iteration methods, singularities, and opposite
basins separated by 1e-80 against a 200-digit reference calculation.

With `npm run dev` running, open `/tests/browser.html` for the browser integration
tests: all preset/method shader variants, deep worker rendering, texture upload,
cancellation, and complete final tile coverage. WebGL 2 is required.

z^3 - 1
![z^3 - 1](res/z_pow_3_minus_one.png)

z^log(z + i) - 1
![z^log(z + i) - 1](res/z_pow_log__z_plus_i__minus_one.png)

z^z - 2
![z^z - 2](res/z_pow_z_minus_2.png)

z^3 - 2 * z + 3
![z^3 - 2 * z + 3](res/z_pow_3_minus_2_times_z_plus_3.png)
