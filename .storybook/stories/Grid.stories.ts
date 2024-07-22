import * as THREE from 'three'
import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { GUI } from 'lil-gui'
import { Grid, GridType } from '../../src/core/Grid'

export default {
  title: 'Gizmos/Grid',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS
let gui: GUI

let grid: GridType

export const GridStory = async () => {
  gui = new GUI({ title: 'Grid Story', closeFolders: true })
  const { renderer, scene, camera, render } = Setup()
  renderer.shadowMap.enabled = true
  camera.position.set(5, 5, 5)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1, 0)
  controls.update()

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: 0.3, transparent: true, depthWrite: false, depthTest: true })
  )
  floor.receiveShadow = true
  scene.add(floor)

  const dirLight = new THREE.DirectionalLight(0xabcdef, 5)
  dirLight.position.set(15, 15, 15)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 1024
  dirLight.shadow.mapSize.height = 1024
  const size = 5
  dirLight.shadow.camera.top = size
  dirLight.shadow.camera.bottom = -size
  dirLight.shadow.camera.left = -size
  dirLight.shadow.camera.right = size
  scene.add(dirLight)

  const geometry = new THREE.TorusKnotGeometry(1, 0.35, 100, 32)
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0,
  })
  mat.color.setHSL(Math.random(), 1, 0.5)
  const torusMesh = new THREE.Mesh(geometry, mat)
  torusMesh.position.set(0, 2, 0)

  torusMesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  scene.add(torusMesh)

  const folder = gui.addFolder('Light Settings')
  folder.add(dirLight, 'intensity', 0, 5)
  folder.addColor(dirLight, 'color')
  folder.add(dirLight.position, 'x', -15, 15).name('position x')
  folder.add(dirLight.position, 'y', -15, 15).name('position y')
  folder.add(dirLight.position, 'z', -15, 15).name('position z')

  setupEnvironment(scene)
  setupGrid(scene)

  render((time) => {
    controls.update()
    grid.update(camera)
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
    scene.background = exrTex

    scene.backgroundBlurriness = 0.7
    scene.backgroundIntensity = 0.1
  })
}

function setupGrid(scene: THREE.Scene) {
  grid = Grid({
    args: [10.5, 10.5],
    cellSize: 0.6,
    cellThickness: 1,
    cellColor: new THREE.Color('#6f6f6f'),
    sectionSize: 3.3,
    sectionThickness: 1.5,
    sectionColor: new THREE.Color('#9d4b4b'),
    fadeDistance: 25,
    fadeStrength: 1,
    followCamera: false,
    infiniteGrid: true,
  })
  grid.mesh.position.y = 0.005 // to prevent z-fighting with existing meshes

  scene.add(grid.mesh)

  // don't forget to add " grid.update(camera) " in your animate loop

  addGridGui(grid)
}

const addGridGui = (grid: GridType) => {
  const folder = gui.addFolder('G R I D')
  folder.open()
  folder.addColor(grid.mesh.material, 'cellColor')
  folder.add(grid.mesh.material, 'cellSize', 0.01, 2, 0.1)
  folder.add(grid.mesh.material, 'cellThickness', 0, 5)

  folder.addColor(grid.mesh.material, 'sectionColor')
  folder.add(grid.mesh.material, 'sectionSize', 0.01, 2, 0.1)
  folder.add(grid.mesh.material, 'sectionThickness', 0, 5)

  folder.add(grid.mesh.material, 'fadeDistance', 0, 50)
  folder.add(grid.mesh.material, 'fadeStrength', 0, 1)
  folder.add(grid.mesh.material, 'followCamera')
  folder.add(grid.mesh.material, 'infiniteGrid')
  const sideOptions = {
    FrontSide: THREE.FrontSide,
    BackSide: THREE.BackSide,
    DoubleSide: THREE.DoubleSide,
  }
  folder.add(grid.mesh.material, 'side', sideOptions)

  const tFol = folder.addFolder('Transforms')
  tFol.add(grid.mesh.position, 'x', -3, 3, 0.1).name('Position x')
  tFol.add(grid.mesh.position, 'y', -3, 3, 0.1).name('Position y')
  tFol.add(grid.mesh.position, 'z', -3, 3, 0.1).name('Position z')

  tFol.add(grid.mesh.rotation, 'x', 0, 2 * Math.PI, 0.1).name('Rotation x')
  tFol.add(grid.mesh.rotation, 'y', 0, 2 * Math.PI, 0.1).name('Rotation y')
  tFol.add(grid.mesh.rotation, 'z', 0, 2 * Math.PI, 0.1).name('Rotation z')
}

GridStory.storyName = 'Default'
