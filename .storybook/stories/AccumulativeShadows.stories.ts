import * as THREE from 'three'
import { Setup } from '../Setup'
import GUI from 'lil-gui'
import { Meta } from '@storybook/html'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { ProgressiveLightMap, SoftShadowMaterial } from '../../src/core/AccumulativeShadows'

export default {
  title: 'Shaders/AccumulativeShadows',
} as Meta

let gui: GUI,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  animateLoop: (arg0: (time: number) => void) => void

let plm: ProgressiveLightMap, // class handles the shadow accumulation part
  gLights: THREE.Group, // group containing all the random lights
  gPlane: THREE.Mesh, // shadow catching plane
  shadowMaterial: InstanceType<typeof SoftShadowMaterial> // instance of SoftShadowMaterial material applied to plane to make only the shadows visible

const shadowParams = {
  /** Temporal accumulates shadows over time which is more performant but has a visual regression over instant results, false  */
  temporal: true,

  /** How many frames it can render, more yields cleaner results but takes more time, 40 */
  frames: 40,

  /** Can limit the amount of frames rendered if frames === Infinity, usually to get some performance back once a movable scene has settled, Infinity */
  limit: Infinity,

  /** If frames === Infinity blend controls the refresh ratio, 100 */
  blend: 40,

  /** Scale of the plane,  */
  scale: 10,

  /** Opacity of the plane, 1 */
  opacity: 0.8,

  /** Discards alpha pixels, 0.65 */
  alphaTest: 0.75,

  /** ColorBlend, how much colors turn to black, 0 is black, 2 */
  colorBlend: 2,
}

/**
 * Shadow properties & common dir light properties
 */
const lightParams = {
  /** Light position */
  position: new THREE.Vector3(3, 5, 3),

  /** Radius of the jiggle, higher values make softer light */
  radius: 1,

  /** Amount of lights*/
  amount: 8,

  /** Light intensity */
  intensity: 1,

  /** Ambient occlusion, lower values mean less AO, hight more, you can mix AO and directional light */
  ambient: 0.5,

  bias: 0.001, //shadow bias
  mapSize: 1024, // shadow map res
  size: 8, // shadow camera top,bottom,left,right
  near: 0.5, // shadow camera near
  far: 200, // shadow camera far
}

/**
 * keeping track of shadow render progress
 */
const api = {
  count: 0,
}

export const AccShadowStory = async () => {
  const setupResult = Setup()
  scene = setupResult.scene
  camera = setupResult.camera
  renderer = setupResult.renderer
  animateLoop = setupResult.render

  gui = new GUI({ title: AccShadowStory.storyName })
  renderer.shadowMap.enabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  camera.position.set(2, 3, 4)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.update()

  setupEnvironment()

  // setup accumulative shadows
  setupAccumulativeShadows()

  // add some basic models which cast shadows

  // sphere
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random(), roughness: 0, metalness: 1 })
  )
  sphere.name = 'sphere'
  sphere.castShadow = true
  sphere.receiveShadow = true
  sphere.position.set(2, 0, -1.5)
  scene.add(sphere)

  // cube
  const cube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 1).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random(), roughness: 0.3, metalness: 0 })
  )
  cube.name = 'cube'
  cube.castShadow = true
  cube.receiveShadow = true
  cube.position.set(-1.5, 0, 1.5)
  scene.add(cube)

  // torus
  const torus = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.5, 0.2, 80, 64).translate(0, 0.9, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random(), roughness: 0.3, metalness: 0 })
  )
  torus.name = 'torus'
  torus.castShadow = true
  torus.receiveShadow = true
  torus.position.set(0, 0, 0)
  scene.add(torus)

  // apart from clearing the shadows ,this also traverses the scene and finds which objects need to cast shadows
  // so call it once all the objects are loaded
  plm.clear()
}

/**
 * Setup HDRI and background
 */
const setupEnvironment = () => {
  const exrLoader = new EXRLoader()
  scene.background = new THREE.Color('grey')
  gui.addColor(scene, 'background')

  // exr from polyhaven.com
  exrLoader.load('dancing_hall_1k.exr', (exrTex) => {
    exrTex.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = exrTex
  })
}

/**
 * Setup shadow catching plane
 */
const setupAccumulativeShadows = () => {
  plm = new ProgressiveLightMap(renderer, scene, 1024)

  // Material applied to the shadow-catching plane
  shadowMaterial = new SoftShadowMaterial({
    map: plm.progressiveLightMap2.texture, // Ignore TypeScript error, this texture contains the rendered shadow image
    transparent: true,
    depthWrite: false,
    toneMapped: true,
    blend: shadowParams.colorBlend, // Color blend
    alphaTest: 0, // Set to 0 so that the first frame, where nothing is computed, does not show a black plane
  })

  // shadow catching plane
  gPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), shadowMaterial)
  gPlane.scale.setScalar(shadowParams.scale)
  gPlane.receiveShadow = true
  scene.add(gPlane)

  // connect plane to ProgressiveLightMap class
  plm.configure(gPlane)

  // create group to hold the lights
  gLights = new THREE.Group()

  // create directional lights to speed up the convergence
  for (let l = 0; l < lightParams.amount; l++) {
    const dirLight = new THREE.DirectionalLight(0xffffff, lightParams.intensity / lightParams.amount)
    dirLight.name = 'dir_light_' + l
    dirLight.castShadow = true
    dirLight.shadow.bias = lightParams.bias
    dirLight.shadow.camera.near = lightParams.near
    dirLight.shadow.camera.far = lightParams.far
    dirLight.shadow.camera.right = lightParams.size / 2
    dirLight.shadow.camera.left = -lightParams.size / 2
    dirLight.shadow.camera.top = lightParams.size / 2
    dirLight.shadow.camera.bottom = -lightParams.size / 2
    dirLight.shadow.mapSize.width = lightParams.mapSize
    dirLight.shadow.mapSize.height = lightParams.mapSize
    gLights.add(dirLight)
  }

  // add lil-gui parameters
  addPlmGui(gui)

  // request animation frame
  animateLoop(() => {
    temporalUpdate() // add this to raf loop
  })
}

