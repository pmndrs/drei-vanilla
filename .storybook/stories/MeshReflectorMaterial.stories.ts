import * as THREE from 'three'
import { Setup } from '../Setup'
import GUI from 'lil-gui'
import { Meta } from '@storybook/html'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'
import { GroundProjectedSkybox } from 'three/examples/jsm/objects/GroundProjectedSkybox'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { MeshReflectorMaterial } from '../../src/materials/MeshReflectorMaterial'
import { BlurPass } from '../../src/materials/BlurPass'

export default {
  title: 'Shaders/MeshReflectorMaterial',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS

const TargetParams = {
  resolution: 1024,
  blurX: 1024,
  blurY: 1024,
  depthScale: 1,
}

const MRMParams = {
  mixBlur: 1,
  mixStrength: 5,
  minDepthThreshold: 0,
  maxDepthThreshold: 1,
  depthToBlurRatioBias: 0.25,
  mirror: 0,
  distortion: 0.25,
  mixContrast: 1,
  reflectorOffset: 0,
}

const params = {
  color: new THREE.Color('#333333'),
  useRoughnessMap: false,
  roughness: 1,
  metalness: 0.6,
  useDistortionMap: false,
  useNormalMap: false,
  normalScale: 1,
  repeat: 5,
}

let gui: GUI, materialGuiFolder: GUI
let scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  animateLoop: (arg0: (time: number) => void) => void,
  roughnessTexture: THREE.Texture,
  normalTexture: THREE.Texture,
  meshReflectorMaterial: MeshReflectorMaterial
const textureLoader = new THREE.TextureLoader()

export const MRMStory = async () => {
  const setupResult = Setup()
  scene = setupResult.scene
  camera = setupResult.camera
  renderer = setupResult.renderer
  animateLoop = setupResult.render

  gui = new GUI({ title: MRMStory.storyName })
  renderer.shadowMap.enabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  camera.position.set(12, 12, 12)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 6, 0)
  controls.update()

  const dirLight = new THREE.DirectionalLight(0xabcdef, 10)
  dirLight.position.set(1, 20, 1)
  dirLight.castShadow = true
  const shadowSize = 10
  dirLight.shadow.camera.left = -shadowSize
  dirLight.shadow.camera.right = shadowSize
  dirLight.shadow.camera.top = shadowSize
  dirLight.shadow.camera.bottom = -shadowSize
  dirLight.shadow.mapSize.width = 1024
  dirLight.shadow.mapSize.height = 1024
  scene.add(dirLight)

  setupEnvironment()
  setupMeshReflectorMaterial()
}

const setupEnvironment = () => {
  const exrLoader = new EXRLoader()

  // exr from polyhaven.com
  exrLoader.load('dancing_hall_1k.exr', (exrTex) => {
    exrTex.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = exrTex
    // scene.background = exrTex

    const groundProjection = new GroundProjectedSkybox(exrTex)
    groundProjection.scale.setScalar(100)
    scene.add(groundProjection)

    const envParams = {
      envEnabled: true,
    }
    gui
      .add(envParams, 'envEnabled')
      .name('Environment')
      .onChange((v) => {
        scene.environment = v ? exrTex : null
      })

    gui.add(groundProjection, 'visible').name('Skybox')
  })
}

