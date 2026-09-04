/** GLSL ES 3.00 sources for the arena stage. Palette constants match tokens.css. */

export const QUAD_VS = `#version 300 es
layout(location=0) in vec2 a_pos;
uniform vec4 u_rect;   // x, y, w, h in clip space
uniform vec2 u_uvA;    // uv = v * u_uvA + u_uvB
uniform vec2 u_uvB;
out vec2 v_uv;
out vec2 v_suv;
void main() {
  vec2 v = a_pos * 0.5 + 0.5;
  v_suv = v;
  v_uv = v * u_uvA + u_uvB;
  vec2 p = u_rect.xy + v * u_rect.zw;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

export const LAYER_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec3 u_fogColor;
uniform float u_fog;
uniform float u_alpha;
out vec4 o;
void main() {
  vec4 c = texture(u_tex, v_uv);
  c.rgb = mix(c.rgb, u_fogColor, u_fog);
  o = vec4(c.rgb, c.a * u_alpha);
}`;

export const FIGURE_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform sampler2D u_mask;
uniform vec3 u_tint;
uniform float u_tintAmt;
uniform vec3 u_flash;
uniform float u_flashAmt;
uniform vec3 u_rimColor;
uniform float u_rim;
uniform vec2 u_texel;
uniform float u_desat;
uniform float u_alpha;
out vec4 o;
void main() {
  vec4 c = texture(u_tex, v_uv);
  float m = texture(u_mask, v_uv).a;
  // screen the tint through the silhouette
  vec3 t = 1.0 - (1.0 - c.rgb) * (1.0 - u_tint);
  c.rgb = mix(c.rgb, t, u_tintAmt * m);
  // rim toward the bonfire (lower left): the silhouette edge that faces the light
  float inner = texture(u_mask, v_uv + u_texel * vec2(4.0, 4.0)).a;
  float inner2 = texture(u_mask, v_uv + u_texel * vec2(9.0, 9.0)).a;
  float edge = m * (1.0 - inner) + 0.5 * m * (1.0 - inner2);
  c.rgb += u_rimColor * edge * u_rim;
  c.rgb = mix(c.rgb, u_flash, u_flashAmt * m);
  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  c.rgb = mix(c.rgb, vec3(l), u_desat);
  o = vec4(c.rgb, c.a * u_alpha);
}`;

export const PARTICLE_VS = `#version 300 es
layout(location=0) in vec2 a_pos;
layout(location=1) in float a_size;
layout(location=2) in vec4 a_color;
layout(location=3) in float a_seed;
uniform vec2 u_res;
uniform float u_dpr;
out vec4 v_color;
out float v_seed;
void main() {
  gl_Position = vec4(a_pos / u_res * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = a_size * u_dpr;
  v_color = a_color;
  v_seed = a_seed;
}`;

export const PARTICLE_FS = `#version 300 es
precision mediump float;
in vec4 v_color;
in float v_seed;
uniform float u_time;
out vec4 o;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p) * 2.0;
  float flick = 0.85 + 0.15 * sin(u_time * (6.0 + v_seed * 9.0) + v_seed * 40.0);
  float a = smoothstep(1.0, 0.15, d) * flick;
  float core = smoothstep(0.55, 0.0, d);
  vec3 col = v_color.rgb * (0.55 + core * 0.9);
  float alpha = a * v_color.a;
  o = vec4(col * alpha, alpha);
}`;

export const BRIGHT_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_threshold;
out vec4 o;
void main() {
  vec3 c = texture(u_tex, v_uv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = smoothstep(u_threshold, u_threshold + 0.25, l);
  o = vec4(c * k, 1.0);
}`;

export const BLUR_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_dir;
out vec4 o;
void main() {
  vec3 s = texture(u_tex, v_uv).rgb * 0.227;
  s += texture(u_tex, v_uv + u_dir * 1.385).rgb * 0.316;
  s += texture(u_tex, v_uv - u_dir * 1.385).rgb * 0.316;
  s += texture(u_tex, v_uv + u_dir * 3.231).rgb * 0.070;
  s += texture(u_tex, v_uv - u_dir * 3.231).rgb * 0.070;
  o = vec4(s, 1.0);
}`;

export const COMPOSITE_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform float u_time;
uniform float u_aspect;
uniform vec4 u_shock;    // cx, cy, radius, amp
uniform float u_ca;
uniform vec2 u_caDir;
uniform float u_heat;
uniform float u_desat;
uniform float u_vign;
uniform vec4 u_iris;     // cx, cy, radius, amt
uniform vec3 u_flash;
uniform float u_flashAmt;
uniform float u_bloomAmt;
uniform vec2 u_shake;
uniform vec3 u_zoom;     // cx, cy, zoom
uniform float u_dim;
const vec3 VOID = vec3(0.039, 0.035, 0.031);
const vec3 BLOOD = vec3(0.431, 0.071, 0.071);
out vec4 o;
void main() {
  vec2 uv = (v_uv - u_zoom.xy) / u_zoom.z + u_zoom.xy + u_shake;
  vec2 dv = (uv - u_shock.xy) * vec2(u_aspect, 1.0);
  float d = length(dv);
  float ring = exp(-pow((d - u_shock.z) * 16.0, 2.0)) * u_shock.w;
  uv += (dv / max(d, 1e-4)) * ring * 0.022 / vec2(u_aspect, 1.0);
  float heat = u_heat * smoothstep(0.55, 1.0, 1.0 - uv.y);
  uv.x += sin(uv.y * 70.0 + u_time * 4.0) * 0.0022 * heat;
  uv.y += cos(uv.x * 55.0 + u_time * 3.1) * 0.0012 * heat;
  float ca = u_ca + ring * 0.012;
  vec2 off = u_caDir * ca;
  float r = texture(u_scene, uv + off).r;
  float g = texture(u_scene, uv).g;
  float b = texture(u_scene, uv - off).b;
  vec3 col = vec3(r, g, b);
  col += texture(u_bloom, uv).rgb * u_bloomAmt;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  // desaturate the world but keep what burns: saturated, bright pixels (embers, the rim, glows) stay hot
  float sat = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
  float keep = smoothstep(0.12, 0.4, sat) * smoothstep(0.25, 0.5, l);
  col = mix(col, vec3(l), u_desat * (1.0 - keep));
  float v = smoothstep(0.45, 1.05, length((v_uv - 0.5) * vec2(1.25, 1.0)) * 1.55);
  col = mix(col, VOID, v * 0.55);
  col = mix(col, BLOOD, v * u_vign * (0.75 + 0.25 * sin(u_time * 5.0)));
  float id = length((v_uv - u_iris.xy) * vec2(u_aspect, 1.0));
  float irisMask = smoothstep(u_iris.z, u_iris.z + 0.3, id);
  col = mix(col, VOID, irisMask * u_iris.w);
  col = mix(col, u_flash, u_flashAmt);
  col = mix(col, VOID, u_dim);
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  o = vec4(col, 1.0);
}`;
