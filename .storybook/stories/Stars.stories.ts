import * as THREE from 'three'
import { Setup } from '../Setup'
import GUI from 'lil-gui'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Stars, StarsProps } from '../../src/core/Stars'
export default {
  title: 'Staging/Stars',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS

let gui: GUI
let scene: THREE.Scene,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  animateLoop: (callback: (time: number) => void) => void

export const StarsStory = async () => {
  const setupResult = Setup()
  scene = setupResult.scene
  camera = setupResult.camera
  renderer = setupResult.renderer
  animateLoop = setupResult.render

  gui = new GUI({ title: StarsStory.storyName })
  renderer.shadowMap.enabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  camera.position.set(8, 5, 8)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 2, 0)
  controls.update()

  scene.add(new THREE.AxesHelper())

  scene.background = new THREE.Color(0x000000)
  gui.addColor(scene, 'background').name('Background Color')

  setupStars()
}

function setupStars() {
  const starParams: StarsProps = {
    radius: 100,
    depth: 50,
    count: 5000,
    saturation: 0,
    factor: 4,
    fade: false,
    speed: 1,
  }
  const stars = new Stars(starParams)

  scene.add(stars)

  const timer = new THREE.Timer()

  // runs on every frame
  animateLoop(() => {
    timer.update()
    const elapsedTime = timer.getElapsed()
    stars.update(elapsedTime)
  })

  // gui
  const updateStars = () => stars.rebuildAttributes(starParams)
  const folder = gui.addFolder('Stars')
  folder.add(starParams, 'radius', 1, 100, 1).onChange(updateStars)
  folder.add(starParams, 'depth', 1, 100, 1).onChange(updateStars)
  folder.add(starParams, 'count', 10, 10000, 10).onChange(updateStars)
  folder.add(starParams, 'saturation', 0, 1, 0.01).onChange(updateStars)
  folder.add(starParams, 'factor', 0.5, 10, 0.1).onChange(updateStars)
  folder.add(starParams, 'fade').onChange(updateStars)
  folder.add(starParams, 'speed', 0, 10, 0.1).onChange(updateStars)
}

StarsStory.storyName = 'Stars'