async function setupMeshReflectorMaterial() {
  // Add objects to be reflected
  const geometry = new THREE.TorusKnotGeometry(3, 1, 100, 32)
  const model = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial())

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  model.position.set(0, 6, 0)
  scene.add(model)

  const gl = renderer

  let hasBlur = TargetParams.blurX + TargetParams.blurY > 0
  const reflectorPlane = new THREE.Plane()
  const normal = new THREE.Vector3()
  const reflectorWorldPosition = new THREE.Vector3()
  const cameraWorldPosition = new THREE.Vector3()
  const rotationMatrix = new THREE.Matrix4()
  const lookAtPosition = new THREE.Vector3(0, 0, -1)
  const clipPlane = new THREE.Vector4()
  const view = new THREE.Vector3()
  const target = new THREE.Vector3()
  const q = new THREE.Vector4()
  const textureMatrix = new THREE.Matrix4()
  const virtualCamera = new THREE.PerspectiveCamera()

  function getTargets() {
    const parameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
    }
    const fbo1 = new THREE.WebGLRenderTarget(TargetParams.resolution, TargetParams.resolution, parameters)
    fbo1.depthBuffer = true
    fbo1.depthTexture = new THREE.DepthTexture(TargetParams.resolution, TargetParams.resolution)
    fbo1.depthTexture.format = THREE.DepthFormat
    fbo1.depthTexture.type = THREE.UnsignedShortType
    const fbo2 = new THREE.WebGLRenderTarget(TargetParams.resolution, TargetParams.resolution, parameters)

    const blurpass = new BlurPass({
      gl,
      resolution: TargetParams.resolution,
      width: TargetParams.blurX,
      height: TargetParams.blurY,
      minDepthThreshold: MRMParams.minDepthThreshold,
      maxDepthThreshold: MRMParams.maxDepthThreshold,
      depthScale: TargetParams.depthScale,
      depthToBlurRatioBias: MRMParams.depthToBlurRatioBias,
    })

    const reflectorProps = {
      mirror: MRMParams.mirror,
      textureMatrix,
      mixBlur: MRMParams.mixBlur,
      tDiffuse: fbo1.texture,
      tDepth: fbo1.depthTexture,
      tDiffuseBlur: fbo2.texture,
      hasBlur,
      mixStrength: MRMParams.mixStrength,
      minDepthThreshold: MRMParams.minDepthThreshold,
      maxDepthThreshold: MRMParams.maxDepthThreshold,
      depthScale: TargetParams.depthScale,
      depthToBlurRatioBias: MRMParams.depthToBlurRatioBias,
      distortion: MRMParams.distortion,
      mixContrast: MRMParams.mixContrast,
      metalness: params.metalness,
      roughness: params.roughness,
      color: params.color,
    }

    const defines = {
      'defines-USE_BLUR': hasBlur ? '' : undefined,
      'defines-USE_DEPTH': TargetParams.depthScale > 0 ? '' : undefined,
      'defines-USE_DISTORTION': params.useDistortionMap ? '' : undefined,
    }

    return [fbo1, fbo2, blurpass, reflectorProps, defines]
  }

  let [fbo1, fbo2, blurpass, reflectorProps, defines] = getTargets()

  // changing some properties requires creation new instance of mesh reflector materials
  function recreateTargets() {
    console.log('Making new MeshReflectorMaterial instance')
    // dispose old targets
    fbo1.dispose()
    fbo2.dispose()
    blurpass.renderTargetA.dispose()
    blurpass.renderTargetB.dispose()
    blurpass.convolutionMaterial.dispose()

    hasBlur = TargetParams.blurX + TargetParams.blurY > 0
    // update references
    ;[fbo1, fbo2, blurpass, reflectorProps, defines] = getTargets()

    // make a new instance of the material
    meshReflectorMaterial.dispose() //dispose old mat
    meshReflectorMaterial = new MeshReflectorMaterial(reflectorProps)
    meshReflectorMaterial.defines.USE_BLUR = defines['defines-USE_BLUR']
    meshReflectorMaterial.defines.USE_DEPTH = defines['defines-USE_DEPTH']
    meshReflectorMaterial.defines.USE_DISTORTION = defines['defines-USE_DISTORTION']

    updateTextures()

    // apply
    reflectionMesh.material = meshReflectorMaterial
    createMeshReflectorGui()
  }

  meshReflectorMaterial = new MeshReflectorMaterial(reflectorProps)
  meshReflectorMaterial.defines.USE_BLUR = defines['defines-USE_BLUR']
  meshReflectorMaterial.defines.USE_DEPTH = defines['defines-USE_DEPTH']
  meshReflectorMaterial.defines.USE_DISTORTION = defines['defines-USE_DISTORTION']

  const [rough, norm] = await Promise.all([
    textureLoader.loadAsync('./rgh.jpg'),
    textureLoader.loadAsync('./paper_normal.jpg'),
  ])
  roughnessTexture = rough
  normalTexture = norm

  roughnessTexture.wrapS = THREE.RepeatWrapping
  roughnessTexture.wrapT = THREE.RepeatWrapping

  normalTexture.wrapS = THREE.RepeatWrapping
  normalTexture.wrapT = THREE.RepeatWrapping

  normalTexture.repeat.set(5, 5)
  roughnessTexture.repeat.set(5, 5)

  const reflectionMesh = new THREE.Mesh(new THREE.CircleGeometry(20, 32), meshReflectorMaterial)
  reflectionMesh.rotateX(-Math.PI / 2)

  reflectionMesh.name = 'reflection_catcher'
  reflectionMesh.receiveShadow = true
  reflectionMesh.position.set(0, 0.001, 0) // optional : prevent z-fighting with any model's floor
  scene.add(reflectionMesh)

  // GUI

  // Changing these values creates another meshReflector instances and render targets
  const heavyActions = gui.addFolder('⚠ Heavy Actions')
  heavyActions.onChange(recreateTargets)
  heavyActions.open()
  heavyActions.add(TargetParams, 'resolution', 128, 2048, 128).name('⚠ Resolution')
  heavyActions.add(TargetParams, 'blurX', 16, 2048, 128).name('⚠ Blur X')
  heavyActions.add(TargetParams, 'blurY', 16, 2048, 128).name('⚠ Blur Y')
  heavyActions.add(TargetParams, 'depthScale', 0, 4).name('⚠ DEPTH SCALE')

  createMeshReflectorGui()

  const beforeRender = () => {
    reflectorWorldPosition.setFromMatrixPosition(reflectionMesh.matrixWorld)
    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld)
    rotationMatrix.extractRotation(reflectionMesh.matrixWorld)
    normal.set(0, 0, 1)
    normal.applyMatrix4(rotationMatrix)
    reflectorWorldPosition.addScaledVector(normal, MRMParams.reflectorOffset)
    view.subVectors(reflectorWorldPosition, cameraWorldPosition)
    // Avoid rendering when reflector is facing away
    if (view.dot(normal) > 0) return
    view.reflect(normal).negate()
    view.add(reflectorWorldPosition)
    rotationMatrix.extractRotation(camera.matrixWorld)
    lookAtPosition.set(0, 0, -1)
    lookAtPosition.applyMatrix4(rotationMatrix)
    lookAtPosition.add(cameraWorldPosition)
    target.subVectors(reflectorWorldPosition, lookAtPosition)
    target.reflect(normal).negate()
    target.add(reflectorWorldPosition)
    virtualCamera.position.copy(view)
    virtualCamera.up.set(0, 1, 0)
    virtualCamera.up.applyMatrix4(rotationMatrix)
    virtualCamera.up.reflect(normal)
    virtualCamera.lookAt(target)
    virtualCamera.far = camera.far // Used in WebGL Background
    virtualCamera.updateMatrixWorld()
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix)
    // Update the texture matrix
    textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0)
    textureMatrix.multiply(virtualCamera.projectionMatrix)
    textureMatrix.multiply(virtualCamera.matrixWorldInverse)
    textureMatrix.multiply(reflectionMesh.matrixWorld)
    // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
    // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
    reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition)
    reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse)
    clipPlane.set(reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant)
    const projectionMatrix = virtualCamera.projectionMatrix
    q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0]
    q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5]
    q.z = -1.0
    q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14]
    // Calculate the scaled plane vector
    clipPlane.multiplyScalar(2.0 / clipPlane.dot(q))
    // Replacing the third row of the projection matrix
    projectionMatrix.elements[2] = clipPlane.x
    projectionMatrix.elements[6] = clipPlane.y
    projectionMatrix.elements[10] = clipPlane.z + 1.0
    projectionMatrix.elements[14] = clipPlane.w
  }

  // runs on every frame
  animateLoop((time: number) => {
    model.rotation.x = time * 0.0001
    model.rotation.y = time * 0.0002
    model.rotation.z = time * 0.0003

    reflectionMesh.visible = false
    const currentXrEnabled = gl.xr.enabled
    const currentShadowAutoUpdate = gl.shadowMap.autoUpdate
    beforeRender()
    gl.xr.enabled = false
    gl.shadowMap.autoUpdate = false
    gl.setRenderTarget(fbo1)
    gl.state.buffers.depth.setMask(true)
    if (!gl.autoClear) gl.clear()
    gl.render(scene, virtualCamera)
    if (hasBlur) blurpass.render(gl, fbo1, fbo2)

    gl.xr.enabled = currentXrEnabled
    gl.shadowMap.autoUpdate = currentShadowAutoUpdate
    reflectionMesh.visible = true
    gl.setRenderTarget(null)
  })
}

