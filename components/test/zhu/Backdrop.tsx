"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/*
  The flowing purple field, as a 360deg surround rather than a flat plane:
  a large sphere seen from inside, coloured by VIEW DIRECTION (like an
  environment map). So when the scroll swings the camera 90deg round the
  mark, the gradient sweeps across the frame instead of the backdrop
  turning edge-on - the same effect as the reference's equirect background.

  Looking ahead it is deep indigo-violet with one hot magenta streak that
  leans toward the cursor; round to the side it warms into magenta and
  lilac, which is where the roles land. Fine grain on top.
*/

const vert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const frag = /* glsl */ `
  precision highp float;
  varying vec3 vWorld;
  uniform float uTime;
  uniform vec2 uMouse;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 d = normalize(vWorld - cameraPosition);
    /* yaw: 0 straight ahead (-z), +pi/2 where the scroll ends up looking (+x) */
    float a = atan(d.x, -d.z);
    float y = d.y;
    float t = uTime;

    vec2 q = vec2(a * 1.7, y * 2.6);
    float n = fbm(q + vec2(t * 0.025, t * 0.018) + fbm(q * 1.3 - t * 0.02));

    vec3 indigo = vec3(0.118, 0.043, 0.310);
    vec3 violet = vec3(0.486, 0.227, 0.929);
    vec3 lilac  = vec3(0.655, 0.545, 0.980);
    vec3 hot    = vec3(1.000, 0.239, 0.545);

    /* side-ness: 0 looking ahead, 1 looking where the roles are */
    float side = smoothstep(0.35, 1.55, a);

    vec3 col = mix(indigo, violet, smoothstep(0.18, 0.78, n + a * 0.22 + 0.05));
    col = mix(col, lilac, smoothstep(0.62, 1.05, n * 0.55 + y * 0.9 + side * 0.25));

    /* the hot streak ahead, a soft diagonal band nudged by the cursor */
    float band = a * 0.9 - y * 0.7 + (n - 0.5) * 0.55 - uMouse.x * 0.08 + uMouse.y * 0.04;
    float streak = exp(-pow((band - 0.42) / 0.13, 2.0));
    col = mix(col, hot, streak * 0.72 * (1.0 - side * 0.6));

    /* round to the side it stays purple - violet into lilac - with the
       magenta as a single band through it rather than the whole field */
    vec3 sideCol = mix(violet, lilac, smoothstep(0.35, 0.95, n + y * 0.7));
    sideCol = mix(sideCol, indigo, smoothstep(0.55, 1.0, abs(y) * 1.3 + (1.0 - n) * 0.35) * 0.6);
    float sideBand = a * 0.6 + y * 0.9 + (n - 0.5) * 0.7;
    sideCol = mix(sideCol, hot, exp(-pow((sideBand - 1.05) / 0.16, 2.0)) * 0.6);
    col = mix(col, sideCol, side * 0.9);

    /* deeper toward top and bottom */
    col = mix(col, indigo * 0.85, smoothstep(0.35, 0.9, abs(y)) * 0.55);

    col += (hash(gl_FragCoord.xy + fract(t * 7.0)) - 0.5) * 0.035;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function Backdrop({ reduced }: { reduced: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0, 0) } }), []);

  useFrame((state, dt) => {
    const m = mat.current;
    if (!m) return;
    if (!reduced) m.uniforms.uTime.value += dt;
    m.uniforms.uMouse.value.lerp(state.pointer, reduced ? 1 : 0.04);
  });

  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[40, 48, 32]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
