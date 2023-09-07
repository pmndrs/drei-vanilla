import * as THREE from 'three'
import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { OrbitControls, OutlineEffect } from 'three-stdlib'
import { GUI } from 'lil-gui'
import { Outlines, OutlinesType } from '../../src/core/Outlines'

export default {
  title: 'Gizmos/Outlines',
} as Meta

let gui: GUI

let allOutlines: OutlinesType[] = []

const outlinesParams = {
  color: '#ffccff',
  thickness: 0.1,
}

const generateOutlines = () => {
  return Outlines({
    color: new THREE.Color(outlinesParams.color),
    thickness: outlinesParams.thickness,
  })
}

const setupTourMesh = () => {
  const geometry = new THREE.TorusKnotGeometry(1, 0.35, 100, 32)
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0,
  })
  const torusMesh = new THREE.Mesh(geometry, mat)
  torusMesh.position.set(0, 2, 0)

  const outlines = generateOutlines()
  torusMesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  torusMesh.position.set(0, 5, 0)
  torusMesh.add(outlines.group)
  outlines.render()
  allOutlines.push(outlines)
  return torusMesh
}

const setupBox = () => {
  const geometry = new THREE.BoxGeometry(2, 2, 2)
  const mat = new THREE.MeshBasicMaterial()
  const boxMesh = new THREE.Mesh(geometry, mat)
  const outlines = generateOutlines()

  allOutlines.push(outlines)
  boxMesh.add(outlines.group)
  outlines.render()
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

export const OutlinesStory = async () => {
  gui = new GUI({ title: 'Outlines Story', closeFolders: true })
  const { renderer, scene, camera, render } = Setup()
  renderer.shadowMap.enabled = true
  camera.position.set(5, 5, 5)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1, 0)
  controls.update()

  camera.position.set(10, 10, 10)
  scene.add(setupLight())
  scene.add(setupTourMesh())

  const box = setupBox()
  scene.add(box)

  render(() => {
    box.rotation.y += 0.02
  })

  addOutlineGui()
}

OutlinesStory.storyName = 'Default'

const addOutlineGui = () => {
  const params = Object.assign({}, outlinesParams)
  const folder = gui.addFolder('O U T L I N E S')
  folder.open()
  folder.addColor(params, 'color').onChange((color: string) => {
    allOutlines.forEach((outline) => {
      outline.updateProps({ color: new THREE.Color(color) })
    })
  })
  folder.add(params, 'thickness', 0, 0.1, 0.01).onChange((thickness: number) => {
    allOutlines.forEach((outline) => {
      outline.updateProps({ thickness })
    })
  })
}
