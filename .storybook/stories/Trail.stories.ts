import * as THREE from 'three'
import { Setup } from '../Setup'
import GUI from 'lil-gui'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Trail, TrailProps } from '../../src/core/Trail'
export default {
  title: 'Staging/Trails',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS

let gui: GUI
let scene: THREE.Scene,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  animateLoop: (callback: (time: number) => void) => void

export const TrailStory = async () => {
  const setupResult = Setup()
  scene = setupResult.scene
  camera = setupResult.camera
  renderer = setupResult.renderer
  animateLoop = setupResult.render

  gui = new GUI({ title: TrailStory.storyName })
  renderer.shadowMap.enabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  camera.position.set(8, 5, 8)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 2, 0)
  controls.update()

  scene.add(new THREE.AxesHelper())

  scene.background = new THREE.Color(0x666666)
  gui.addColor(scene, 'background').name('Background Color')

  setupTrails()
}

function setupTrails() {
  const lineTrailUpdate = setupLineTrail()
  const instanceTrailUpdate = setupInstanceTrail()

  animateLoop(() => {
    lineTrailUpdate()
    instanceTrailUpdate()
  })
}

function setupLineTrail() {
  const sourceMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 8),
    new THREE.MeshStandardMaterial({ color: 'red', wireframe: true })
  )
  scene.add(sourceMesh)

  const timer = new THREE.Timer()
  const rotateSourceMesh = () => {
    timer.update()

    const time = timer.getElapsed()
    const radius = 5

    sourceMesh.position.x = Math.sin(time) * radius
    sourceMesh.position.y = Math.sin(time * 0.7) * 3 + 2
    sourceMesh.position.z = Math.cos(time) * radius
  }
  rotateSourceMesh()

  const trailParams: TrailProps = {
    width: 5,
    length: 20,
    decay: 1,
    local: false,
    stride: 0,
    interval: 1,
    attenuation: (width) => width,
    target: sourceMesh,

    color: new THREE.Color('hotpink'),
  }

  const trail = new Trail(trailParams)

  scene.add(trail)

  const fol = gui.addFolder('Trail')
  fol.onChange(() => trail.rebuildTrail(trailParams))
  fol.addColor(trailParams, 'color').name('Trail Color')
  fol.add(trailParams, 'length', 1, 50, 0.1).name('Trail Length')
  fol.add(trailParams, 'width', 0, 20, 0.1).name('Trail Width')
  fol.add(trailParams, 'decay', 0, 1, 0.01).name('Trail Decay')
  fol.add(trailParams, 'stride', 0, 0.05, 0.01).name('Trail Stride')
  fol.add(trailParams, 'local').name('Local Space')
  fol.add(trailParams, 'interval', 1, 60, 1).name('Trail Interval')

  const onUpdate = () => {
    rotateSourceMesh()
    trail.update()
  }
  return onUpdate
}

function setupInstanceTrail() {
  const sourceMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.5),
    new THREE.MeshStandardMaterial({ color: 'red', wireframe: true })
  )
  scene.add(sourceMesh)

  const rotateSourceMesh = () => {
    const time = Date.now() * 0.001
    const radius = 5

    sourceMesh.position.x = Math.sin(time) * radius
    sourceMesh.position.y = Math.sin(time * 0.7) * 5 + 2
    sourceMesh.position.z = Math.cos(time) * radius
  }
  rotateSourceMesh()

  const trailParams: TrailProps = {
    width: 1,
    length: 20,
    decay: 1,
    local: false,
    stride: 0,
    interval: 1,
    attenuation: (width) => width,
    target: sourceMesh,
    color: new THREE.Color('red'),

    geometry: new THREE.OctahedronGeometry(0.5),
    material: new THREE.MeshNormalMaterial(),
  }

  const trail = new Trail(trailParams)

  scene.add(trail)

  console.log({
    trail,
    sourceMesh,
  })

  const fol = gui.addFolder('Instance Trail')
  fol.onChange(() => trail.rebuildTrail(trailParams))
  fol.addColor(trailParams, 'color').name('Trail Color')
  fol.add(trailParams, 'length', 1, 50, 0.1).name('Trail Length')
  fol.add(trailParams, 'width', 0, 20, 0.1).name('Trail Width')
  fol.add(trailParams, 'decay', 0, 1, 0.01).name('Trail Decay')
  fol.add(trailParams, 'stride', 0, 1, 0.01).name('Trail Stride')
  fol.add(trailParams, 'local').name('Local Space')
  fol.add(trailParams, 'interval', 1, 60, 1).name('Trail Interval')

  const rendererSize = new THREE.Vector2()
  const onResize = () => {
    renderer.getSize(rendererSize)
    rendererSize.multiplyScalar(renderer.getPixelRatio())
    trail.updateSize(rendererSize.x, rendererSize.y)
  }
  window.addEventListener('resize', onResize)

  const onUpdateLoop = () => {
    rotateSourceMesh()
    trail.update()
  }
  return onUpdateLoop
}

TrailStory.storyName = 'Trail'
