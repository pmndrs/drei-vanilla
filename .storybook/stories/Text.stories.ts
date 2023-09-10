import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three-stdlib'
import { GUI } from 'lil-gui'
import { Text, TextProps, TextType } from '../../src/core/Text'

export default {
  title: 'Abstractions/Text',
} as Meta

let gui: GUI

let textGlobal: TextType
let runtimeParams = {
  animate: false,
}

const textParams: TextProps = {
  color: '#ff0000',
  text: `
LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT,
SED DO EIUSMOD TEMPOR INCIDIDUNT UT LABORE ET DOLORE MAGNA ALIQUA.
UT ENIM AD MINIM VENIAM, QUIS NOSTRUD EXERCITATION ULLAMCO LABORIS
NISI UT ALIQUIP EX EA COMMODO CONSEQUAT. DUIS AUTE IRURE DOLOR IN
REPREHENDERIT IN VOLUPTATE VELIT ESSE CILLUM DOLORE EU FUGIAT NULLA PARIATUR.
EXCEPTEUR SINT OCCAECAT CUPIDATAT NON PROIDENT,
SUNT IN CULPA QUI OFFICIA DESERUNT MOLLIT ANIM ID EST LABORUM.`,
  fontSize: 2,
  maxWidth: 40,
  lineHeight: 1,
  outlineWidth: 0.2,
  outlineColor: '#ffffff',
  outlineBlur: 0,
  strokeWidth: 0,
  strokeColor: '#0000ff',
}

const setupText = () => {
  const text = (textGlobal = Text(textParams))

  const mesh = text.mesh

  return mesh
}

export const TextStory = async () => {
  gui = new GUI({ title: 'Text Story', closeFolders: true })
  const { renderer, scene, camera, render } = Setup()
  renderer.shadowMap.enabled = true
  camera.position.set(0, 0, 70)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0, 0)
  controls.update()

  const textMesh = setupText()
  scene.add(textMesh)

  render(() => {
    if (runtimeParams.animate) textMesh.rotation.y += 0.01
  })

  addOutlineGui()
}

TextStory.storyName = 'Default'

const addOutlineGui = () => {
  const params = Object.assign({}, textParams)
  const folder = gui.addFolder('T E X T')
  folder.open().onChange(() => {
    textGlobal.updateProps(params)
  })
  folder.add(runtimeParams, 'animate')
  folder.addColor(params, 'color')
  folder.add(params, 'fontSize', 0, 4, 0.1)
  folder.add(params, 'maxWidth', 0, 100, 1)
  folder.add(params, 'outlineWidth', 0, 10, 0.1)
  folder.addColor(params, 'outlineColor')
  folder.add(params, 'strokeWidth', 0, 10, 0.1)
  folder.addColor(params, 'strokeColor')
  folder.add(params, 'outlineBlur', 0, 4, 0.1)
}

const preloadParams: TextProps = {
  color: '#ff0000',
  text: `
LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT,
SED DO EIUSMOD TEMPOR INCIDIDUNT UT LABORE ET DOLORE MAGNA ALIQUA.
UT ENIM AD MINIM VENIAM, QUIS NOSTRUD EXERCITATION ULLAMCO LABORIS
NISI UT ALIQUIP EX EA COMMODO CONSEQUAT. DUIS AUTE IRURE DOLOR IN
REPREHENDERIT IN VOLUPTATE VELIT ESSE CILLUM DOLORE EU FUGIAT NULLA PARIATUR.
EXCEPTEUR SINT OCCAECAT CUPIDATAT NON PROIDENT,
SUNT IN CULPA QUI OFFICIA DESERUNT MOLLIT ANIM ID EST LABORUM.`,
  fontSize: 2,
  maxWidth: 40,
  lineHeight: 1,
  font: './font/Kalam-Regular.ttf',
  characters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!?.,:;\'"()[]{}<>|/@\\^$-%+=#_&~*',
  onPreloadEnd: () => {
    console.log('loaded')
  },
}

export const TextPreloadFontStory = () => {
  const { renderer, scene, camera, render } = Setup()
  renderer.shadowMap.enabled = true
  camera.position.set(0, 0, 70)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0, 0)
  controls.update()

  const text = Text(preloadParams)

  const mesh = text.mesh

  scene.add(mesh)
}

TextPreloadFontStory.storyName = 'PreloadFont'
