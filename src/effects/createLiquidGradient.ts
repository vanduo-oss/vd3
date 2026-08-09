/**
 * Vanduo Framework — Liquid Gradient effect
 *
 * Inspired by / adapted from MIT-licensed CodePen
 * “Interactive Liquid Gradient using Three.js” by Cameron Knight:
 * https://codepen.io/cameronknight/pen/ogxWmBP
 *
 * Vanilla WebGL reimplementation (no Three.js). Colors bind to vd3 theme
 * tokens (`--vd-color-primary-rgb`, `--vd-neutral-*`, `--vd-bg-primary`);
 * motion knobs bind to `--vd-liquid-*` customization variables.
 */

const TOUCH_SIZE = 64;
const TOUCH_MAX_AGE = 64;
const MAX_PIXEL_RATIO = 1.5;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uSpeed;
uniform float uIntensity;
uniform sampler2D uTouchTexture;
uniform float uGrainIntensity;
uniform vec3 uBase;
uniform float uGradientSize;
uniform float uPrimaryWeight;
uniform float uNeutralWeight;
uniform float uDistort;
uniform float uAlpha;

varying vec2 vUv;

float grain(vec2 uv, float time) {
  vec2 grainUv = uv * uResolution * 0.5;
  float grainValue = fract(sin(dot(grainUv + time, vec2(12.9898, 78.233))) * 43758.5453);
  return grainValue * 2.0 - 1.0;
}

vec3 getGradientColor(vec2 uv, float time) {
  float gradientRadius = uGradientSize;

  vec2 center1 = vec2(0.5 + sin(time * uSpeed * 0.4) * 0.4, 0.5 + cos(time * uSpeed * 0.5) * 0.4);
  vec2 center2 = vec2(0.5 + cos(time * uSpeed * 0.6) * 0.5, 0.5 + sin(time * uSpeed * 0.45) * 0.5);
  vec2 center3 = vec2(0.5 + sin(time * uSpeed * 0.35) * 0.45, 0.5 + cos(time * uSpeed * 0.55) * 0.45);
  vec2 center4 = vec2(0.5 + cos(time * uSpeed * 0.5) * 0.4, 0.5 + sin(time * uSpeed * 0.4) * 0.4);
  vec2 center5 = vec2(0.5 + sin(time * uSpeed * 0.7) * 0.35, 0.5 + cos(time * uSpeed * 0.6) * 0.35);
  vec2 center6 = vec2(0.5 + cos(time * uSpeed * 0.45) * 0.5, 0.5 + sin(time * uSpeed * 0.65) * 0.5);
  vec2 center7 = vec2(0.5 + sin(time * uSpeed * 0.55) * 0.38, 0.5 + cos(time * uSpeed * 0.48) * 0.42);
  vec2 center8 = vec2(0.5 + cos(time * uSpeed * 0.65) * 0.36, 0.5 + sin(time * uSpeed * 0.52) * 0.44);

  float i1 = 1.0 - smoothstep(0.0, gradientRadius, length(uv - center1));
  float i2 = 1.0 - smoothstep(0.0, gradientRadius, length(uv - center2));
  float i3 = 1.0 - smoothstep(0.0, gradientRadius, length(uv - center3));
  float i4 = 1.0 - smoothstep(0.0, gradientRadius, length(uv - center4));
  float i5 = 1.0 - smoothstep(0.0, gradientRadius, length(uv - center5));
  float i6 = 1.0 - smoothstep(0.0, gradientRadius, length(uv - center6));
  float i7 = 1.0 - smoothstep(0.0, gradientRadius, length(uv - center7));
  float i8 = 1.0 - smoothstep(0.0, gradientRadius, length(uv - center8));

  vec2 rotatedUv = uv - 0.5;
  float angle = time * uSpeed * 0.15;
  float c = cos(angle);
  float s = sin(angle);
  rotatedUv = vec2(rotatedUv.x * c - rotatedUv.y * s, rotatedUv.x * s + rotatedUv.y * c) + 0.5;
  float radial = 1.0 - smoothstep(0.0, 0.85, length(rotatedUv - 0.5));

  vec3 color = vec3(0.0);
  color += uColor1 * i1 * (0.55 + 0.45 * sin(time * uSpeed)) * uPrimaryWeight;
  color += uColor2 * i2 * (0.55 + 0.45 * cos(time * uSpeed * 1.2)) * uNeutralWeight;
  color += uColor3 * i3 * (0.55 + 0.45 * sin(time * uSpeed * 0.8)) * uPrimaryWeight;
  color += uColor4 * i4 * (0.55 + 0.45 * cos(time * uSpeed * 1.3)) * uNeutralWeight;
  color += uColor1 * i5 * (0.55 + 0.45 * sin(time * uSpeed * 1.1)) * uPrimaryWeight * 0.85;
  color += uColor2 * i6 * (0.55 + 0.45 * cos(time * uSpeed * 0.9)) * uNeutralWeight;
  color += uColor3 * i7 * (0.55 + 0.45 * sin(time * uSpeed * 1.4)) * uPrimaryWeight * 0.7;
  color += uColor4 * i8 * (0.55 + 0.45 * cos(time * uSpeed * 1.5)) * uNeutralWeight * 0.85;
  color += mix(uColor1, uColor3, radial) * 0.28 * uPrimaryWeight;

  color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luminance), color, 1.2);
  color = pow(color, vec3(0.94));

  float brightness = length(color);
  float mixFactor = max(brightness * 1.15, 0.18);
  color = mix(uBase, color, mixFactor);
  return clamp(color, vec3(0.0), vec3(1.0));
}

