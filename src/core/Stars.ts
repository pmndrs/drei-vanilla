import * as THREE from 'three'
import { version } from '../helpers/constants'

export type StarsProps = {
  /** The radius of the starfield (default 100) */
  radius?: number
  /** The depth of the starfield (default 50) */
  depth?: number
  /** The number of stars (default 5000) */
  count?: number
  /** The factor by which to scale each star (default 4) */
  factor?: number
  /** The saturation of the stars (default 0) */
  saturation?: number
  /** Whether to fade the edge of each star (default false) */
  fade?: boolean
  /** The speed of the stars pulsing (default 1) */
  speed?: number
}

class StarfieldMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: { time: { value: 0.0 }, fade: { value: 1.0 } },
      vertexShader: /* glsl */ `
      uniform float time;
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 0.5);
        gl_PointSize = size * (30.0 / -mvPosition.z) * (3.0 + sin(time + 100.0));
        gl_Position = projectionMatrix * mvPosition;
      }`,
      fragmentShader: /* glsl */ `
      uniform sampler2D pointTexture;
      uniform float fade;
      varying vec3 vColor;
      void main() {
        float opacity = 1.0;
        if (fade == 1.0) {
          float d = distance(gl_PointCoord, vec2(0.5, 0.5));
          opacity = 1.0 / (1.0 + exp(16.0 * (d - 0.25)));
        }
        gl_FragColor = vec4(vColor, opacity);

        #include <tonemapping_fragment>
	      #include <${version >= 154 ? 'colorspace_fragment' : 'encodings_fragment'}>
      }`,
    })
  }
}

const genStar = (r: number) => {
  return new THREE.Vector3().setFromSpherical(
    new THREE.Spherical(r, Math.acos(1 - Math.random() * 2), Math.random() * 2 * Math.PI)
  )
}

export class Stars extends THREE.Points {
  speed: number
  /**
   * Pulsing/Blinking shader-based starfield.
   */
  constructor({
    radius = 100,
    depth = 50,
    count = 5000,
    saturation = 0,
    factor = 4,
    fade = false,
    speed = 1,
  }: StarsProps = {}) {
    super(new THREE.BufferGeometry(), new StarfieldMaterial())

    this.speed = speed

    const material = this.material as StarfieldMaterial
    material.blending = THREE.AdditiveBlending
    material.uniforms.fade.value = fade
    material.depthWrite = false
    material.transparent = true
    material.vertexColors = true
    material.needsUpdate = true

    this.rebuildAttributes({ radius, depth, count, saturation, factor, fade })
  }

  /**
   * Recreates the geometry buffers with the parameters.
   * Expensive operation - use for setup/configuration, not for animation.
   */
  rebuildAttributes({
    radius = 100,
    depth = 50,
    count = 5000,
    saturation = 0,
    factor = 4,
    fade = false,
    speed = 1,
  }: StarsProps) {
    this.speed = speed
    const material = this.material as StarfieldMaterial
    material.uniforms.fade.value = fade

    const positions: number[] = []
    const colors: number[] = []
    const sizes = Array.from({ length: count }, () => (0.5 + 0.5 * Math.random()) * factor)
    const color = new THREE.Color()
    let r = radius + depth
    const increment = depth / count
    for (let i = 0; i < count; i++) {
      r -= increment * Math.random()
      positions.push(...genStar(r).toArray())
      color.setHSL(i / count, saturation, 0.9)
      colors.push(color.r, color.g, color.b)
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(sizes), 1))
  }

  /**
   * Makes the stars pulse by updating its time uniform.
   * Call this in your animation loop.
   * @param elapsedTime Total elapsed time in seconds.
   */
  update(elapsedTime: number): void {
    const material = this.material as StarfieldMaterial
    material.uniforms.time.value = elapsedTime * this.speed
  }
}
