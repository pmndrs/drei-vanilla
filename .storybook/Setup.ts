import { PerspectiveCamera, Scene, sRGBEncoding, WebGLRenderer, REVISION, ACESFilmicToneMapping } from 'three'
import { addons } from '@storybook/addons'
import { STORY_CHANGED } from '@storybook/core-events'

const channel = addons.getChannel()

const storyListener = () => {
  console.log('custom force reload')
  location.reload()
}

const setupStoryListener = () => {
  channel.removeListener(STORY_CHANGED, storyListener)
  channel.addListener(STORY_CHANGED, storyListener)
}

setupStoryListener()

declare global {
  interface Window {
    root: HTMLDivElement
    canvas: HTMLCanvasElement
    context: WebGL2RenderingContext
  }
  const root: HTMLDivElement
  const canvas: HTMLCanvasElement
  const context: WebGL2RenderingContext
}

window.canvas = root.appendChild(document.createElement('canvas'))
window.context = canvas.getContext('webgl2')!

export const Setup = () => {
  const renderer = new WebGLRenderer({ alpha: true, canvas, context })
  renderer.toneMapping = ACESFilmicToneMapping
  const camera = new PerspectiveCamera(45, 1, 1, 1000)
  camera.position.z = 3

  const scene = new Scene()

  const resize = () => {
    renderer.setPixelRatio(Math.min(2, Math.max(1, window.devicePixelRatio)))
    renderer.setSize(root.clientWidth, root.clientHeight)
    camera.aspect = root.clientWidth / root.clientHeight
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  let toRender: XRFrameRequestCallback | undefined
  renderer.setAnimationLoop((...args) => {
    toRender?.(...args)
    renderer.render(scene, camera)
  })
  const render = (callback: XRFrameRequestCallback) => void (toRender = callback)

  return { renderer, camera, scene, render }
}
