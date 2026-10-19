/* Ember Field — flow-field wallpaper generator.
 * Shared by the browser studio and the ember-wall CLI, so a recipe
 * renders the same picture in both. Draws into a plain float buffer; no canvas API. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EmberField = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TAU = Math.PI * 2;

  // Crimson palette (polybar [colors] is the source of truth).
  const C = {
    bg: '#131316', surface: '#1c1c22', fg: '#e8e8ea', muted: '#565663',
    red: '#ff2d4a', dim: '#b31d33', deep: '#7a0f1f', white: '#f5f5f7',
  };
  // Gradient stops per palette. Stop 0 is the theme's own background, so empty areas
  // of the wallpaper match the terminal. Theme hex values come from each theme's official repo.
  const PALETTES = {
    crimson:    [[0, C.bg], [0.32, C.deep], [0.58, C.dim], [0.84, C.red], [1, C.white]],
    ember:      [[0, C.bg], [0.18, C.deep], [0.36, C.dim], [0.55, C.red], [1, C.white]],
    ash:        [[0, C.bg], [0.3, C.surface], [0.62, C.muted], [0.86, C.dim], [1, C.red]],
    bloodline:  [[0, C.bg], [0.55, C.deep], [0.85, C.dim], [1, C.red]],
    catppuccin: [[0, '#1e1e2e'], [0.26, '#313244'], [0.6, '#cba6f7'], [0.85, '#f5c2e7'], [1, '#f5e0dc']],
    gruvbox:    [[0, '#282828'], [0.3, '#9d0006'], [0.58, '#d65d0e'], [0.84, '#fabd2f'], [1, '#ebdbb2']],
    nord:       [[0, '#2e3440'], [0.26, '#3b4252'], [0.56, '#5e81ac'], [0.83, '#88c0d0'], [1, '#eceff4']],
    tokyonight: [[0, '#1a1b26'], [0.3, '#3d59a1'], [0.58, '#7aa2f7'], [0.84, '#bb9af7'], [1, '#c0caf5']],
    dracula:    [[0, '#282a36'], [0.26, '#44475a'], [0.58, '#bd93f9'], [0.84, '#ff79c6'], [1, '#f8f8f2']],
    rosepine:   [[0, '#191724'], [0.26, '#26233a'], [0.58, '#eb6f92'], [0.84, '#ebbcba'], [1, '#e0def4']],
    everforest: [[0, '#2d353b'], [0.28, '#475258'], [0.58, '#83c092'], [0.84, '#a7c080'], [1, '#d3c6aa']],
  };
  // UI colours for each palette (used by the studio's mock desktop overlay).
  const THEMES = {
    crimson:    { name: 'Crimson',     bg: C.bg, fg: C.fg, accent: C.red, muted: C.muted },
    ember:      { name: 'Ember',       bg: C.bg, fg: C.fg, accent: C.red, muted: C.muted },
    ash:        { name: 'Ash',         bg: C.bg, fg: C.fg, accent: C.red, muted: C.muted },
    bloodline:  { name: 'Bloodline',   bg: C.bg, fg: C.fg, accent: C.red, muted: C.muted },
    catppuccin: { name: 'Catppuccin',  bg: '#1e1e2e', fg: '#cdd6f4', accent: '#cba6f7', muted: '#6c7086' },
    gruvbox:    { name: 'Gruvbox',     bg: '#282828', fg: '#ebdbb2', accent: '#fe8019', muted: '#504945' },
    nord:       { name: 'Nord',        bg: '#2e3440', fg: '#d8dee9', accent: '#88c0d0', muted: '#4c566a' },
    tokyonight: { name: 'Tokyo Night', bg: '#1a1b26', fg: '#c0caf5', accent: '#7aa2f7', muted: '#565f89' },
    dracula:    { name: 'Dracula',     bg: '#282a36', fg: '#f8f8f2', accent: '#bd93f9', muted: '#6272a4' },
    rosepine:   { name: 'Rosé Pine',   bg: '#191724', fg: '#e0def4', accent: '#eb6f92', muted: '#6e6a86' },
    everforest: { name: 'Everforest',  bg: '#2d353b', fg: '#d3c6aa', accent: '#a7c080', muted: '#859289' },
  };
  const MODES = ['scatter', 'ring', 'horizon', 'core'];

  // key: [min, max, decimals]
  const SPEC = {
    s: [0, 999999, 0],  // seed
    f: [0.3, 6, 2],     // field scale
    o: [1, 6, 0],       // octaves (turbulence)
    v: [0, 5, 0],       // vortices
    w: [0, 2, 2],       // vortex strength
    p: [2, 80, 0],      // particles (thousands)
    l: [40, 800, 0],    // trail length (steps)
    e: [0.1, 4, 2],     // exposure
    g: [0, 1, 2],       // vignette
  };
  const DEFAULTS = { s: 4821, f: 1.8, o: 3, v: 2, w: 0.6, p: 24, l: 260, e: 1, c: 'crimson', g: 0.5, m: 'scatter' };
  const ORDER = ['s', 'f', 'o', 'v', 'w', 'p', 'l', 'e', 'g', 'c', 'm'];

  function normalize(params) {
    const P = Object.assign({}, DEFAULTS, params);
    for (const k in SPEC) {
      const [lo, hi, dp] = SPEC[k];
      let x = Number(P[k]);
      if (!isFinite(x)) x = DEFAULTS[k];
      x = Math.min(hi, Math.max(lo, x));
      P[k] = Number(x.toFixed(dp));
    }
    if (!PALETTES[P.c]) P.c = DEFAULTS.c;
    if (!MODES.includes(P.m)) P.m = DEFAULTS.m;
    return P;
  }

  function stringify(params) {
    const P = normalize(params);
    return 'ember1:' + ORDER.map(k => k + P[k]).join(',');
  }

  function parse(str) {
    const body = String(str || '').trim().replace(/^ember1:/, '');
    const out = {};
    for (const part of body.split(',')) {
      const k = part.charAt(0), v = part.slice(1);
      if (!k || !v) continue;
      if (k === 'c' || k === 'm') out[k] = v;
      else if (k in SPEC) out[k] = Number(v);
    }
    return normalize(out);
  }

  function mulberry32(a) {
    a >>>= 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gauss(rand) {
    const u = Math.max(1e-9, rand()), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }

  // Seeded 2D Perlin noise, range roughly [-0.7, 0.7].
  function makeNoise(rand) {
    const perm = new Uint8Array(512), gx = new Float32Array(256), gy = new Float32Array(256);
    const base = [];
    for (let i = 0; i < 256; i++) base.push(i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
    for (let i = 0; i < 256; i++) { const a = rand() * TAU; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
      const h00 = perm[perm[X] + Y], h10 = perm[perm[X + 1] + Y];
      const h01 = perm[perm[X] + Y + 1], h11 = perm[perm[X + 1] + Y + 1];
      const n00 = gx[h00] * xf + gy[h00] * yf;
      const n10 = gx[h10] * (xf - 1) + gy[h10] * yf;
      const n01 = gx[h01] * xf + gy[h01] * (yf - 1);
      const n11 = gx[h11] * (xf - 1) + gy[h11] * (yf - 1);
      const u = fade(xf), v = fade(yf);
      const a = n00 + (n10 - n00) * u, b = n01 + (n11 - n01) * u;
      return a + (b - a) * v;
    };
  }

  function hexRGB(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function makeLUT(stops, size) {
    const lut = new Float32Array(size * 3);
    const rgb = stops.map(([t, h]) => [t, hexRGB(h)]);
    for (let i = 0; i < size; i++) {
      const t = i / (size - 1);
      let j = 0;
      while (j < rgb.length - 2 && t > rgb[j + 1][0]) j++;
      const [t0, c0] = rgb[j], [t1, c1] = rgb[j + 1];
      const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      for (let k = 0; k < 3; k++) lut[i * 3 + k] = c0[k] + (c1[k] - c0[k]) * u;
    }
    return lut;
  }

  const GRID = 300;   // field samples per unit of image height
  const PAD = 0.1;    // field extends this far past the image edges
  const STEP = 0.0011; // particle step, in units of image height
  const REF_H = 720;  // line brightness is calibrated at this height

  function createRenderer(params, W, H) {
    const P = normalize(params);
    const aspect = W / H;
    const rand = mulberry32(P.s);
    const noise = makeNoise(rand);

    const vortices = [];
    for (let i = 0; i < P.v; i++) {
      vortices.push({
        x: aspect * (0.15 + 0.7 * rand()), y: 0.15 + 0.7 * rand(),
        r: 0.15 + 0.3 * rand(), dir: rand() < 0.5 ? -1 : 1, str: 0.6 + 0.8 * rand(),
      });
    }
    const offs = [];
    for (let i = 0; i < 6; i++) offs.push([rand() * 100, rand() * 100]);

    // Precompute the flow field as unit vectors on a grid.
    const GW = Math.ceil((aspect + 2 * PAD) * GRID) + 2, GH = Math.ceil((1 + 2 * PAD) * GRID) + 2;
    const fx = new Float32Array(GW * GH), fy = new Float32Array(GW * GH);
    for (let j = 0; j < GH; j++) {
      const y = j / GRID - PAD;
      for (let i = 0; i < GW; i++) {
        const x = i / GRID - PAD;
        let n = 0, amp = 1, freq = P.f, norm = 0;
        for (let o = 0; o < P.o; o++) {
          n += amp * noise(x * freq + offs[o][0], y * freq + offs[o][1]);
          norm += amp; amp *= 0.5; freq *= 2;
        }
        const a = (n / norm) * TAU * 1.6;
        let vx = Math.cos(a), vy = Math.sin(a);
        for (const c of vortices) {
          const dx = x - c.x, dy = y - c.y, d2 = dx * dx + dy * dy;
          const fall = Math.exp(-d2 / (c.r * c.r)) * c.str * P.w * 3;
          const d = Math.sqrt(d2) + 1e-6;
          vx += fall * (-dy / d * c.dir - dx / d * 0.25);
          vy += fall * (dx / d * c.dir - dy / d * 0.25);
        }
        const len = Math.hypot(vx, vy) || 1;
        fx[j * GW + i] = vx / len; fy[j * GW + i] = vy / len;
      }
    }

    const acc = new Float32Array(W * H);
    const N = P.p * 1000, steps = P.l;
    const prand = mulberry32((P.s ^ 0x9e3779b9) >>> 0);
    const lifeTable = new Float32Array(steps);
    for (let t = 0; t < steps; t++) lifeTable[t] = Math.sin(Math.PI * (t + 0.5) / steps);
    let done = 0;

    const sc = Math.min(aspect, 1);
    function spawn() {
      switch (P.m) {
        case 'ring': {
          const a = prand() * TAU, r = (0.33 + gauss(prand) * 0.025) * sc;
          return [aspect / 2 + Math.cos(a) * r, 0.5 + Math.sin(a) * r];
        }
        case 'horizon':
          return [prand() * aspect, 0.64 + gauss(prand) * 0.035];
        case 'core':
          return [aspect / 2 + gauss(prand) * 0.12 * sc, 0.5 + gauss(prand) * 0.12 * sc];
        default:
          return [-0.05 + prand() * (aspect + 0.1), -0.05 + prand() * 1.1];
      }
    }

    // Keep trail samples at most ~1.25px apart so big exports don't look beaded (1 at 1080p).
    const sub = Math.max(1, Math.ceil(STEP * H / 1.25));
    function splat(x, y, w) {
      const px = x * H - 0.5, py = y * H - 0.5;
      const pi = Math.floor(px), pj = Math.floor(py);
      if (pi < 0 || pj < 0 || pi >= W - 1 || pj >= H - 1) return;
      const a = px - pi, b = py - pj, o = pj * W + pi;
      acc[o] += w * (1 - a) * (1 - b); acc[o + 1] += w * a * (1 - b);
      acc[o + W] += w * (1 - a) * b; acc[o + W + 1] += w * a * b;
    }

    function trace(count) {
      const end = Math.min(N, done + count);
      for (; done < end; done++) {
        let [x, y] = spawn();
        for (let t = 0; t < steps; t++) {
          const gxp = (x + PAD) * GRID, gyp = (y + PAD) * GRID;
          const i0 = gxp | 0, j0 = gyp | 0;
          if (gxp < 0 || gyp < 0 || i0 >= GW - 1 || j0 >= GH - 1) break;
          const u = gxp - i0, v = gyp - j0, k = j0 * GW + i0;
          const vx = (fx[k] * (1 - u) + fx[k + 1] * u) * (1 - v) + (fx[k + GW] * (1 - u) + fx[k + GW + 1] * u) * v;
          const vy = (fy[k] * (1 - u) + fy[k + 1] * u) * (1 - v) + (fy[k + GW] * (1 - u) + fy[k + GW + 1] * u) * v;
          const x0 = x, y0 = y;
          x += vx * STEP; y += vy * STEP;
          if (sub === 1) splat(x, y, lifeTable[t]);
          else for (let q = 1; q <= sub; q++) splat(x0 + (x - x0) * q / sub, y0 + (y - y0) * q / sub, lifeTable[t] / sub);
        }
      }
      return done / N;
    }

    const LUT_N = 1024, lut = makeLUT(PALETTES[P.c], LUT_N);
    // Average deposit per pixel ≈ 1 at REF_H; scaled so lines keep their brightness at any size.
    let K = (W * REF_H) / (N * steps * 0.64);
    // Portrait: trails spread over a narrower frame and come out dim, so lift them (landscape untouched).
    if (aspect < 1) K *= Math.sqrt((16 / 9) / aspect);
    const span = Math.log1p(14);

    function toRGBA(out) {
      const k = K * P.e, g = P.g * 0.75, seed = P.s | 0;
      for (let j = 0; j < H; j++) {
        const ny = (j / H - 0.5) * 2;
        for (let i = 0; i < W; i++) {
          const idx = j * W + i;
          let t = Math.log1p(acc[idx] * k) / span;
          const nx = (i / W - 0.5) * 2;
          t *= 1 - g * (nx * nx * 0.55 + ny * ny * 0.45);
          if (t > 1) t = 1; else if (t < 0) t = 0;
          const l = ((t * (LUT_N - 1)) | 0) * 3;
          // Deterministic film grain to stop gradient banding.
          let hsh = Math.imul(idx ^ seed, 0x27d4eb2d); hsh ^= hsh >>> 15;
          const grain = ((hsh & 255) / 255 - 0.5) * 3;
          const q = idx * 4;
          out[q] = lut[l] + grain; out[q + 1] = lut[l + 1] + grain; out[q + 2] = lut[l + 2] + grain; out[q + 3] = 255;
        }
      }
      return out;
    }

    // Tone-mapped brightness (0–1) per pixel, without colour or grain. Used for text art.
    function toValues(out) {
      const k = K * P.e, g = P.g * 0.75;
      for (let j = 0; j < H; j++) {
        const ny = (j / H - 0.5) * 2;
        for (let i = 0; i < W; i++) {
          const idx = j * W + i, nx = (i / W - 0.5) * 2;
          const t = Math.log1p(acc[idx] * k) / span * (1 - g * (nx * nx * 0.55 + ny * ny * 0.45));
          out[idx] = t > 1 ? 1 : t < 0 ? 0 : t;
        }
      }
      return out;
    }

    return { params: P, trace, toRGBA, toValues, get progress() { return done / N; }, total: N };
  }

  function render(params, W, H) {
    const r = createRenderer(params, W, H);
    r.trace(Infinity);
    return r.toRGBA(new Uint8ClampedArray(W * H * 4));
  }

  return { PALETTES, THEMES, MODES, SPEC, DEFAULTS, COLORS: C, normalize, stringify, parse, createRenderer, render };
});
