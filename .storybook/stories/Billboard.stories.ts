import * as THREE from 'three'
import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three-stdlib'
import { GUI } from 'lil-gui'
import { Billboard, BillboardProps, BillboardType } from '../../src/core/Billboard'
import { Text } from '../../src/core/Text'

export default {
  title: 'Abstractions/Billboard',
} as Meta

let gui: GUI

let globalBillboards: BillboardType[] = []

const billboardParams = {
  follow: true,
  lockX: false,
  lockY: false,
  lockZ: false,
} as BillboardProps

const setupBox = () => {
  const geometry = new THREE.BoxGeometry(2, 2, 2)
  const mat = new THREE.MeshBasicMaterial()
  const boxMesh = new THREE.Mesh(geometry, mat)

  return boxMesh
}

const setupText = (pos: [number, number, number]) => {
  const billboard = Billboard({
    ...billboardParams,
  })
  const text = Text({
    text: 'Hello World',
    fontSize: 1,
    color: 'red',
  })
  text.mesh.position.fromArray(pos)
  billboard.group.add(text.mesh)
  globalBillboards.push(billboard)
  return billboard.group
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

  camera.position.set(10, 10, 10)
  scene.add(setupLight())

  const box = setupBox()
  scene.add(box)

  scene.add(setupText([0, 2, 0]))
  scene.add(setupText([8, 2, 0]))
  scene.add(setupText([-8, 2, 0]))

  render(() => {
    globalBillboards.forEach((b) => b.update(camera))
  })

  addOutlineGui()
}

BillboardStory.storyName = 'Default'

const addOutlineGui = () => {
  const params = Object.assign({}, billboardParams)
  const folder = gui.addFolder('B I L L B O A R D')
  folder.open().onChange(() => {
    globalBillboards.forEach((b) => b.updateProps(params))
  })
  folder.add(params, 'follow')
  folder.add(params, 'lockX')
  folder.add(params, 'lockY')
  folder.add(params, 'lockZ')
}
