import * as THREE from 'three'
import { Setup } from '../Setup'
import GUI from 'lil-gui'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { CLOUD_URL, Clouds, Cloud } from '../../src/core/Cloud'

export default {
  title: 'Staging/Clouds',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS

let gui: GUI
let scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  clock: THREE.Clock,
  animateLoop: (arg0: (time: number) => void) => void

const textureLoader = new THREE.TextureLoader()

export const CloudStory = async () => {
  const setupResult = Setup()
  scene = setupResult.scene
  camera = setupResult.camera
  renderer = setupResult.renderer
  animateLoop = setupResult.render
  clock = new THREE.Clock()

  gui = new GUI({ title: CloudStory.storyName })
  renderer.shadowMap.enabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  camera.position.set(12, 3, 12)

  new OrbitControls(camera, renderer.domElement)

  scene.background = new THREE.Color('skyblue')
  setupLights()
  setupCloud()
}

const setupLights = () => {
  // cloud's default material does not react to hdri, so we need to add punctual lights

  const lightFol = gui.addFolder('Lights').close()
  const ambientLight = new THREE.AmbientLight()
  scene.add(ambientLight)
  lightFol.add(ambientLight, 'intensity', 0, 3)
  const guiParams = {
    lightHelpers: false,
  }

  const lightHelpers: THREE.SpotLightHelper[] = []

  lightFol.add(guiParams, 'lightHelpers').onChange((v: boolean) => {
    lightHelpers.forEach((helper) => (helper.visible = v))
  })

  function addSpotlightGui(spotLight: THREE.SpotLight) {
    const fol = lightFol.addFolder('spotlight')
    fol.onChange(() => {
      lightHelpers.forEach((helper) => helper.update())
    })

    fol.addColor(spotLight, 'color')
    fol.add(spotLight, 'intensity', 0, 30)
    fol.add(spotLight, 'angle', 0, Math.PI / 8)

    fol.add(spotLight, 'penumbra', -1, 1)
  }

  const spotLight1 = new THREE.SpotLight()
  spotLight1.intensity = 30
  spotLight1.position.fromArray([0, 40, 0])
  spotLight1.distance = 45
  spotLight1.decay = 0
  spotLight1.penumbra = 1
  spotLight1.intensity = 30
  const helper1 = new THREE.SpotLightHelper(spotLight1)
  addSpotlightGui(spotLight1)
  helper1.visible = false
  lightHelpers.push(helper1)
  scene.add(spotLight1, helper1)

  const spotLight2 = new THREE.SpotLight('red')
  spotLight2.intensity = 30
  spotLight2.position.fromArray([-20, 0, 10])
  spotLight2.angle = 0.15
  spotLight2.decay = 0
  spotLight2.penumbra = -1
  spotLight2.intensity = 30
  addSpotlightGui(spotLight2)

  const helper2 = new THREE.SpotLightHelper(spotLight2)
  helper2.visible = false
  lightHelpers.push(helper2)
  scene.add(spotLight2, helper2)

  const spotLight3 = new THREE.SpotLight('green')
  spotLight3.intensity = 30
  spotLight3.position.fromArray([20, -10, 10])
  spotLight3.angle = 0.2
  spotLight3.decay = 0
  spotLight3.penumbra = -1
  spotLight3.intensity = 20
  addSpotlightGui(spotLight3)

  const helper3 = new THREE.SpotLightHelper(spotLight3)
  helper3.visible = false
  lightHelpers.push(helper3)
  scene.add(spotLight3, helper3)
}

const setupCloud = async () => {
  const cloudTexture = await textureLoader.loadAsync(CLOUD_URL)

  // create main clouds group
  const clouds = new Clouds({ texture: cloudTexture })
  scene.add(clouds)

  // create first cloud
  const cloud0 = new Cloud()
  clouds.add(cloud0)
  addCloudGui(cloud0)

  // create second cloud
  const cloud1 = new Cloud()
  cloud1.color.set('#111111')
  cloud1.position.set(-10, 4, -5)
  clouds.add(cloud1)
  addCloudGui(cloud1)

  animateLoop(() => {
    // update clouds on each frame
    clouds.update(camera, clock.getElapsedTime(), clock.getDelta())
  })
}

const addCloudGui = (cloud: Cloud) => {
  const fol = gui.addFolder('Edit: ' + cloud.name)

  // during runtime call "cloud.updateCloud()" after changing any cloud property
  fol.onChange(() => cloud.updateClouds())

  fol.addColor(cloud, 'color')
  fol.add(cloud, 'seed', 0, 100, 1)
  fol.add(cloud, 'segments', 1, 80, 1)
  fol.add(cloud, 'volume', 0, 100, 0.1)
  fol.add(cloud, 'opacity', 0, 1, 0.01)
  fol.add(cloud, 'fade', 0, 400, 1)
  fol.add(cloud, 'growth', 0, 20, 1)
  fol.add(cloud, 'speed', 0, 1, 0.01)

  const bFol = fol.addFolder('bounds').close()
  bFol.add(cloud.bounds, 'x', 0, 25, 0.5)
  bFol.add(cloud.bounds, 'y', 0, 25, 0.5)
  bFol.add(cloud.bounds, 'z', 0, 25, 0.5)

  const pFol = fol.addFolder('position').close()
  pFol.add(cloud.position, 'x', -10, 10, 0.1)
  pFol.add(cloud.position, 'y', -10, 10, 0.1)
  pFol.add(cloud.position, 'z', -10, 10, 0.1)
  return fol
}

CloudStory.storyName = 'Two Clouds'