void main() {
  vec2 uv = vUv;

  vec4 touchTex = texture2D(uTouchTexture, uv);
  float vx = -(touchTex.r * 2.0 - 1.0);
  float vy = -(touchTex.g * 2.0 - 1.0);
  float intensity = touchTex.b;
  uv.x += vx * uDistort * intensity;
  uv.y += vy * uDistort * intensity;

  float dist = length(uv - vec2(0.5));
  float ripple = sin(dist * 18.0 - uTime * 2.4) * 0.025 * intensity;
  uv += vec2(ripple);

  vec3 color = getGradientColor(uv, uTime);
  color += grain(uv, uTime) * uGrainIntensity;

  float timeShift = uTime * 0.4;
  color.r += sin(timeShift) * 0.015;
  color.g += cos(timeShift * 1.3) * 0.015;
  color.b += sin(timeShift * 1.1) * 0.015;

  float brightness = length(color);
  color = mix(uBase, color, max(brightness * 1.1, 0.2));
  color = clamp(color, vec3(0.0), vec3(1.0));

  float veil = smoothstep(0.05, 0.7, dist);
  color = mix(mix(uBase, color, 0.72), color, veil);

  gl_FragColor = vec4(color, uAlpha);
}
`;

export type Rgb = [number, number, number];

export interface LiquidGradientOptions {
  /** When true, draw a static frame with no motion or pointer trails. */
  reducedMotion?: boolean;
  /** Element whose computed styles supply theme + `--vd-liquid-*` knobs. */
  styleRoot?: HTMLElement | null;
}

export interface LiquidGradientEngine {
  start: () => void;
  stop: () => void;
  destroy: () => void;
  syncThemeColors: (root?: HTMLElement) => void;
  syncKnobs: (root?: HTMLElement) => void;
  onPointer: (clientX: number, clientY: number) => void;
  resize: () => void;
}

interface TouchPoint {
  x: number;
  y: number;
  age: number;
  force: number;
  vx: number;
  vy: number;
}

interface LiquidKnobs {
  speed: number;
  intensity: number;
  grain: number;
  distort: number;
  gradientSize: number;
  primaryWeight: number;
  neutralWeight: number;
  alpha: number;
}

const DEFAULT_KNOBS: LiquidKnobs = {
  speed: 1.15,
  intensity: 1.35,
  grain: 0.05,
  distort: 0.48,
  gradientSize: 0.48,
  primaryWeight: 0.85,
  neutralWeight: 1.15,
  alpha: 1,
};

/** @internal exported for unit tests */
export function parseRgbTriplet(value: string | null | undefined): Rgb | null {
  if (!value) return null;
  const parts = value.split(",").map((p) => Number.parseFloat(p.trim()));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
}

/** @internal exported for unit tests */
export function parseCssColor(value: string | null | undefined): Rgb | null {
  if (!value) return null;
  const v = value.trim();
  if (v.startsWith("#")) {
    let hex = v.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length !== 6) return null;
    return [
      Number.parseInt(hex.slice(0, 2), 16) / 255,
      Number.parseInt(hex.slice(2, 4), 16) / 255,
      Number.parseInt(hex.slice(4, 6), 16) / 255,
    ];
  }
  const m = v.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (m) return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255];
  return parseRgbTriplet(v);
}

/** @internal exported for unit tests */
export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function readCssNumber(
  styles: CSSStyleDeclaration,
  name: string,
  fallback: number,
): number {
  const raw = styles.getPropertyValue(name).trim();
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

class TouchTexture {
  size = TOUCH_SIZE;
  width = TOUCH_SIZE;
  height = TOUCH_SIZE;
  maxAge = TOUCH_MAX_AGE;
  radius = 0.22 * TOUCH_SIZE;
  speed = 1 / TOUCH_MAX_AGE;
  trail: TouchPoint[] = [];
  last: { x: number; y: number } | null = null;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.clear();
  }

  clear(): void {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  addTouch(point: { x: number; y: number }): void {
    let force = 0;
    let vx = 0;
    let vy = 0;
    const last = this.last;
    if (last) {
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      if (dx === 0 && dy === 0) return;
      const dd = dx * dx + dy * dy;
      const d = Math.sqrt(dd);
      vx = dx / d;
      vy = dy / d;
      force = Math.min(dd * 16000, 1.6);
    }
    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  drawPoint(point: TouchPoint): void {
    const pos = {
      x: point.x * this.width,
      y: (1 - point.y) * this.height,
    };
    let intensity = 1;
    if (point.age < this.maxAge * 0.3) {
      intensity = Math.sin((point.age / (this.maxAge * 0.3)) * (Math.PI / 2));
    } else {
      const t = 1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7);
      intensity = -t * (t - 2);
    }
    intensity *= point.force;

    const color = `${((point.vx + 1) / 2) * 255}, ${((point.vy + 1) / 2) * 255}, ${intensity * 255}`;
    const offset = this.size * 5;
    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = this.radius;
    this.ctx.shadowColor = `rgba(${color},${0.2 * intensity})`;
    this.ctx.beginPath();
    this.ctx.fillStyle = "rgba(255,0,0,1)";
    this.ctx.arc(pos.x - offset, pos.y - offset, this.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  update(): void {
    this.clear();
    for (let i = this.trail.length - 1; i >= 0; i -= 1) {
      const point = this.trail[i];
      const f = point.force * this.speed * (1 - point.age / this.maxAge);
      point.x += point.vx * f;
      point.y += point.vy * f;
      point.age += 1;
      if (point.age > this.maxAge) this.trail.splice(i, 1);
      else this.drawPoint(point);
    }
  }
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Shader create failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info || "Shader compile failed");
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertSrc: string,
  fragSrc: string,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("Program create failed");
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(info || "Program link failed");
  }
  return program;
}

/**
 * Create a liquid-gradient WebGL engine on `canvas`.
 * Returns `null` when WebGL is unavailable or shaders fail to compile.
 */
export function createLiquidGradient(
  canvas: HTMLCanvasElement,
  options: LiquidGradientOptions = {},
): LiquidGradientEngine | null {
  const maybeGl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "low-power",
  });
  if (!maybeGl) return null;
  // Narrow for nested closures (vitest vue-tsc typecheck).
  const gl = maybeGl as WebGLRenderingContext;

  const reducedMotion = Boolean(options.reducedMotion);
  let styleRoot: HTMLElement =
    options.styleRoot ??
    (canvas.parentElement as HTMLElement | null) ??
    document.documentElement;

  let touch: TouchTexture;
  try {
    touch = new TouchTexture();
  } catch {
    return null;
  }

  let program: WebGLProgram;
  try {
    program = createProgram(gl, VERT, FRAG);
  } catch {
    return null;
  }

  const buffer = gl.createBuffer();
  const touchTex = gl.createTexture();
  if (!buffer || !touchTex) return null;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  gl.bindTexture(gl.TEXTURE_2D, touchTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    touch.canvas,
  );

  const locs = {
    aPos: gl.getAttribLocation(program, "aPos"),
    uTime: gl.getUniformLocation(program, "uTime"),
    uResolution: gl.getUniformLocation(program, "uResolution"),
    uColor1: gl.getUniformLocation(program, "uColor1"),
    uColor2: gl.getUniformLocation(program, "uColor2"),
    uColor3: gl.getUniformLocation(program, "uColor3"),
    uColor4: gl.getUniformLocation(program, "uColor4"),
    uSpeed: gl.getUniformLocation(program, "uSpeed"),
    uIntensity: gl.getUniformLocation(program, "uIntensity"),
    uTouchTexture: gl.getUniformLocation(program, "uTouchTexture"),
    uGrainIntensity: gl.getUniformLocation(program, "uGrainIntensity"),
    uBase: gl.getUniformLocation(program, "uBase"),
    uGradientSize: gl.getUniformLocation(program, "uGradientSize"),
    uPrimaryWeight: gl.getUniformLocation(program, "uPrimaryWeight"),
    uNeutralWeight: gl.getUniformLocation(program, "uNeutralWeight"),
    uDistort: gl.getUniformLocation(program, "uDistort"),
    uAlpha: gl.getUniformLocation(program, "uAlpha"),
  };

  const colors = {
    primary: [0.36, 0.49, 0.98] as Rgb,
    primarySoft: [0.45, 0.58, 0.98] as Rgb,
    neutralA: [0.15, 0.15, 0.16] as Rgb,
    neutralB: [0.25, 0.25, 0.27] as Rgb,
    base: [0.09, 0.09, 0.1] as Rgb,
  };

  const knobs: LiquidKnobs = { ...DEFAULT_KNOBS };

  let running = false;
  let raf = 0;
  let time = 0;
  let lastTs = 0;
  let width = 0;
  let height = 0;

  function resolveStyleRoot(root?: HTMLElement): HTMLElement {
    if (root) {
      styleRoot = root;
      return root;
    }
    return styleRoot;
  }

  function syncThemeColors(root?: HTMLElement): void {
    const el = resolveStyleRoot(root);
    const themeEl = document.documentElement;
    const styles = getComputedStyle(el);
    const themeStyles = el === themeEl ? styles : getComputedStyle(themeEl);

    const primary =
      parseRgbTriplet(themeStyles.getPropertyValue("--vd-color-primary-rgb")) ||
      parseCssColor(themeStyles.getPropertyValue("--vd-color-primary")) ||
      parseRgbTriplet(styles.getPropertyValue("--vd-color-primary-rgb")) ||
      parseCssColor(styles.getPropertyValue("--vd-color-primary")) ||
      colors.primary;
    const base =
      parseCssColor(themeStyles.getPropertyValue("--vd-bg-primary")) ||
      parseCssColor(themeStyles.getPropertyValue("--bg-primary")) ||
      parseCssColor(styles.getPropertyValue("--vd-bg-primary")) ||
      colors.base;
    const n8 =
      parseCssColor(themeStyles.getPropertyValue("--vd-neutral-8")) ||
      ([0.15, 0.15, 0.15] as Rgb);
    const n6 =
      parseCssColor(themeStyles.getPropertyValue("--vd-neutral-6")) ||
      ([0.32, 0.32, 0.32] as Rgb);
    const n2 =
      parseCssColor(themeStyles.getPropertyValue("--vd-neutral-2")) ||
      ([0.9, 0.9, 0.9] as Rgb);
    const isDark = (themeEl.getAttribute("data-theme") || "dark") === "dark";

    colors.primary = primary;
    colors.primarySoft = mixRgb(primary, base, isDark ? 0.25 : 0.35);
    colors.neutralA = isDark
      ? mixRgb(n8, base, 0.35)
      : mixRgb(n2, base, 0.2);
    colors.neutralB = isDark
      ? mixRgb(n6, primary, 0.12)
      : mixRgb(n6, primary, 0.08);
    colors.base = base;
  }

  function syncKnobs(root?: HTMLElement): void {
    const el = resolveStyleRoot(root);
    const styles = getComputedStyle(el);
    knobs.speed = readCssNumber(styles, "--vd-liquid-speed", DEFAULT_KNOBS.speed);
    knobs.intensity = readCssNumber(
      styles,
      "--vd-liquid-intensity",
      DEFAULT_KNOBS.intensity,
    );
    knobs.grain = readCssNumber(styles, "--vd-liquid-grain", DEFAULT_KNOBS.grain);
    knobs.distort = readCssNumber(
      styles,
      "--vd-liquid-distort",
      DEFAULT_KNOBS.distort,
    );
    knobs.gradientSize = readCssNumber(
      styles,
      "--vd-liquid-gradient-size",
      DEFAULT_KNOBS.gradientSize,
    );
    knobs.primaryWeight = readCssNumber(
      styles,
      "--vd-liquid-primary-weight",
      DEFAULT_KNOBS.primaryWeight,
    );
    knobs.neutralWeight = readCssNumber(
      styles,
      "--vd-liquid-neutral-weight",
      DEFAULT_KNOBS.neutralWeight,
    );
    knobs.alpha = readCssNumber(styles, "--vd-liquid-alpha", DEFAULT_KNOBS.alpha);
  }

  function resize(): void {
    const parent = canvas.parentElement;
    const cssW = parent?.clientWidth || window.innerWidth || 1;
    const cssH = parent?.clientHeight || window.innerHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const w = Math.max(1, Math.floor(cssW * dpr));
    const h = Math.max(1, Math.floor(cssH * dpr));
    if (w === width && h === height) return;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    gl.viewport(0, 0, w, h);
  }

  function draw(delta: number): void {
    if (!reducedMotion) {
      time += delta;
      touch.update();
    }
    // Re-read CSS knobs each frame so live --vd-liquid-* overrides apply.
    syncKnobs();
    gl.viewport(0, 0, width, height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(colors.base[0], colors.base[1], colors.base[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(locs.aPos);
    gl.vertexAttribPointer(locs.aPos, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, touchTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      touch.canvas,
    );

    gl.uniform1f(locs.uTime, time);
    gl.uniform2f(locs.uResolution, width, height);
    gl.uniform3f(
      locs.uColor1,
      colors.primary[0],
      colors.primary[1],
      colors.primary[2],
    );
    gl.uniform3f(
      locs.uColor2,
      colors.neutralA[0],
      colors.neutralA[1],
      colors.neutralA[2],
    );
    gl.uniform3f(
      locs.uColor3,
      colors.primarySoft[0],
      colors.primarySoft[1],
      colors.primarySoft[2],
    );
    gl.uniform3f(
      locs.uColor4,
      colors.neutralB[0],
      colors.neutralB[1],
      colors.neutralB[2],
    );
    gl.uniform3f(locs.uBase, colors.base[0], colors.base[1], colors.base[2]);
    gl.uniform1f(locs.uSpeed, reducedMotion ? 0 : knobs.speed);
    gl.uniform1f(locs.uIntensity, knobs.intensity);
    gl.uniform1f(locs.uGrainIntensity, knobs.grain);
    gl.uniform1f(locs.uGradientSize, knobs.gradientSize);
    gl.uniform1f(locs.uPrimaryWeight, knobs.primaryWeight);
    gl.uniform1f(locs.uNeutralWeight, knobs.neutralWeight);
    gl.uniform1f(locs.uDistort, reducedMotion ? 0 : knobs.distort);
    gl.uniform1f(locs.uAlpha, knobs.alpha);
    gl.uniform1i(locs.uTouchTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function tick(ts: number): void {
    if (!running) return;
    if (document.hidden) {
      raf = requestAnimationFrame(tick);
      return;
    }
    const delta = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
    lastTs = ts;
    resize();
    draw(delta);
    if (!reducedMotion) raf = requestAnimationFrame(tick);
  }

  function start(): void {
    if (running) return;
    running = true;
    lastTs = 0;
    syncThemeColors();
    syncKnobs();
    resize();
    if (reducedMotion) {
      draw(0);
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function stop(): void {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function onPointer(clientX: number, clientY: number): void {
    if (!running || reducedMotion) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    touch.addTouch({
      x: (clientX - rect.left) / w,
      y: 1 - (clientY - rect.top) / h,
    });
  }

  function destroy(): void {
    stop();
    gl.deleteTexture(touchTex);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  }

  syncThemeColors();
  syncKnobs();
  return {
    start,
    stop,
    destroy,
    syncThemeColors,
    syncKnobs,
    onPointer,
    resize,
  };
}
