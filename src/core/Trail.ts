import * as THREE from 'three'
import { MeshLineGeometry as MeshLineGeometryImpl, MeshLineMaterial } from 'meshline'

type BaseSettings = {
  // Width of the line
  width: number
  // Length of the line
  length: number
  // How fast the line fades away
  decay: number
  // Wether to use the target's world or local positions
  local: boolean
  // Min distance between previous and current points
  stride: number
  // Number of frames to wait before next calculation
  interval: number
  // Number of instances to create for the trail when using custom geometry
  instanceCount: number
}

/**
 * Geometry configuration - both geometry and material must be provided together
 * for instanced rendering, or neither for default line rendering
 */
type GeometrySettings =
  | {
      /** Custom geometry used for InstancedMesh trail,
       * instance count is from instanceCount ,
       * `width` acts as a scale Multiplier*/
      geometry: THREE.BufferGeometry
      /** Custom material for instanced rendering, must be compatible with the geometry */
      material: THREE.Material
    }
  | {
      /** Use default MeshLine geometry */
      geometry?: never
      /** Use default MeshLine material */
      material?: never
    }

export type TrailProps = {
  // Color of the trail
  color?: THREE.ColorRepresentation
  // A function to define the width in each point along it.
  attenuation?: (width: number) => number
  // This object will produce the trail.
  target: THREE.Object3D
} & Partial<BaseSettings> &
  GeometrySettings

const defaults = {
  width: 0.2,
  length: 1,
  decay: 1,
  local: false,
  stride: 0,
  interval: 1,
  instanceCount: 10,
  color: new THREE.Color(0xffffff),
  attenuation: (width: number) => width,
}

const shiftLeft = (collection: Float32Array, steps = 1): Float32Array => {
  collection.set(collection.subarray(steps))
  collection.fill(-Infinity, -steps)
  return collection
}

export type MeshLineGeometry = THREE.Mesh & MeshLineGeometryImpl

export class Trail extends THREE.Group {
  /**
   * A declarative, three.MeshLine based Trails implementation.
   * Add this to the scene, set the target to any mesh and it will give it a beautiful trail.
   */
  trailParams: {
    width: number
    length: number
    decay: number
    local: boolean
    stride: number
    interval: number
    instanceCount: number
    color: THREE.ColorRepresentation
    attenuation: (width: number) => number
    target: THREE.Object3D
  }
  trailData: {
    isUsingCustomGeometry: boolean
    points: Float32Array
    geometry: MeshLineGeometryImpl | THREE.BufferGeometry
    material: MeshLineMaterial | THREE.Material
    mesh: THREE.Mesh | THREE.InstancedMesh
  }
  private trailTemp: {
    frameCount: number
    worldPosition: THREE.Vector3
    prevPosition: THREE.Vector3
    tempObj: THREE.Object3D
    positionArray: number[]
  }
  constructor(props: TrailProps) {
    super()

    if (!props.target) {
      throw new Error('Trail requires a target object to follow.')
    }

    const geometry = props.geometry || new MeshLineGeometryImpl()
    const material =
      props.material ||
      new MeshLineMaterial({
        lineWidth: 0.1,
        sizeAttenuation: 1,
        resolution: new THREE.Vector2(1, 1),
      })

    let mesh: THREE.InstancedMesh | THREE.Mesh
    if (props.geometry) {
      const iMesh = new THREE.InstancedMesh(geometry, material, props.instanceCount || defaults.instanceCount)
      iMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh = iMesh
    } else {
      mesh = new THREE.Mesh(geometry, material)
    }

    this.trailParams = {
      width: props.width || defaults.width,
      length: props.length || defaults.length,
      decay: props.decay || defaults.decay,
      local: props.local || defaults.local,
      stride: props.stride || defaults.stride,
      interval: props.interval || defaults.interval,
      instanceCount: props.instanceCount || defaults.instanceCount,
      color: props.color || defaults.color,
      attenuation: props.attenuation || defaults.attenuation,
      target: props.target,
    }

    this.trailData = {
      isUsingCustomGeometry: !!props.geometry,
      points: new Float32Array(),
      geometry,
      material,
      mesh,
    }

    this.trailTemp = {
      frameCount: 0,
      worldPosition: new THREE.Vector3(),
      prevPosition: new THREE.Vector3(),
      tempObj: new THREE.Object3D(),
      positionArray: [0, 0, 0],
    }

    this.rebuildTrail(props)
  }

