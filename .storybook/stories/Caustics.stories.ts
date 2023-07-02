import * as THREE from 'three'
import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { EXRLoader, GroundProjectedEnv, OrbitControls } from 'three-stdlib'
import { GUI } from 'lil-gui'
import { Caustics, CausticsType } from '../../src/core/Caustics'

export default {
  title: 'Shaders/Caustics',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS
let gui: GUI
let torusMesh: THREE.Mesh
let caustics: CausticsType

const params = {
  animate: true,
}

export const CausticsStory = async () => {
  gui = new GUI({ title: 'Caustics Story', closeFolders: true })
  const { renderer, scene, camera, render } = Setup()
  renderer.shadowMap.enabled = true
  camera.position.set(-15, 15, 15)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.5, 0)
  controls.update()

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: 0.3 })
  )
  floor.receiveShadow = true
  scene.add(floor)

  const dirLight = new THREE.DirectionalLight(0xabcdef, 5)
  dirLight.position.set(15, 15, 15)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 1024
  dirLight.shadow.mapSize.height = 1024
  dirLight.shadow.camera.top = 15
  dirLight.shadow.camera.bottom = -15
  dirLight.shadow.camera.left = -15
  dirLight.shadow.camera.right = 15
  scene.add(dirLight)

  const folder = gui.addFolder('Light Settings')
  folder.add(dirLight, 'intensity', 0, 5)
  folder.addColor(dirLight, 'color')
  folder.add(dirLight.position, 'x', -15, 15).name('position x')
  folder.add(dirLight.position, 'y', -15, 15).name('position y')
  folder.add(dirLight.position, 'z', -15, 15).name('position z')

  setupEnvironment(scene)
  setupCaustics(scene, renderer)

  render((time) => {
    controls.update()
    if (params.animate) {
      torusMesh.rotation.x = time / 5000
      torusMesh.rotation.y = time / 2500
    }
    caustics.update() // render caustics
  })
}

/**
 * Add scene.environment and groundProjected skybox
 */
const setupEnvironment = (scene: THREE.Scene) => {
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

const setupCaustics = (scene: THREE.Scene, renderer: THREE.WebGLRenderer) => {
  const geometry = new THREE.TorusKnotGeometry(3, 1, 100, 32)
  const mat = new THREE.MeshPhysicalMaterial({
    transmission: 1,
    roughness: 0,
  })
  mat.color.setHSL(Math.random(), 1, 0.5)
  mat.thickness = 2
  torusMesh = new THREE.Mesh(geometry, mat)
  torusMesh.material
  torusMesh.position.set(0, 6, 0)

  torusMesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })

  caustics = Caustics(renderer, { frames: Infinity, resolution: 1024, worldRadius: 0.3 })
  caustics.helper.visible = false // start hidden
  scene.add(caustics.group, caustics.helper)

  caustics.group.position.y = 0.001 // to prevent z-fighting with groundProjectedSkybox

  caustics.scene.add(torusMesh)

  addCausticsGui(caustics)

  const torusGui = gui.addFolder('Torus')
  torusGui.addColor(mat, 'color')
  torusGui.add(mat, 'roughness', 0, 1)
  torusGui.add(mat, 'transmission', 0, 1)
  torusGui.add(params, 'animate')
}

function addCausticsGui(caustics: CausticsType) {
  const folder = gui.addFolder('Caustics')
  folder.open()
  folder.addColor(caustics.params, 'color')
  folder.add(caustics.params, 'ior', 0, Math.PI)
  folder.add(caustics.params, 'far', 0, 15).name('Caustics Far')

  folder.add(caustics.helper, 'visible').name('helper')

  folder.add(caustics.params, 'backside').onChange((v) => {
    if (!v) {
      // to prevent last frame from persisting
      caustics.causticsTargetB.dispose()
    }
  })
  folder.add(caustics.params, 'backsideIOR', 0, Math.PI)
  folder.add(caustics.params, 'worldRadius', 0.001, 0.5)
  folder.add(caustics.params, 'intensity', 0, 1)
  folder.add(caustics.params, 'causticsOnly')

  // params.lightSource can be vector3 or an object3d
  if (caustics.params.lightSource instanceof THREE.Vector3) {
    folder.add(caustics.params.lightSource, 'x', -1, 1).name('lightSource X')
    folder.add(caustics.params.lightSource, 'y', -1, 1).name('lightSource Y')
    folder.add(caustics.params.lightSource, 'z', -1, 1).name('lightSource Z')
  }
}

CausticsStory.storyName = 'Default'
