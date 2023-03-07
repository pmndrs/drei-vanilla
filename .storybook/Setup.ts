import { PerspectiveCamera, Scene, WebGLRenderer } from 'three'

export const Setup = () => {
  const root = document.querySelector('#root')!
  let { width, height } = root?.getBoundingClientRect()
  const camera = new PerspectiveCamera(45, width / height, 1, 1000)
  camera.position.z = 3
  const renderer = new WebGLRenderer()
  const scene = new Scene()

  const resize = () => {
    let { width, height } = root?.getBoundingClientRect()
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  resize()
  window.addEventListener('resize', resize)

  const render = (toRender = () => {}) => {
    toRender()

    renderer.render(scene, camera)

    requestAnimationFrame(() => render(toRender))
  }

  return { renderer, camera, scene, render }
}
