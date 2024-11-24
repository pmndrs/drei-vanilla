import * as THREE from 'three'
import GUI from 'lil-gui'
import { Meta } from '@storybook/html'
import { Setup } from '../Setup'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MeshPortalMaterial } from '../../src/core/MeshPortalMaterial'
import { EXRLoader } from 'three/examples/jsm/Addons.js'
export default {
  title: 'Shaders/MeshPortalMaterial/basic',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS

let gui: GUI
let scene: THREE.Scene,
  portalScene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  portalMesh: THREE.Mesh

const rendererSize = new THREE.Vector2()

const portalParams = {
  resolution: 1024,
  renderTarget: new THREE.WebGLRenderTarget(),
}

export const MPMStory = async () => {
  gui = new GUI({ title: MPMStory.storyName })

  renderer = new THREE.WebGLRenderer({ alpha: true, canvas, context })
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  scene = new THREE.Scene()
  portalScene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(45, 1, 1, 1000)
  camera.position.set(2.5, 0, 2.5)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.update()

  setupMainScene()
  setupPortalScene()

  const onResize = () => {
    // resize canvas
    renderer.setPixelRatio(Math.min(2, Math.max(1, window.devicePixelRatio)))
    renderer.setSize(root.clientWidth, root.clientHeight)
    camera.aspect = root.clientWidth / root.clientHeight
    camera.updateProjectionMatrix()

    // update 'rendererSize' vector
    renderer.getSize(rendererSize)
    rendererSize.multiplyScalar(renderer.getPixelRatio())
  }

  onResize()
  window.addEventListener('resize', onResize)

  renderer.setAnimationLoop(() => {
    // render portal scene
    renderer.setRenderTarget(portalParams.renderTarget)
    renderer.render(portalScene, camera)
    renderer.setRenderTarget(null)

    // render main scene
    renderer.render(scene, camera)
  })
}

function setupMainScene() {
  // in the main scene use basic lights
  const ambientLight = new THREE.AmbientLight()
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xabcdef, 10)
  dirLight.position.set(1, 20, 1)
  scene.add(dirLight)

  scene.background = new THREE.Color().set(0xffffff * Math.random())
  const geometry = new THREE.TorusKnotGeometry(0.5, 0.25, 150, 20)
  const material = new THREE.MeshStandardMaterial({
    metalness: 0,
    roughness: 0.2,
    color: 0xffffff * Math.random(),
  })
  const torusMesh = new THREE.Mesh(geometry, material)
  portalScene.add(torusMesh)
  torusMesh.position.z = -1
  scene.add(torusMesh)

  // add GUI
  const fol = gui.addFolder('Main scene')
  fol.open()
  fol.addColor(scene, 'background')
  fol.addColor(material, 'color').name('torus color')
}

function setupPortalScene() {
  // in the portal scene just use and hdri for lighting
  const exrLoader = new EXRLoader()
  exrLoader.load('round_platform_1k.exr', (exrTex) => {
    // exr from polyhaven.com
    exrTex.mapping = THREE.EquirectangularReflectionMapping
    portalScene.environment = exrTex
    portalScene.background = exrTex
  })

  // setup the portal
  portalParams.renderTarget.setSize(portalParams.resolution, portalParams.resolution)

  renderer.getSize(rendererSize)
  rendererSize.multiplyScalar(renderer.getPixelRatio())

  const portalGeometry = new THREE.PlaneGeometry(2, 2)
  const portalMaterial = new MeshPortalMaterial({
    map: portalParams.renderTarget.texture,
    resolution: rendererSize,
  })

  portalMesh = new THREE.Mesh(portalGeometry, portalMaterial)
  scene.add(portalMesh)

  const geometry = new THREE.TorusKnotGeometry(0.5, 0.25, 150, 20)
  const material = new THREE.MeshStandardMaterial({
    metalness: 1,
    roughness: 0.2,
    color: 0xffffff * Math.random(),
  })
  const torusMesh = new THREE.Mesh(geometry, material)
  torusMesh.position.z = -1
  portalScene.add(torusMesh)

  // add gui
  const fol = gui.addFolder('Portal Scene')
  fol.open()
  fol.add(portalScene, 'backgroundBlurriness', 0, 1)
  fol.addColor(material, 'color').name('torus color')

  const pFol = fol.addFolder('Portal settings')
  pFol.add(portalParams, 'resolution', 128, 2048, 256).onChange(() => {
    portalParams.renderTarget.setSize(portalParams.resolution, portalParams.resolution)
  })
  pFol.add(portalMesh.material, 'toneMapped')
  pFol.add(portalMesh.scale, 'x', 0.1, 2).name('scale X')
  pFol.add(portalMesh.scale, 'y', 0.1, 2).name('scale Y')
}

MPMStory.storyName = 'plane'
