import * as THREE from 'three'
import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GUI } from 'lil-gui'
import { Billboard, BillboardProps, BillboardType } from '../../src/core/Billboard'

export default {
  title: 'Abstractions/Billboard',
} as Meta

let gui: GUI

let globalBillboards: BillboardType

const billboardParams = {
  follow: true,
  lockX: false,
  lockY: false,
  lockZ: false,
} as BillboardProps

const getTorusMesh = () => {
  const geometry = new THREE.TorusKnotGeometry(1, 0.35, 100, 32)
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0,
    color: 0xffffff * Math.random(),
  })
  const torusMesh = new THREE.Mesh(geometry, mat)
  torusMesh.castShadow = true
  torusMesh.receiveShadow = true
  return torusMesh
}

// const setupTourMesh = (position: [number, number, number]) => {
//   const geometry = new THREE.TorusKnotGeometry(1, 0.35, 100, 32)
//   const mat = new THREE.MeshStandardMaterial({
//     roughness: 0,
//   })

//   const torusMesh = new THREE.Mesh(geometry, mat)

//   const torusBillboard = Billboard()
//   const group = billboard.group
//   torusMesh.traverse((child) => {
//     if (child instanceof THREE.Mesh) {
//       child.castShadow = true
//       child.receiveShadow = true
//     }
//   })
//   torusMesh.position.fromArray(position)

//   group.add(torusMesh)
//   return group
// }

const setupBox = () => {
  const geometry = new THREE.BoxGeometry(2, 2, 2)
  const mat = new THREE.MeshBasicMaterial()
  const boxMesh = new THREE.Mesh(geometry, mat)

  return boxMesh
}

const setupLight = () => {
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
  return dirLight
}

export const BillboardStory = async () => {
  gui = new GUI({ title: 'Billboard Story', closeFolders: true })
  const { renderer, scene, camera, render } = Setup()
  renderer.shadowMap.enabled = true
  camera.position.set(5, 5, 5)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1, 0)
  controls.update()
  scene.add(new THREE.AmbientLight(0xffffff, 0.1))
  scene.add(new THREE.GridHelper(30))

  camera.position.set(10, 10, 10)
  scene.add(setupLight())

  const torusNormal = getTorusMesh()
  torusNormal.position.set(0, 8, 0)
  scene.add(torusNormal)

  const torus = getTorusMesh()
  torus.position.set(1, 2, 0)

  globalBillboards = Billboard()
  globalBillboards.group.add(torus)
  scene.add(globalBillboards.group)

  const texture = new THREE.TextureLoader().load('photo-1678043639454-dbdf877f0ae8.jpeg')

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ map: texture }))
  plane.position.set(-3, 2, 0)
  globalBillboards.group.add(plane)

  render(() => {
    globalBillboards.update(camera)
  })

  addOutlineGui()
}

BillboardStory.storyName = 'Default'

const addOutlineGui = () => {
  const params = Object.assign({}, billboardParams)
  const folder = gui.addFolder('B I L L B O A R D')
  folder.open()
  folder.add(params, 'follow').onChange((value) => {
    globalBillboard.updateProps({ follow: value })
  })
  folder.add(params, 'lockX').onChange((value) => {
    globalBillboard.updateProps({ lockX: value })
  })
  folder.add(params, 'lockY').onChange((value) => {
    globalBillboard.updateProps({ lockY: value })
  })
  folder.add(params, 'lockZ').onChange((value) => {
    globalBillboard.updateProps({ lockZ: value })
  })
}
