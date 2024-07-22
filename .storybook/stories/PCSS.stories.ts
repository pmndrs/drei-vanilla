import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Camera,
  CameraHelper,
  DirectionalLight,
  DirectionalLightHelper,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Renderer,
  Scene,
  SphereGeometry,
} from 'three'
import { pcss } from '../../src/core/pcss'
import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

export default {
  title: 'Shaders/pcss',
} as Meta

export const PcssStory = async () => {
  const gui = new GUI({ title: PcssStory.storyName })
  const args = {
    enabled: true,
    size: 25,
    focus: 0,
    samples: 10,
  }

  const folder = gui.addFolder('Settings')
  folder.onChange(() => {
    updatePCSS(args)
  })
  folder.add(args, 'enabled')
  folder.add(args, 'size', 1, 100, 1)
  folder.add(args, 'focus', 0, 2, 0.1)
  folder.add(args, 'samples', 1, 20, 1)

  const { renderer, scene, camera, render } = Setup()

  let reset: ((gl: Renderer, scene: Scene, camera: Camera) => void) | null

  renderer.shadowMap.enabled = true
  renderer.toneMapping = ACESFilmicToneMapping

  camera.position.set(5, 5, 5)
  new OrbitControls(camera, renderer.domElement)

  scene.add(new AmbientLight(0x666666))

  const light = new DirectionalLight(0xdfebff, 5)
  light.position.set(2, 8, 4)

  light.castShadow = true
  light.shadow.mapSize.width = 1024
  light.shadow.mapSize.height = 1024
  light.shadow.camera.far = 20

  scene.add(light)

  scene.add(new DirectionalLightHelper(light))
  scene.add(new CameraHelper(light.shadow.camera))

  // sphereGroup
  const sphereGroup = new Group()
  const sphereRadius = 0.3
  const geometry = new SphereGeometry(sphereRadius).translate(0, sphereRadius, 0)

  for (let i = 0; i < 20; i++) {
    const material = new MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      roughness: Math.random(),
    })
    const sphere = new Mesh(geometry, material)
    sphere.position.x = MathUtils.randFloatSpread(6)
    sphere.position.z = MathUtils.randFloatSpread(6)
    sphere.castShadow = true
    sphere.receiveShadow = true
    sphereGroup.add(sphere)
  }
  scene.add(sphereGroup)

  // ground
  const groundMaterial = new MeshStandardMaterial({ color: 0x404040 })

  const ground = new Mesh(new PlaneGeometry(20000, 20000, 8, 8), groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // column
  for (let i = 0; i < 5; i++) {
    const height = MathUtils.randFloat(1, 4)
    const column = new Mesh(new BoxGeometry(0.2, height, 0.2).translate(0, height / 2, 0), groundMaterial)
    column.castShadow = true
    column.receiveShadow = true
    scene.add(column)

    column.position.set(MathUtils.randFloatSpread(5), 0, MathUtils.randFloatSpread(5))
  }

  render((time) => {
    // make spheres go up/down
    for (const [index, sphere] of sphereGroup.children.entries()) {
      sphere.position.y = Math.sin(time / 1000 + index) + 1
    }
  })

  const updatePCSS = (args: { enabled: boolean; size: number; focus: number; samples: number }) => {
    const { enabled, size, focus, samples } = args

    if (reset) {
      reset(renderer, scene, camera)
      reset = null
    }

    if (enabled) {
      reset = pcss({ focus, size, samples })

      scene.traverse((object) => {
        if (object instanceof Mesh) {
          // renderer.properties.remove(object.material)

          object.material.dispose()
        }
      })
    }
  }

  updatePCSS(args)
}

PcssStory.storyName = 'PCSS'