/**
 * Scramble the light positions to form creamy convergence
 */
function randomiseLightPositions() {
  const vLength = lightParams.position.length()

  for (let i = 0; i < gLights.children.length; i++) {
    const light = gLights.children[i]
    if (Math.random() > lightParams.ambient) {
      light.position.set(
        lightParams.position.x + THREE.MathUtils.randFloatSpread(lightParams.radius),
        lightParams.position.y + THREE.MathUtils.randFloatSpread(lightParams.radius),
        lightParams.position.z + THREE.MathUtils.randFloatSpread(lightParams.radius)
      )
    } else {
      let lambda = Math.acos(2 * Math.random() - 1) - Math.PI / 2.0
      let phi = 2 * Math.PI * Math.random()
      light.position.set(
        Math.cos(lambda) * Math.cos(phi) * vLength,
        Math.abs(Math.cos(lambda) * Math.sin(phi) * vLength),
        Math.sin(lambda) * vLength
      )
    }
  }
}

/**
 * Clears the shadows, sets opacity and alphaTest to 0 to make it fully invisible.
 * If temporal is disabled, all shadow frames will be rendered in one go.
 */
function reset() {
  plm.clear()
  shadowMaterial.opacity = 0
  shadowMaterial.alphaTest = 0
  api.count = 0

  // If temporal is disabled and a finite number of frames is specified,
  // accumulate all frames in one shot. Expect the renderer to freeze while it's computing.
  if (!shadowParams.temporal && shadowParams.frames !== Infinity) {
    renderShadows(shadowParams.frames)
  }
}

/**
 * Call this function in the requestAnimationFrame loop.
 * If temporal is true, for each frame rendered, one shadow frame is rendered, thus distributing the stress of rendering the shadows across multiple frames.
 */
function temporalUpdate() {
  // If temporal is true, accumulate one frame at a time, as long as the count is within the specified limit
  if (
    (shadowParams.temporal || shadowParams.frames === Infinity) &&
    api.count < shadowParams.frames &&
    api.count < shadowParams.limit
  ) {
    renderShadows()
    api.count++
  }
}

/**
 * Render shadows into the render target.
 * @param frames The number of frames to render for each call
 */
function renderShadows(frames = 1) {
  shadowParams.blend = Math.max(2, shadowParams.frames === Infinity ? shadowParams.blend : shadowParams.frames)

  // Adapt the opacity-blend ratio to the number of frames
  if (!shadowParams.temporal) {
    shadowMaterial.opacity = shadowParams.opacity
    shadowMaterial.alphaTest = shadowParams.alphaTest
  } else {
    shadowMaterial.opacity = Math.min(
      shadowParams.opacity,
      shadowMaterial.opacity + shadowParams.opacity / shadowParams.blend
    )
    shadowMaterial.alphaTest = Math.min(
      shadowParams.alphaTest,
      shadowMaterial.alphaTest + shadowParams.alphaTest / shadowParams.blend
    )
  }

  // Switch accumulative lights on
  scene.add(gLights)
  // Collect scene lights and meshes
  plm.prepare()
  // Update the lightmap and the accumulative lights
  for (let i = 0; i < frames; i++) {
    randomiseLightPositions()
    plm.update(camera, shadowParams.blend)
  }
  // Switch lights off
  scene.remove(gLights)
  // Restore lights and meshes
  plm.finish()
}

/**
 * Add Gui folders
 * @param gui
 */
function addPlmGui(gui: GUI) {
  const shFolder = gui.addFolder('Shadow Material')
  shFolder.open()
  shFolder.add(shadowParams, 'opacity', 0, 1).onChange((v) => {
    shadowMaterial.opacity = v
  })
  shFolder.add(shadowParams, 'alphaTest', 0, 1).onChange((v) => {
    shadowMaterial.alphaTest = v
  })
  shFolder.addColor(shadowMaterial, 'color')
  shFolder.add(shadowMaterial, 'blend', 0, 3)

  const folder = gui.addFolder('Shadow params')
  folder.open()
  folder.add(shadowParams, 'temporal')
  folder.add(api, 'count').listen().disable()

  const tempObject = {
    reComputeShadows: () => {}, // to make a button in gui
  }
  folder.add(tempObject, 'reComputeShadows').name('Re compute ⚡').onChange(reset)

  folder.add(shadowParams, 'frames', 2, 100, 1).onFinishChange(reset)
  folder
    .add(shadowParams, 'scale', 0.5, 30)
    .onChange((v: number) => {
      gPlane.scale.setScalar(v)
    })
    .onFinishChange(reset)

  folder.add(lightParams, 'radius', 0.1, 5).onFinishChange(reset)
  folder.add(lightParams, 'ambient', 0, 1).onFinishChange(reset)

  const bulbFolder = gui.addFolder('💡 Light source')
  bulbFolder.open()
  bulbFolder.add(lightParams.position, 'x', -5, 5).name('Light Direction X').onFinishChange(reset)
  bulbFolder.add(lightParams.position, 'y', 1, 5).name('Light Direction Y').onFinishChange(reset)
  bulbFolder.add(lightParams.position, 'z', -5, 5).name('Light Direction Z').onFinishChange(reset)
}

AccShadowStory.storyName = 'Default'
