import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  CylinderGeometry,
  DepthFormat,
  DepthTexture,
  Group,
  HalfFloatType,
  LinearFilter,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  SpotLight,
  SpotLightHelper,
  UnsignedShortType,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three'
import { Setup } from '../Setup'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Meta } from '@storybook/html'
import GUI from 'lil-gui'

// imports
import { SpotLightMaterial } from '../../src/materials/SpotLightMaterial'

export default {
  title: 'Shaders/volumetricSpotlight',
} as Meta

let spotLight: SpotLight, spotLightHelper: SpotLightHelper, gui: GUI

let volumeMaterial: InstanceType<typeof SpotLightMaterial>,
  volumeMesh: Mesh,
  depthTexture: DepthTexture,
  depthTarget: WebGLRenderTarget

const { renderer, scene, camera, render } = Setup()

const rendererSize = new Vector2() // re-usable vector to store viewport resolution

const volumeParams = {
  radiusTop: 0.1,
  helper: false,
  useDepth: false,
  depthResolution: 1024,
}

export const VolumetricSpotlightStory = async () => {
  gui = new GUI({ title: VolumetricSpotlightStory.storyName })

  renderer.shadowMap.enabled = true
  renderer.toneMapping = ACESFilmicToneMapping

  camera.position.set(5, 5, 5)
  new OrbitControls(camera, renderer.domElement)

  scene.add(new AmbientLight(0x666666))

  distributeRandomMeshes()

  setupSpotlight()

  // render((time) => {})
}

/**
 * Setup a volumetric spotlight
 */
function setupSpotlight() {
  spotLight = new SpotLight(0xabcdef, 500)
  spotLight.position.set(1, 4, 1)
  spotLight.angle = Math.PI / 6
  spotLight.distance = 10
  spotLight.penumbra = 0.5
  spotLight.castShadow = true
  spotLight.shadow.mapSize.width = 1024
  spotLight.shadow.mapSize.height = 1024

  scene.add(spotLight)

  spotLightHelper = new SpotLightHelper(spotLight)
  spotLightHelper.visible = false
  scene.add(spotLightHelper)

  // volume

  volumeMaterial = new SpotLightMaterial()
  volumeMaterial.attenuation = spotLight.distance
  volumeMaterial.cameraNear = camera.near
  volumeMaterial.cameraFar = camera.far

  volumeMesh = new Mesh()
  volumeMesh.material = volumeMaterial // new MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.2 })

  updateVolumeGeometry()
  spotLight.add(volumeMesh)

  const worldPosition = new Vector3()
  render((time) => {
    // make spotlight go in a circle
    spotLight.position.x = Math.sin(time * 0.0001) * 2
    spotLight.position.z = Math.cos(time * 0.0001) * 2

    // copy spotlight world properties to the volume mesh
    volumeMaterial.spotPosition.copy(volumeMesh.getWorldPosition(worldPosition))
    volumeMesh.lookAt(spotLight.target.getWorldPosition(worldPosition))

    // render depth if enabled
    if (volumeParams.useDepth) {
      renderDepth()
    }

    if (spotLightHelper.visible) {
      spotLightHelper.update()
    }
  })

  addSpotLightGui(gui)
}

/**
 * Create depthTexture and DepthRender target
 */
function updateDepthTargets() {
  if (depthTexture) depthTexture.dispose()
  depthTexture = new DepthTexture(volumeParams.depthResolution, volumeParams.depthResolution)
  depthTexture.format = DepthFormat
  depthTexture.type = UnsignedShortType
  depthTexture.name = 'Depth_Buffer'

  if (depthTarget) depthTarget.dispose()
  depthTarget = new WebGLRenderTarget(volumeParams.depthResolution, volumeParams.depthResolution, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    type: HalfFloatType,
    depthTexture,
    samples: 0,
  })

  if (volumeParams.useDepth) {
    volumeMaterial.depth = depthTexture
    depthOnResize()
    window.addEventListener('resize', depthOnResize)
  } else {
    volumeMaterial.depth = null
    window.removeEventListener('resize', depthOnResize)
    volumeMaterial.resolution.set(0, 0)
  }
}

/**
 * Render depth data
 */