  /**
   * Rebuilds the trail geometry and material based on the provided props.
   * This is a heavy operation and should not be called every frame.
   * Use when you need to visually reconfigure the trail (e.g. when using GUI to find the right settings).
   * @param props The new properties to apply to the trail.
   */
  rebuildTrail(props: TrailProps) {
    const { trailParams: tp, trailData: td, trailTemp: tmp } = this

    const filteredProps = Object.fromEntries(Object.entries(props).filter(([_, value]) => value !== undefined))
    Object.assign(tp, filteredProps)

    const { length, width, color, target, instanceCount } = tp

    const pointsArrayLength = length * 10 * 3

    target.getWorldPosition(tmp.worldPosition)

    // Reinitialize points array if length has changed
    if (td.points.length !== pointsArrayLength) {
      td.points = Float32Array.from({ length: pointsArrayLength }, (_, i) => tmp.worldPosition.getComponent(i % 3))
    }

    // Update material color if available
    if (color && 'color' in td.material) td.material.color.set(color)

    // If using instanced geometry, update instance count and mesh
    if (td.isUsingCustomGeometry) {
      const iMesh = td.mesh as THREE.InstancedMesh
      if (iMesh.count !== instanceCount) {
        iMesh.removeFromParent()
        iMesh.dispose()
        td.mesh = new THREE.InstancedMesh(td.geometry, td.material, instanceCount)
        this.updateInstances()
      }
    } else {
      // Update line width for MeshLineMaterial
      if (td.material instanceof MeshLineMaterial) {
        td.material.lineWidth = 0.1 * width
      }
    }

    if (!this.trailData.mesh.parent) {
      this.add(this.trailData.mesh)
    }
  }

  /**
   * Updates the resolution uniform of the trail's material to match the given width and height.
   *
   * This method sets the `resolution` uniform on the `MeshLineMaterial` used by the trail,
   * ensuring that line thickness remains consistent across different screen sizes.
   *
   * @param w - The new width of the viewport or rendering area.
   * @param h - The new height of the viewport or rendering area.
   */
  updateSize(w: number, h: number) {
    const material = this.trailData.material as MeshLineMaterial
    if (material && material.uniforms && material.uniforms.resolution) {
      material.uniforms.resolution.value.set(w, h)
    }
  }

  private updateTrailPoints(anchor: THREE.Object3D) {
    const tp = this.trailParams
    const points = this.trailData.points
    const tmp = this.trailTemp
    let updated = false
    const { local, decay, stride } = tp

    if (tmp.frameCount === 0) {
      let newPosition: THREE.Vector3
      if (local) {
        newPosition = anchor.position
      } else {
        anchor.getWorldPosition(tmp.worldPosition)
        newPosition = tmp.worldPosition
      }

      const steps = 1 * decay
      for (let i = 0; i < steps; i++) {
        if (newPosition.distanceTo(tmp.prevPosition) < stride) continue

        shiftLeft(points, 3)
        newPosition.toArray(tmp.positionArray)
        points.set(tmp.positionArray, points.length - 3)
      }
      tmp.prevPosition.copy(newPosition)
      updated = true
    }
    tmp.frameCount++
    tmp.frameCount = tmp.frameCount % tp.interval

    return updated
  }

  private updateLineMesh() {
    const points = this.trailData.points
    const attenuation = this.trailParams.attenuation
    const geometry = this.trailData.geometry as MeshLineGeometryImpl
    geometry.setPoints(points, attenuation)
  }

  private updateInstances() {
    const instanceMesh = this.trailData.mesh as THREE.InstancedMesh
    const o = this.trailTemp.tempObj
    const tp = this.trailParams
    const points = this.trailData.points
    const scaleMultiplier = tp.width // use width as scale multiplier

    // The number of trail points may exceed the number of instances.
    // Distribute instances evenly along the entire trail, rather than mapping only the first N points.
    const totalInstances = points.length / 3
    const instanceCount = instanceMesh.count
    const instanceCountInv = 1 / instanceCount

    for (let i = 0; i < instanceCount; i++) {
      const pointIndex = Math.floor(i * instanceCountInv * totalInstances) * 3
      // ✅ Direct access instead
      const x = points[pointIndex],
        y = points[pointIndex + 1],
        z = points[pointIndex + 2]

      // Update instance position and scale based on trail data
      o.position.set(x, y, z)
      o.scale.setScalar((i / instanceCount) * scaleMultiplier)
      o.updateMatrixWorld()
      instanceMesh.setMatrixAt(i, o.matrixWorld)
    }
    instanceMesh.instanceMatrix.needsUpdate = true
  }

  /**
   * Updates the trail's position and geometry.
   * Call this method on each frame.
   */
  update() {
    if (!this.parent) return
    const anchor = this.trailParams.target
    const updated = this.updateTrailPoints(anchor)
    if (!updated) return

    if (this.trailData.isUsingCustomGeometry) {
      this.updateInstances()
    } else {
      this.updateLineMesh()
    }
  }
}
