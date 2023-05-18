![logo](logo.jpg)

[![Version](https://img.shields.io/npm/v/@pmndrs/vanilla?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@pmndrs/vanilla)
[![Downloads](https://img.shields.io/npm/dt/@pmndrs/vanilla.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@pmndrs/vanilla)
[![Discord Shield](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=ffffff)](https://discord.gg/poimandres)
[![Open in GitHub Codespaces](https://img.shields.io/static/v1?&message=Open%20in%20%20Codespaces&style=flat&colorA=000000&colorB=000000&label=GitHub&logo=github&logoColor=ffffff)](https://github.com/codespaces/new?template_repository=pmndrs%2Fdrei-vanilla)

A growing collection of useful helpers and fully functional, ready-made abstractions for Threejs. If you make a component that is generic enough to be useful to others, think about making it available here through a PR!

![Storybook demos](https://pmndrs.github.io/drei-vanilla/)
Storybook code available under `pmndrs/drei-vanilla/tree/main/.storybook/stories`

```bash
npm install @pmndrs/vanilla
```

### Basic usage:

```jsx
import { pcss, ... } from '@pmndrs/vanilla'
```

### Index

<table>
  <tr>
    <td valign="top">
      <ul>                
        <li><a href="#shaders">Shaders</a></li>
        <ul>
          <li><a href="#pcss">pcss</a></li>
        </ul>
      </ul>
    </td>    
  </tr>
  <tr>
    <td valign="top">
      <ul>                
        <li><a href="#materials">Materials</a></li>
        <ul>
          <li><a href="#meshreflectormaterial">MeshReflectorMaterial</a></li>
          <li><a href="#shadermaterial">shaderMaterial</a></li>
          <li><a href="#discardmaterial">MeshDiscardMaterial</a></li>
          <li><a href="#meshtransmissionmaterial">MeshTransmissionMaterial</a></li>
          <li><a href="#spotlight">SpotLight</a></li>
        </ul>
        <li><a href="#staging">Staging</a></li>
         <ul>
          <li><a href="#accumulativeshadows">AccumulativeShadows</a></li>
         </ul>
      </ul>
    </td>

  </tr>
</table>

# Shaders

#### pcss

[![](https://img.shields.io/badge/-storybook-%23ff69b4)](https://pmndrs.github.io/drei-vanilla/?path=/story/shaders-pcss--pcss-story)

<p>
  <a href="https://codesandbox.io/s/ykfpwf"><img width="20%" src="https://codesandbox.io/api/v1/sandboxes/ykfpwf/screenshot.png" alt="Demo"/></a>
  <a href="https://codesandbox.io/s/dh2jc"><img width="20%" src="https://codesandbox.io/api/v1/sandboxes/dh2jc/screenshot.png" alt="Demo"/></a>
</p>

```tsx
type SoftShadowsProps = {
  /** Size of the light source (the larger the softer the light), default: 25 */
  size?: number
  /** Number of samples (more samples less noise but more expensive), default: 10 */
  samples?: number
  /** Depth focus, use it to shift the focal point (where the shadow is the sharpest), default: 0 (the beginning) */
  focus?: number
}
```

Injects percent closer soft shadows (pcss) into threes shader chunk.

```javascript
// Inject pcss into the shader chunk
const reset = pcss({ size: 25, samples: 10, focus: 0 })
```

The function returns a reset function that can be used to remove the pcss from the shader chunk.

```javascript
// Remove pcss from the shader chunk, and reset the scene
reset(renderer, scene, camera)
```

# Materials

#### shaderMaterial

[![](https://img.shields.io/badge/-storybook-%23ff69b4)](https://pmndrs.github.io/drei-vanilla/?path=/story/shaders-shadermaterial--shader-material-story)

<p>
  <a href="https://codesandbox.io/s/ni6v4"><img width="20%" src="https://codesandbox.io/api/v1/sandboxes/ni6v4/screenshot.png" alt="Demo"/></a>
</p>

Creates a THREE.ShaderMaterial for you with easier handling of uniforms, which are automatically declared as setter/getters on the object and allowed as constructor arguments.

```jsx
const ColorShiftMaterial = shaderMaterial(
  { time: 0, color: new THREE.Color(0.2, 0.0, 0.1) },
  // vertex shader
  /*glsl*/ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment shader
  /*glsl*/ `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    void main() {
      gl_FragColor.rgba = vec4(0.5 + 0.3 * sin(vUv.yxx + time) + color, 1.0);
    }
  `
)

const mesh = new THREE.Mesh(geometry, new ColorShiftMaterial())
```

#### MeshDiscardMaterial

A material that discards fragments. It can be used to render nothing efficiently, but still have a mesh in the scene graph that throws shadows and can be raycast.

```javascript
const mesh = new THREE.Mesh(geometry, new MeshDiscardMaterial())
```

#### MeshTransmissionMaterial

[![](https://img.shields.io/badge/-storybook-%23ff69b4)](https://pmndrs.github.io/drei-vanilla/?path=/story/shaders-meshtransmissionmaterial--mtm-story)

<p>
  <a href="https://codesandbox.io/s/hmgdjq"><img width="20%" src="https://codesandbox.io/api/v1/sandboxes/hmgdjq/screenshot.png" alt="Demo"/></a>
</p>

An improved THREE.MeshPhysicalMaterial. It acts like a normal PhysicalMaterial in terms of transmission support, thickness, ior, roughness, etc., but has chromatic aberration, noise-based roughness blur, (primitive) anisotropy support, and unlike the original it can "see" other transmissive or transparent objects which leads to improved visuals.

Although it should be faster than MPM keep in mind that it can still be expensive as it causes an additional render pass of the scene. Low samples and low resolution will make it faster. If you use roughness consider using a tiny resolution, for instance 32x32 pixels, it will still look good but perform much faster.

For performance and visual reasons the host mesh gets removed from the render-stack temporarily. If you have other objects that you don't want to see reflected in the material just add them to the parent mesh as children.

```typescript
export type MeshTransmissionMaterialProps = {
  /* Transmission, default: 1 */
  _transmission?: number
  /* Thickness (refraction), default: 0 */
  thickness?: number
  /* Roughness (blur), default: 0 */
  roughness?: number
  /* Chromatic aberration, default: 0.03 */
  chromaticAberration?: number
  /* Anisotropy, default: 0.1 */
  anisotropy?: number
  /* Distortion, default: 0 */
  distortion?: number
  /* Distortion scale, default: 0.5 */
  distortionScale: number
  /* Temporal distortion (speed of movement), default: 0.0 */
  temporalDistortion: number
}
```

```javascript
const material = new MeshTransmissionMaterial({
  _transmission: 1,
  thickness: 0,
  roughness: 0,
  chromaticAberration: 0.03,
  anisotropy: 0.1,
  distortion: 0,
  distortionScale: 0.5,
  temporalDistortion: 0.0,
})
```

#### SpotLight

[![](https://img.shields.io/badge/-storybook-%23ff69b4)](<[https://pmndrs.github.io/drei-vanilla/?path=/story/shaders-shadermaterial--shader-material-story](https://pmndrs.github.io/drei-vanilla/?path=/story/shaders-volumetricspotlight--volumetric-spotlight-story)>)

<p>
  <a href="https://codesandbox.io/s/tx1pq"><img width="20%" src="https://codesandbox.io/api/v1/sandboxes/tx1pq/screenshot.png" alt="Demo"/></a>
  <a href="https://codesandbox.io/s/wdzv4"><img width="20%" src="https://codesandbox.io/api/v1/sandboxes/wdzv4/screenshot.png" alt="Demo"/></a>
</p>

A Volumetric spotlight.

```javascript
const material = new SpotLightMaterial({
  opacity: 1, // volume shader opacity
  attenuation: 2.5, // how far the volume will travel
  anglePower: 12, // volume edge fade
  spotPosition: new Vector3(0, 0, 0), // spotlight's world position
  lightColor: new Color('white'), // volume color

  cameraNear: 0, // for depth
  cameraFar: 1, // for depth
  depth: null, // for depth , add depthTexture here
  resolution: new Vector2(0, 0), // for depth , set viewport/canvas resolution here
})
```

Optionally you can provide a depth-buffer which converts the spotlight into a soft particle.

#### MeshReflectorMaterial

[![](https://img.shields.io/badge/-storybook-%23ff69b4)](https://pmndrs.github.io/drei-vanilla/?path=/story/shaders-meshreflectormaterial--mrm-story)

<p>
  <a href="https://codesandbox.io/s/lx2h8"><img width="20%" src="https://codesandbox.io/api/v1/sandboxes/lx2h8/screenshot.png" alt="Demo"/></a>
  <a href="https://codesandbox.io/s/l900i"><img width="20%" src="https://codesandbox.io/api/v1/sandboxes/l900i/screenshot.png" alt="Demo"/></a>
</p>

Easily add reflections and/or blur to any mesh. It takes surface roughness into account for a more realistic effect. This material extends from [THREE.MeshStandardMaterial](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial) and accepts all its props.

###  AccumulativeShadows

[![](https://img.shields.io/badge/-storybook-%23ff69b4)](https://pmndrs.github.io/drei-vanilla/?path=/story/shaders-accumulativeshadows--acc-shadow-story)

<p>
  <a href="https://codesandbox.io/s/hxcc1x"><img width="20%" src="https://codesandbox.io/api/v1/sandboxes/hxcc1x/screenshot.png" alt="Demo"/></a>
</p>

A planar, Y-up oriented shadow-catcher that can accumulate into soft shadows and has zero performance impact after all frames have accumulated. It can be temporal, it will accumulate over time, or instantaneous, which might be expensive depending on how many frames you render.

Refer to storybook code on how to use & what each variable does
