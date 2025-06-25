import * as THREE from 'three'
import { SimplexNoise } from 'three/examples/jsm/Addons.js'

/**
 * Applies a procedural camera shake effect using simplex noise.
 * Call `update()` each frame to animate the shake.
 */
export class CameraShake {
  /** The object (camera or any Object3D) to apply shake to. */
  object: THREE.Object3D

  /** The initial rotation of the object before shake is applied. */
  initialRotation: THREE.Euler

  /** Shake intensity (0 = no shake, 1 = full shake). */
  intensity: number

  /** If true, shake intensity decays over time. */
  decay: boolean

  /** Rate at which intensity decays per second. */
  decayRate: number

  /** Maximum yaw shake in radians. */
  maxYaw: number

  /** Maximum pitch shake in radians. */
  maxPitch: number

  /** Maximum roll shake in radians. */
  maxRoll: number

  /** Frequency of yaw shake. */
  yawFrequency: number

  /** Frequency of pitch shake. */
  pitchFrequency: number

  /** Frequency of roll shake. */
  rollFrequency: number

  /** Internal noise generator for yaw. */
  private yawNoise: SimplexNoise

  /** Internal noise generator for pitch. */
  private pitchNoise: SimplexNoise

  /** Internal noise generator for roll. */
  private rollNoise: SimplexNoise

  /**
   * @param objectToShake The Object3D (usually a Camera) to apply shake to.
   */
  constructor(objectToShake: THREE.Object3D) {
    this.object = objectToShake

    this.initialRotation = new THREE.Euler().copy(this.object.rotation)

    this.intensity = 1
    this.decay = false
    this.decayRate = 0.65
    this.maxYaw = 0.1
    this.maxPitch = 0.1
    this.maxRoll = 0.1
    this.yawFrequency = 0.1
    this.pitchFrequency = 0.1
    this.rollFrequency = 0.1

    this.yawNoise = new SimplexNoise()
    this.pitchNoise = new SimplexNoise()
    this.rollNoise = new SimplexNoise()
  }

  /**
   * Updates the stored initial rotation to match the object's current rotation.
   * Call this if you manually rotate the object and want shake to be relative to the new orientation.
   */
  updateInitialRotation() {
    this.initialRotation.copy(this.object.rotation)
  }

  /**
   * Updates the camera shake effect. Call once per frame.
   * @param delta Time since last frame.
   * @param elapsedTime Total elapsed time.
   */
  update(delta: number, elapsedTime: number) {
    const shake = Math.pow(this.intensity, 2)
    const yaw = this.maxYaw * shake * this.yawNoise.noise(elapsedTime * this.yawFrequency, 1)
    const pitch = this.maxPitch * shake * this.pitchNoise.noise(elapsedTime * this.pitchFrequency, 1)
    const roll = this.maxRoll * shake * this.rollNoise.noise(elapsedTime * this.rollFrequency, 1)

    this.object.rotation.set(
      this.initialRotation.x + pitch,
      this.initialRotation.y + yaw,
      this.initialRotation.z + roll
    )

    if (this.decay && this.intensity > 0) {
      this.intensity -= this.decayRate * delta
      this.intensity = THREE.MathUtils.clamp(this.intensity, 0, 1)
    }
  }
}
