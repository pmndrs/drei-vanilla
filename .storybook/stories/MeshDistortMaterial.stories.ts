import * as THREE from 'three'
import { Setup } from '../Setup'
import GUI from 'lil-gui'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { MeshDistortMaterial } from '../../src/materials/MeshDistortMaterial'

export default {
  title: 'Shaders/MeshDistortMaterial',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS

let gui: GUI, materialGuiFolder: GUI
let scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  animateLoop: (arg0: (time: number) => void) => void,
  meshDistortMaterial: MeshDistortMaterial

export const MDMStory = async () => {
  const setupResult = Setup()
  scene = setupResult.scene
  camera = setupResult.camera
  renderer = setupResult.renderer
  animateLoop = setupResult.render

  gui = new GUI({ title: MDMStory.storyName })
  camera.position.set(0, 0, 5)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.update()

  const ambientLight = new THREE.AmbientLight()
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xabcdef, 10)
  dirLight.position.set(1, 20, 1)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 1024
  dirLight.shadow.mapSize.height = 1024
  scene.add(dirLight)

  setupMeshDistortMaterial()
}

async function setupMeshDistortMaterial() {
  const geometry = new THREE.SphereGeometry(1, 32, 32)
  meshDistortMaterial = new MeshDistortMaterial({ color: '#f25042' })

  meshDistortMaterial._radius.value = 0.2

  const mesh = new THREE.Mesh(geometry, meshDistortMaterial)
  mesh.scale.set(2, 4, 1)

  scene.add(mesh)

  createMeshDistortGUI()

  animateLoop((time) => {
    meshDistortMaterial.time = time * 0.0025
    meshDistortMaterial.distort = THREE.MathUtils.lerp(meshDistortMaterial.distort, 0.4, 0.05)
  })
}

/**
 * Create gui for material properties
 */
function createMeshDistortGUI() {
  if (materialGuiFolder) {
    materialGuiFolder.destroy()
  }

  const matProps = gui.addFolder('MeshDistortMaterial id: ' + meshDistortMaterial.id)

  matProps.addColor(meshDistortMaterial, 'color')
  matProps.add(meshDistortMaterial._radius, 'value').min(0.01).max(0.5).step(0.01).name('radius')

  materialGuiFolder = matProps
}

MDMStory.storyName = 'Sphere'
