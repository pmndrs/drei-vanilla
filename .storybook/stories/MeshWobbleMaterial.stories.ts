import * as THREE from 'three'
import { Setup } from '../Setup'
import GUI from 'lil-gui'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { MeshWobbleMaterial } from '../../src/materials/MeshWobbleMaterial'

export default {
  title: 'Shaders/MeshWobbleMaterial',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS

let gui: GUI, materialGuiFolder: GUI
let scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  animateLoop: (arg0: (time: number) => void) => void,
  meshWobbleMaterial: MeshWobbleMaterial

export const MWMStory = async () => {
  const setupResult = Setup()
  scene = setupResult.scene
  camera = setupResult.camera
  renderer = setupResult.renderer
  animateLoop = setupResult.render

  gui = new GUI({ title: MWMStory.storyName })
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

  setupMeshWobbleMaterial()
}

async function setupMeshWobbleMaterial() {
  const geometry = new THREE.TorusGeometry(1, 0.25, 16, 100)
  meshWobbleMaterial = new MeshWobbleMaterial({ color: '#f25042', factor: 0.75 })

  const mesh = new THREE.Mesh(geometry, meshWobbleMaterial)

  scene.add(mesh)

  createMeshWobbleGUI()

  animateLoop((time) => {
    meshWobbleMaterial.time = time * 0.0025
  })
}

/**
 * Create gui for material properties
 */
function createMeshWobbleGUI() {
  if (materialGuiFolder) {
    materialGuiFolder.destroy()
  }

  const matProps = gui.addFolder('MeshWobbleMaterial id: ' + meshWobbleMaterial.id)

  matProps.addColor(meshWobbleMaterial, 'color')
  matProps.add(meshWobbleMaterial._factor, 'value').min(0.5).max(4).step(0.1).name('factor')

  materialGuiFolder = matProps
}

MWMStory.storyName = 'Torus'
