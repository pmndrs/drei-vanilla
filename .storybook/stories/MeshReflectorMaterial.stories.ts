import * as THREE from 'three'
import { Setup } from '../Setup'
import GUI from 'lil-gui'
import { Meta } from '@storybook/html'
import { EXRLoader, GroundProjectedEnv, OrbitControls } from 'three-stdlib'

import { MeshReflectorMaterial, MeshReflectorMaterialProps } from '../../src/materials/MeshReflectorMaterial'
import { BlurPass } from '../../src/materials/BlurPass'

export default {
  title: 'Shaders/MeshReflectorMaterial',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS

const MRMParams = {
  resolution: 1024,
  blurX: 1024,
  blurY: 1024,
  depthScale: 1,
}

const params = {
  useRoughnessMap: false,
  useDistortionMap: false,
  useNormalMap: false,
  normalScale: 1,
  repeat: 5,
}

let gui: GUI
let scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, animateLoop
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
  exrLoader.load('round_platform_1k.exr', (exrTex) => {
    exrTex.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = exrTex
    // scene.background = exrTex

    const groundProjection = new GroundProjectedEnv(exrTex)
    groundProjection.scale.setScalar(100)
    scene.add(groundProjection)
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

  // Add Reflector
  let mixBlur = 1,
    mixStrength = 5,
    minDepthThreshold = 0,
    maxDepthThreshold = 1,
    depthToBlurRatioBias = 0.25,
    mirror = 0,
    distortion = 0.25,
    mixContrast = 1,
    reflectorOffset = 0,
    metalness = 0.6,
    roughness = 1,
    color = new THREE.Color('#151515')

  const gl = renderer

  // blur = Array.isArray(blur) ? blur : [blur, blur]
  let hasBlur = MRMParams.blurX + MRMParams.blurY > 0
  // const materialRef = React.useRef<MeshReflectorMaterialImpl>(null!)
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
      encoding: gl.outputEncoding,
      type: THREE.HalfFloatType,
    }
    const fbo1 = new THREE.WebGLRenderTarget(MRMParams.resolution, MRMParams.resolution, parameters)
    fbo1.depthBuffer = true
    fbo1.depthTexture = new THREE.DepthTexture(MRMParams.resolution, MRMParams.resolution)
    fbo1.depthTexture.format = THREE.DepthFormat
    fbo1.depthTexture.type = THREE.UnsignedShortType
    const fbo2 = new THREE.WebGLRenderTarget(MRMParams.resolution, MRMParams.resolution, parameters)
    const blurpass = new BlurPass({
      gl,
      resolution: MRMParams.resolution,
      width: MRMParams.blurX,
      height: MRMParams.blurY,
      minDepthThreshold,
      maxDepthThreshold,
      depthScale: MRMParams.depthScale,
      depthToBlurRatioBias,
    })

    const reflectorProps = {
      mirror,
      textureMatrix,
      mixBlur,
      tDiffuse: fbo1.texture,
      tDepth: fbo1.depthTexture,
      tDiffuseBlur: fbo2.texture,
      hasBlur,
      mixStrength,
      minDepthThreshold,
      maxDepthThreshold,
      depthScale: MRMParams.depthScale,
      depthToBlurRatioBias,
      distortion,
      mixContrast,
      metalness,
      roughness,
      color,
    }

    const defines = {
      'defines-USE_BLUR': hasBlur ? '' : undefined,
      'defines-USE_DEPTH': MRMParams.depthScale > 0 ? '' : undefined,
      'defines-USE_DISTORTION': params.useDistortionMap ? '' : undefined,
    }
    console.log({ fbo1, fbo2, blurpass, reflectorProps, defines })
    return [fbo1, fbo2, blurpass, reflectorProps, defines]
  }

  let [fbo1, fbo2, blurpass, reflectorProps, defines] = getTargets()

  // changing some properties requires creation new instance of mesh reflector material
  function updateTargets() {
    fbo1.dispose()
    fbo2.dispose()
    blurpass.renderTargetA.dispose()
    blurpass.renderTargetB.dispose()
    blurpass.convolutionMaterial.dispose()

    hasBlur = MRMParams.blurX + MRMParams.blurY > 0
    ;[fbo1, fbo2, blurpass, reflectorProps, defines] = getTargets()

    // remake the material
    material.dispose() //dispose old mat
    material = new MeshReflectorMaterial(reflectorProps)
    material.defines.USE_BLUR = defines['defines-USE_BLUR']
    material.defines.USE_DEPTH = defines['defines-USE_DEPTH']
    material.defines.USE_DISTORTION = defines['defines-USE_DISTORTION']

    updateTextures()

    // apply
    reflectionMesh.material = material
  }

  function updateTextures() {
    if (params.useRoughnessMap) {
      material.roughnessMap = roughMap
    } else {
      material.roughnessMap = null
    }

    if (params.useDistortionMap) {
      material.distortionMap = roughMap
    } else {
      material.distortionMap = null
    }

    if (params.useNormalMap) {
      material.normalMap = nrmMap
    } else {
      material.normalMap = null
    }

    material.needsUpdate = true
  }

  let material = new MeshReflectorMaterial(reflectorProps)
  material.defines.USE_BLUR = defines['defines-USE_BLUR']
  material.defines.USE_DEPTH = defines['defines-USE_DEPTH']
  material.defines.USE_DISTORTION = defines['defines-USE_DISTORTION']

  const [roughMap, nrmMap] = await Promise.all([
    textureLoader.loadAsync('./rgh.jpg'),
    textureLoader.loadAsync('./paper_normal.jpg'),
  ])
  roughMap.wrapS = THREE.RepeatWrapping
  roughMap.wrapT = THREE.RepeatWrapping

  nrmMap.wrapS = THREE.RepeatWrapping
  nrmMap.wrapT = THREE.RepeatWrapping
  nrmMap.repeat.set(5, 5)
  roughMap.repeat.set(5, 5)

  const reflectionMesh = new THREE.Mesh(new THREE.CircleGeometry(20, 32), material)
  reflectionMesh.rotateX(-Math.PI / 2)

  reflectionMesh.name = 'reflection_catcher'
  reflectionMesh.receiveShadow = true
  reflectionMesh.position.set(0, 0.001, 0) // optional : prevent z-fighting with any model's floor
  scene.add(reflectionMesh)

  // GUI

  const matProps = gui.addFolder('Material props')
  matProps.addColor(material, 'color')

  matProps.add(material, 'metalness', 0, 1)

  matProps.add(params, 'useRoughnessMap').onChange(updateTextures)
  matProps.add(material, 'roughness', 0, 1)

  matProps.add(params, 'useDistortionMap').onChange(updateTextures)
  matProps.add(material, 'distortion', -2, 2)

  matProps.add(params, 'useNormalMap').onChange(updateTextures)
  matProps.add(params, 'normalScale', 0, 1).onChange((v: number) => {
    material.normalScale.setScalar(v)
  })

  matProps.add(params, 'repeat', 1, 15, 1).onChange((v) => {
    roughMap.repeat.setScalar(v)
    nrmMap.repeat.setScalar(v)
  })

  matProps.add(material, 'mixStrength', 0, 15)
  matProps.add(material, 'mixBlur', 0, 6)
  matProps.add(material, 'mixContrast', 0, 5)

  // Changing these values creates another meshReflector instances and render targets
  const heavyActions = gui.addFolder('⚠ Heavy Actions')
  heavyActions.onChange(updateTargets)
  heavyActions.open()
  heavyActions.add(MRMParams, 'resolution', 128, 2048, 128).name('⚠ Resolution')
  heavyActions.add(MRMParams, 'blurX', 16, 2048, 128).name('⚠ Blur X')
  heavyActions.add(MRMParams, 'blurY', 16, 2048, 128).name('⚠ Blur Y')
  heavyActions.add(MRMParams, 'depthScale', 0, 10).name('⚠ DEPTH SCALE')

  // call when  camera, reflectorOffset changes
  const beforeRender = () => {
    reflectorWorldPosition.setFromMatrixPosition(reflectionMesh.matrixWorld)
    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld)
    rotationMatrix.extractRotation(reflectionMesh.matrixWorld)
    normal.set(0, 0, 1)
    normal.applyMatrix4(rotationMatrix)
    reflectorWorldPosition.addScaledVector(normal, reflectorOffset)
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
    model.rotation.x += time * 0.00000001
    model.rotation.y += time * 0.00000002
    model.rotation.z += time * 0.00000003

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

MRMStory.storyName = 'TorusKnot'
