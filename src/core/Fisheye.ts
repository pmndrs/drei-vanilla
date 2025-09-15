import * as THREE from 'three'

export type FisheyeProps = {
  /** Zoom factor, 0..1, default:0 */
  zoom?: number
  /** Number of segments, default: 64 */
  segments?: number
  /** Cubemap resolution default: 896 */
  resolution?: number
}

export class Fisheye {
  resolution: number
  segments: number
  zoom: number
  renderTarget: THREE.WebGLCubeRenderTarget
  sphereMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>
  orthoCamera: THREE.OrthographicCamera
  cubeCamera: THREE.CubeCamera
  temp: {
    t: THREE.Vector3
    r: THREE.Quaternion
    s: THREE.Vector3
    e: THREE.Euler
    sphere: THREE.Sphere
    normal: THREE.Vector3
    normalMatrix: THREE.Matrix3
  }
  /**
   * Creates a new Fisheye camera renderer instance
   */
  constructor({ resolution = 896, segments = 64, zoom = 0 }: FisheyeProps = {}) {
    this.resolution = resolution
    this.segments = segments
    this.zoom = zoom

    this.renderTarget = this.createRenderTarget(resolution)
    const geometry = new THREE.SphereGeometry(1, segments, segments)
    const material = new THREE.MeshBasicMaterial({ envMap: this.renderTarget.texture })
    this.sphereMesh = new THREE.Mesh(geometry, material)

    this.orthoCamera = new THREE.OrthographicCamera()
    this.cubeCamera = new THREE.CubeCamera(0.1, 1000, this.renderTarget)

    this.temp = {
      t: new THREE.Vector3(),
      r: new THREE.Quaternion(),
      s: new THREE.Vector3(),
      e: new THREE.Euler(0, Math.PI, 0),
      sphere: new THREE.Sphere(),
      normal: new THREE.Vector3(),
      normalMatrix: new THREE.Matrix3(),
    }

    this.onResize(100, 100)
  }

  /**
   * @private
   * Creates a WebGL cube render target for capturing the 360° environment
   * @param resolution The resolution for each face of the cube texture
   * @returns A configured WebGLCubeRenderTarget with optimal settings for fisheye rendering
   */
  createRenderTarget(resolution: number) {
    const rt = new THREE.WebGLCubeRenderTarget(resolution, {
      stencilBuffer: true,
      depthBuffer: true,
      generateMipmaps: true,
      flipY: true,
      type: THREE.HalfFloatType,
    })
    rt.texture.isRenderTargetTexture = false
    return rt
  }

  /**
   * Updates the cube render target resolution and refreshes associated materials
   * Disposes of the old render target to prevent memory leaks
   * @param resolution New resolution for the cube texture faces
   */
  updateResolution(resolution: number) {
    if (resolution === this.renderTarget.width) return
    this.renderTarget.dispose()
    this.renderTarget = this.createRenderTarget(resolution)
    this.cubeCamera.renderTarget = this.renderTarget
    this.sphereMesh.material.envMap = this.renderTarget.texture
    this.sphereMesh.material.needsUpdate = true
  }

  /**
   * Handles viewport resize by updating camera projection and fisheye sphere scaling
   * Recalculates the orthographic camera bounds and sphere radius based on new dimensions
   * @param width New viewport width in pixels
   * @param height New viewport height in pixels
   */
  onResize(width: number, height: number) {
    const w = width,
      h = height
    this.orthoCamera.position.set(0, 0, 100)
    this.orthoCamera.zoom = 100
    this.orthoCamera.left = w / -2
    this.orthoCamera.right = w / 2
    this.orthoCamera.top = h / 2
    this.orthoCamera.bottom = h / -2

    this.orthoCamera.updateProjectionMatrix()

    const radius = (Math.sqrt(w * w + h * h) / 100) * (0.5 + this.zoom / 2)
    this.sphereMesh.scale.setScalar(radius)
    this.temp.sphere.radius = radius
  }

  /**
   * Computes the correct ray direction for raycasting through the fisheye projection
   * Transforms 2D screen coordinates into 3D world space ray for accurate object picking
   * @param raycaster The Three.js raycaster to modify with the computed ray
   * @param pointer Normalized pointer coordinates (-1 to 1 range)
   * @returns void - modifies the raycaster's ray direction in place
   */
  computeRaycastRayDirection(raycaster: THREE.Raycaster, pointer: THREE.Vector2) {
    /**
     * Event compute by Garrett Johnson https://twitter.com/garrettkjohnson
     * https://discourse.threejs.org/t/how-to-use-three-raycaster-with-a-sphere-projected-envmap/56803/10
     */

    // Raycast from the render camera to the sphere and get the surface normal
    // of the point hit in world space of the sphere scene
    // We have to set the raycaster using the ortho cam and pointer
    // to perform sphere intersections.

    const { orthoCamera: orthoC, temp, cubeCamera: cubeCamera } = this
    const { normal, normalMatrix, sphere: sph } = temp
    raycaster.setFromCamera(pointer, orthoC)
    if (!raycaster.ray.intersectSphere(sph, normal)) return
    else normal.normalize()
    // Get the matrix for transforming normals into world space
    normalMatrix.getNormalMatrix(cubeCamera.matrixWorld)
    // Get the ray
    cubeCamera.getWorldPosition(raycaster.ray.origin)
    raycaster.ray.direction.set(0, 0, 1).reflect(normal)
    raycaster.ray.direction.x *= -1 // flip across X to accommodate the "flip" of the env map
    raycaster.ray.direction.applyNormalMatrix(normalMatrix).multiplyScalar(-1)
  }

  /**
   * Renders the fisheye effect by capturing a 360° cubemap and projecting it onto a sphere
   * Two-pass rendering: first captures the scene to cubemap, then renders the fisheye sphere
   * @param renderer The WebGL renderer to use for rendering
   * @param scene The 3D scene to capture in the fisheye view
   * @param camera The source camera whose position and orientation to use for the cubemap capture
   */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    // copy original camera coords to cube camera
    camera.matrixWorld.decompose(this.temp.t, this.temp.r, this.temp.s)
    this.cubeCamera.position.copy(this.temp.t)
    this.cubeCamera.quaternion.setFromEuler(this.temp.e).premultiply(this.temp.r)

    this.cubeCamera.update(renderer, scene) // render the cubemap
    renderer.render(this.sphereMesh, this.orthoCamera) // render the fisheye
  }
}
