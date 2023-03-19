import { ColorManagement, PerspectiveCamera, Scene, sRGBEncoding, WebGLRenderer } from 'three'

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

if ('enabled' in ColorManagement) ColorManagement.enabled = true
else ColorManagement.legacyMode = false

export const Setup = () => {
  const renderer = new WebGLRenderer({ alpha: true, canvas, context })
  renderer.outputEncoding = sRGBEncoding

  const camera = new PerspectiveCamera(45, 1, 1, 1000)
  camera.position.z = 3

  const scene = new Scene()

  const resize = () => {
    renderer.setPixelRatio(Math.min(2, Math.max(1, window.devicePixelRatio)))
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    camera.aspect = canvas.clientWidth / canvas.clientHeight
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
