import * as THREE from 'three'
import { version } from '../helpers/constants'

class SparklesImplMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: 1 },
      },
      vertexShader: /* glsl */ `
        uniform float pixelRatio;
        uniform float time;
        attribute float size;  
        attribute float speed;  
        attribute float opacity;
        attribute vec3 noise;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vOpacity;

        void main() {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          modelPosition.y += sin(time * speed + modelPosition.x * noise.x * 100.0) * 0.2;
          modelPosition.z += cos(time * speed + modelPosition.x * noise.y * 100.0) * 0.2;
          modelPosition.x += cos(time * speed + modelPosition.x * noise.z * 100.0) * 0.2;
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectionPostion = projectionMatrix * viewPosition;
          gl_Position = projectionPostion;
          gl_PointSize = size * 25. * pixelRatio;
          gl_PointSize *= (1.0 / - viewPosition.z);
          vColor = color;
          vOpacity = opacity;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float strength = 0.05 / distanceToCenter - 0.1;
          gl_FragColor = vec4(vColor, strength * vOpacity);
          #include <tonemapping_fragment>
          #include <${version >= 154 ? 'colorspace_fragment' : 'encodings_fragment'}>
        }
      `,
    })
  }

  get time() {
    return this.uniforms.time.value as number
  }
  set time(value) {
    this.uniforms.time.value = value
  }
  get pixelRatio() {
    return this.uniforms.pixelRatio.value as number
  }
  set pixelRatio(value) {
    this.uniforms.pixelRatio.value = value
  }
}

const isFloat32Array = (def: any): def is Float32Array => def && (def as Float32Array).constructor === Float32Array

const expandColor = (v: THREE.Color) => [v.r, v.g, v.b]
const isVector = (v: any): v is THREE.Vector2 | THREE.Vector3 | THREE.Vector4 =>
  v instanceof THREE.Vector2 || v instanceof THREE.Vector3 || v instanceof THREE.Vector4

const normalizeVector = (v: any): number[] => {
  if (Array.isArray(v)) return v
  else if (isVector(v)) return v.toArray()
  return [v, v, v] as number[]
}

function usePropAsIsOrAsAttribute<T extends any>(
  count: number,
  prop?: T | Float32Array,
  setDefault?: (v: T) => number
) {
  if (prop !== undefined) {
    if (isFloat32Array(prop)) {
      return prop as Float32Array
    } else {
      if (prop instanceof THREE.Color) {
        const a = Array.from({ length: count * 3 }, () => expandColor(prop)).flat()
        return Float32Array.from(a)
      } else if (isVector(prop) || Array.isArray(prop)) {
        const a = Array.from({ length: count * 3 }, () => normalizeVector(prop)).flat()
        return Float32Array.from(a)
      }
      return Float32Array.from({ length: count }, () => prop as number)
    }
  }
  return Float32Array.from({ length: count }, setDefault!)
}

export type SparklesProps = {
  /** Number of particles (default: 100) */
  count?: number
  /** Speed of particles (default: 1) */
  speed?: number | Float32Array
  /** Opacity of particles (default: 1) */
  opacity?: number | Float32Array
  /** Color of particles (default: 100) */
  color?: THREE.ColorRepresentation | Float32Array
  /** Size of particles (default: randomized between 0 and 1) */
  size?: number | Float32Array
  /** The space the particles occupy (default: 1) */
  scale?: number | [number, number, number] | THREE.Vector3
  /** Movement factor (default: 1) */
  noise?: number | [number, number, number] | THREE.Vector3 | Float32Array
}

export class Sparkles extends THREE.Points {
  /**
   * Floating, glowing particles.
   */
  constructor({ noise = 1, count = 100, speed = 1, opacity = 1, scale = 1, size, color }: SparklesProps = {}) {
    super(new THREE.BufferGeometry(), new SparklesImplMaterial())

    const material = this.material as SparklesImplMaterial
    material.transparent = true
    material.depthWrite = false

    this.rebuildAttributes({ count, size, opacity, speed, scale, noise, color })
  }

  /**
   * To ensure the particles render at the same size across different pixel densities
   */
  setPixelRatio(pixelRatio: number) {
    const material = this.material as SparklesImplMaterial
    material.pixelRatio = pixelRatio
  }

  /**
   * Recreates the geometry buffers with the passed parameters.
   * Expensive operation - use for setup/configuration, not for animation.
   */
  rebuildAttributes({ noise = 1, count = 100, speed = 1, opacity = 1, scale = 1, size, color }: SparklesProps = {}) {
    const _scale = normalizeVector(scale)
    const positions = Float32Array.from(
      Array.from({ length: count }, () => _scale.map(THREE.MathUtils.randFloatSpread)).flat()
    )
    const sizes = usePropAsIsOrAsAttribute<number>(count, size, Math.random)
    const opacities = usePropAsIsOrAsAttribute<number>(count, opacity)
    const speeds = usePropAsIsOrAsAttribute<number>(count, speed)
    const noises = usePropAsIsOrAsAttribute<typeof noise>(count * 3, noise)
    const colors = usePropAsIsOrAsAttribute<THREE.ColorRepresentation>(
      color === undefined ? count * 3 : count,
      !isFloat32Array(color) ? new THREE.Color(color) : color,
      () => 1
    )

    // set each attribute
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    this.geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))
    this.geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setAttribute('noise', new THREE.BufferAttribute(noises, 3))
  }

  /**
   * Makes the sparkles move by updating the time uniform.
   * Call this in your animation loop.
   * @param elapsedTime Total elapsed time in seconds.
   */
  update(elapsedTime: number) {
    ;(this.material as SparklesImplMaterial).time = elapsedTime
  }
}
