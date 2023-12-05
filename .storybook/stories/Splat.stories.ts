import * as THREE from 'three'
import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GUI } from 'lil-gui'
import { Splat, SplatLoader } from '../../src/core/Splat'

export default {
  title: 'Abstractions/Splat',
} as Meta

let gui: GUI

const SplatParams = {}

export const SplatStory = async () => {
  // gui = new GUI({ title: 'Splat Story', closeFolders: true })
  const { renderer, scene, camera } = Setup()

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1, 0)
  controls.update()

  scene.background = new THREE.Color('white')

  camera.position.set(10, 10, 10)

  loadSplats(renderer, camera, scene)
}

async function loadSplats(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
  const cakewalk = 'https://huggingface.co/cakewalk/splat-data/resolve/main'
  const dylanebert = 'https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/kitchen'

  const loader = new SplatLoader(renderer)
  const [
    shoeSplat,
    plushSplat,
    // kitchenSplat
  ] = await Promise.all([
    loader.loadAsync(`${cakewalk}/nike.splat`),
    loader.loadAsync(`${cakewalk}/plush.splat`),
    // loader.loadAsync(`${dylanebert}/kitchen-7k.splat`),
  ])

  const shoe1 = new Splat(shoeSplat, camera, { alphaTest: 0.1 })
  shoe1.scale.setScalar(0.5)
  shoe1.position.set(0, 1.6, 2)
  scene.add(shoe1)

  // This will re-use the same data, only one load, one parse, one worker, one buffer
  const shoe2 = new Splat(shoeSplat, camera, { alphaTest: 0.1 })
  shoe2.scale.setScalar(0.5)
  shoe2.position.set(0, 1.6, -1.5)
  shoe2.rotation.set(Math.PI, 0, Math.PI)
  scene.add(shoe2)

  const plush = new Splat(plushSplat, camera, { alphaTest: 0.1 })
  plush.scale.setScalar(0.5)
  plush.position.set(-1.5, 1.6, 1)
  scene.add(plush)

  // const kitchen = new Splat(kitchenSplat, camera)
  // kitchen.position.set(0, 0.25, 0)
  // scene.add(kitchen)
}

const addSplatGui = () => {
  const params = Object.assign({}, SplatParams)
  const folder = gui.addFolder('SPLAT')
}

SplatStory.storyName = 'Default'
