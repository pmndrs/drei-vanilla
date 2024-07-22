import * as THREE from 'three'
import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'lil-gui'
import { Billboard, BillboardProps, BillboardType } from '../../src/core/Billboard'

export default {
  title: 'Abstractions/Billboard',
} as Meta

let gui: GUI

let globalBillboards: BillboardType[] = []

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

const setupLight = () => {
  const dirLight = new THREE.DirectionalLight(0xabcdef, 12)
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

  // Torus billboard
  const torusBillboardParams = {
    follow: true,
    lockX: false,
    lockY: false,
    lockZ: false,
  } as BillboardProps

  const torusBillboard = Billboard()
  const torus = getTorusMesh()
  torus.position.set(1, 2, 0)
  torusBillboard.group.add(torus)
  scene.add(torusBillboard.group)
  globalBillboards.push(torusBillboard)
  addBillboardGui('torus', torusBillboard, torusBillboardParams)

  // Plane billboard
  const planeBillboardParams = {
    follow: true,
    lockX: false,
    lockY: false,
    lockZ: false,
  } as BillboardProps

  const texture = new THREE.TextureLoader().load('photo-1678043639454-dbdf877f0ae8.jpeg')
  const planeBillboard = Billboard()
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ map: texture }))
  plane.position.set(-3, 2, -5)
  planeBillboard.group.add(plane)
  scene.add(planeBillboard.group)
  globalBillboards.push(planeBillboard)
  addBillboardGui('plane', planeBillboard, planeBillboardParams)

  render(() => {
    globalBillboards.forEach((billboard) => {
      billboard.update(camera)
    })
  })
}

const addBillboardGui = (name: string, billboard: BillboardType, params: BillboardProps) => {
  const folder = gui.addFolder(name + ' Billboard')
  folder.open()

  folder.add(params, 'follow').onChange((value: boolean) => {
    billboard.updateProps({ follow: value })
  })
  folder.add(params, 'lockX').onChange((value: boolean) => {
    billboard.updateProps({ lockX: value })
  })
  folder.add(params, 'lockY').onChange((value: boolean) => {
    billboard.updateProps({ lockY: value })
  })
  folder.add(params, 'lockZ').onChange((value: boolean) => {
    billboard.updateProps({ lockZ: value })
  })
}

BillboardStory.storyName = 'Default'