function renderDepth() {
  volumeMaterial.depth = null
  renderer.setRenderTarget(depthTarget)
  renderer.render(scene, camera)
  renderer.setRenderTarget(null)
  volumeMaterial.depth = depthTexture
}

/**
 * If volumeMaterial.resolution and viewport resolution need to stay in sync to prevent alignment issues
 */
function depthOnResize() {
  renderer.getSize(rendererSize)
  rendererSize.multiplyScalar(renderer.getPixelRatio())
  volumeMaterial.resolution.copy(rendererSize)
}

/**
 * Distribute random spheres, and tall boxes & add ground
 */
function distributeRandomMeshes() {
  // sphereGroup
  const sphereGroup = new Group()
  const sphereRadius = 0.3
  const geometry = new SphereGeometry(sphereRadius).translate(0, sphereRadius, 0)

  for (let i = 0; i < 10; i++) {
    const material = new MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      roughness: Math.random(),
    })
    const sphere = new Mesh(geometry, material)
    sphere.position.x = MathUtils.randFloatSpread(6)
    sphere.position.y = MathUtils.randFloat(0, 3)
    sphere.position.z = MathUtils.randFloatSpread(6)
    sphere.castShadow = true
    sphere.receiveShadow = true
    sphereGroup.add(sphere)
  }
  scene.add(sphereGroup)

  // ground
  const groundMaterial = new MeshStandardMaterial({ color: 0x404040 })

  const ground = new Mesh(new PlaneGeometry(20000, 20000, 8, 8), groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // columns
  const boxGeometry = new BoxGeometry(0.2, 1, 0.2).translate(0, 0.5, 0)
  for (let i = 0; i < 40; i++) {
    const column = new Mesh(boxGeometry, groundMaterial)
    column.castShadow = true
    column.receiveShadow = true
    scene.add(column)
    column.scale.y = MathUtils.randFloat(0.1, 3)
    column.position.set(MathUtils.randFloatSpread(5), 0, MathUtils.randFloatSpread(5))
  }
}

/**
 * Add gui for controls
 * @param gui
 */
function addSpotLightGui(gui: GUI) {
  const folder = gui.addFolder('SpotLight options')
  folder.addColor(spotLight, 'color').onChange(() => {
    spotLightHelper.update()
    volumeMaterial.lightColor.copy(spotLight.color)
  })

  folder.add(volumeParams, 'helper').onChange((v) => {
    spotLightHelper.visible = v
  })

  folder.add(spotLight, 'intensity', 0, 2000)

  folder.add(spotLight, 'penumbra', 0, 1)

  folder.add(spotLight, 'angle', 0, Math.PI / 2).onChange(() => {
    spotLightHelper.update()
    updateVolumeGeometry()
  })

  folder.add(spotLight, 'distance', 1, 10).onChange(() => {
    spotLightHelper.update()
    updateVolumeGeometry()
  })

  const volFolder = gui.addFolder('Volume options')

  volFolder.add(volumeMaterial, 'opacity', 0, 2)
  volFolder.add(volumeMaterial, 'attenuation', 0, 10)
  volFolder.add(volumeMaterial, 'anglePower', 0, 24)
  volFolder.add(volumeParams, 'radiusTop', 0, 1).onChange(() => {
    updateVolumeGeometry()
  })

  volFolder.add(volumeParams, 'useDepth').onChange(updateDepthTargets)
  volFolder.add(volumeParams, 'depthResolution', 128, 2048, 128).onChange(updateDepthTargets)
}

/**
 * Update Volume mesh geometry so it's aligned with the spotlight cone
 */
function updateVolumeGeometry() {
  const distance = spotLight.distance
  const radiusBottom = Math.tan(spotLight.angle) * spotLight.distance
  const radiusTop = volumeParams.radiusTop

  const geometry = new CylinderGeometry(radiusTop, radiusBottom, distance, 128, 64, true)
  geometry.translate(0, -distance / 2, 0)
  geometry.rotateX(-Math.PI / 2)

  volumeMesh.geometry?.dispose() // dispose old geometry
  volumeMesh.geometry = geometry
}

VolumetricSpotlightStory.storyName = 'VolumetricSpotlight'