/**
 * Apply or remove textures
 */
function updateTextures() {
  if (params.useRoughnessMap) {
    meshReflectorMaterial.roughnessMap = roughnessTexture
  } else {
    meshReflectorMaterial.roughnessMap = null
  }

  if (params.useDistortionMap) {
    meshReflectorMaterial.distortionMap = roughnessTexture
  } else {
    meshReflectorMaterial.distortionMap = null
  }

  if (params.useNormalMap) {
    meshReflectorMaterial.normalMap = normalTexture
  } else {
    meshReflectorMaterial.normalMap = null
  }

  meshReflectorMaterial.needsUpdate = true
}

/**
 * Create gui for material properties
 */
function createMeshReflectorGui() {
  if (materialGuiFolder) {
    materialGuiFolder.destroy()
  }

  const matProps = gui.addFolder('MeshReflectorMaterial id: ' + meshReflectorMaterial.id)

  matProps.addColor(meshReflectorMaterial, 'color')

  materialGuiFolder = matProps

  matProps.add(params, 'metalness', 0, 1).onChange((v) => {
    meshReflectorMaterial.metalness = v
  })

  matProps.add(params, 'useRoughnessMap').onChange(updateTextures)
  matProps.add(params, 'roughness', 0, 1).onChange((v) => {
    meshReflectorMaterial.roughness = v
  })

  matProps.add(params, 'useNormalMap').onChange(updateTextures)
  matProps.add(params, 'normalScale', 0, 1).onChange((v: number) => {
    meshReflectorMaterial.normalScale.setScalar(v)
  })

  matProps.add(params, 'repeat', 1, 15, 1).onChange((v: any) => {
    roughnessTexture.repeat.setScalar(v)
    normalTexture.repeat.setScalar(v)
  })

  matProps.add(params, 'useDistortionMap').onChange(updateTextures)
  matProps.add(MRMParams, 'distortion', -2, 2).onChange((v) => {
    meshReflectorMaterial.distortion = v
  })
  matProps.add(MRMParams, 'mixStrength', 0, 15).onChange((v) => {
    meshReflectorMaterial.mixStrength = v
  })
  matProps.add(MRMParams, 'mixBlur', 0, 6).onChange((v) => {
    meshReflectorMaterial.mixBlur = v
  })
  matProps.add(MRMParams, 'mixContrast', 0, 5).onChange((v) => {
    meshReflectorMaterial.mixContrast = v
  })
  matProps.add(MRMParams, 'reflectorOffset', -5, 5)

  matProps.add(MRMParams, 'mirror', 0, 1).onChange((v) => {
    meshReflectorMaterial.mirror = v
  })
  matProps.add(MRMParams, 'depthToBlurRatioBias', 0, 1).onChange((v) => {
    meshReflectorMaterial.depthToBlurRatioBias = v
  })

  matProps.add(MRMParams, 'minDepthThreshold', 0, 10).onChange((v) => {
    meshReflectorMaterial.minDepthThreshold = v
  })
  matProps.add(MRMParams, 'maxDepthThreshold', 0, 10).onChange((v) => {
    meshReflectorMaterial.maxDepthThreshold = v
  })
}

MRMStory.storyName = 'TorusKnot'
