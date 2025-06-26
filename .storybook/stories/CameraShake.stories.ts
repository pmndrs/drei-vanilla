import * as THREE from 'three'
import { Setup } from '../Setup'
import GUI from 'lil-gui'
import { Meta } from '@storybook/html'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { GroundedSkybox } from 'three/examples/jsm/objects/GroundedSkybox.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { CameraShake } from '../../src/core/CameraShake.ts'

export default {
  title: 'Staging/CameraShake',
} as Meta

let gui: GUI
let scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, controls: OrbitControls, animateLoop

let cameraShake: CameraShake, clock: THREE.Clock

export const CsStory = async () => {
  const setupResult = Setup()
  scene = setupResult.scene
  camera = setupResult.camera
  renderer = setupResult.renderer
  animateLoop = setupResult.render

  gui = new GUI({ title: CsStory.storyName })
  renderer.shadowMap.enabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  camera.position.set(12, 12, 12)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 6, 0)
  controls.update()

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: 0.3 })
  )
  floor.receiveShadow = true
  scene.add(floor)

  const dirLight = new THREE.DirectionalLight(0xabcdef, 10)
  dirLight.position.set(1, 20, 1)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 1024
  dirLight.shadow.mapSize.height = 1024
  scene.add(dirLight)

  clock = new THREE.Clock()

  const geometry = new THREE.TorusKnotGeometry(3, 1, 100, 32)
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random() }))
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.set(0, 6, 0)
  scene.add(mesh)

  setupEnvironment()

  setupCameraShake()
}

/**
 * Add scene.environment and groundProjected skybox
 */
const setupEnvironment = () => {
  const exrLoader = new EXRLoader()

  // exr from polyhaven.com
  exrLoader.load('round_platform_1k.exr', (exrTex) => {
    exrTex.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = exrTex
    scene.background = exrTex

    const groundProjection = new GroundedSkybox(exrTex, 10, 50)
    groundProjection.position.set(0, 10, 0)
    scene.add(groundProjection)
  })
}

const setupCameraShake = () => {
  cameraShake = new CameraShake(camera)

  // on orbit controls change event , update the initial values of camera shake
  controls.addEventListener('change', () => {
    cameraShake.updateInitialRotation()
  })

  addGui(gui)

  // Add camera shake to the animate loop
  animateLoop(() => {
    const delta = clock.getDelta()
    const elapsedTime = clock.getElapsedTime()
    cameraShake.update(delta, elapsedTime)
  })
}

/**
 * Add gui
 * @param gui gui instance
 */
function addGui(gui: GUI) {
  const folder = gui.addFolder('Camera Shake')
  folder.add(cameraShake, 'intensity', 0, 1, 0.01).listen()
  folder.add(cameraShake, 'decay')
  folder.add(cameraShake, 'decayRate', 0, 1, 0.01)

  folder.add(cameraShake, 'maxYaw', 0.01, Math.PI / 4, 0.01).name('Max Yaw')
  folder.add(cameraShake, 'maxPitch', 0.01, Math.PI / 4, 0.01).name('Max Pitch')
  folder.add(cameraShake, 'maxRoll', 0.01, Math.PI / 4, 0.01).name('Max Roll')

  folder.add(cameraShake, 'yawFrequency', 0.1, 5, 0.1).name('Yaw Frequency').listen()
  folder.add(cameraShake, 'pitchFrequency', 0.1, 5, 0.1).name('Pitch Frequency').listen()
  folder.add(cameraShake, 'rollFrequency', 0.1, 5, 0.1).name('Roll Frequency').listen()
}

CsStory.storyName = 'Default'
