import * as THREE from 'three'
import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { GroundedSkybox } from 'three/examples/jsm/objects/GroundedSkybox.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'lil-gui'
import { Fisheye } from '../../src/core/Fisheye.ts'

export default {
  title: 'Portals/Fisheye',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS
let gui: GUI

let cylinderMeshes: THREE.Mesh[] = []
let fisheye: Fisheye

const params = {
  fisheyeEnabled: true,
  zoom: 0,
  resolution: 896,
}

export const FisheyeStory = async () => {
  gui = new GUI({ title: 'Fisheye Story', closeFolders: true })
  const { renderer, scene, camera } = Setup()
  renderer.shadowMap.enabled = true
  camera.position.set(0, 1, 2)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1, 0)
  controls.update()

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: 0.3 })
  )
  floor.receiveShadow = true
  scene.add(floor)

  const dirLight = new THREE.DirectionalLight(0xabcdef, 5)
  dirLight.position.set(15, 15, 15)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 1024
  dirLight.shadow.mapSize.height = 1024
  dirLight.shadow.camera.top = 15
  dirLight.shadow.camera.bottom = -15
  dirLight.shadow.camera.left = -15
  dirLight.shadow.camera.right = 15
  scene.add(dirLight)

  fisheye = new Fisheye({
    resolution: params.resolution,
    zoom: params.zoom,
  })

  addFisheyeGUI(fisheye)

  setupEnvironment(scene)
  addMeshes(scene)
  setupRaycaster(renderer, camera, cylinderMeshes)

  const onWindowResize = () => {
    // renderer and camera handled by Setup.ts
    fisheye.onResize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onWindowResize)
  onWindowResize()

  renderer.setAnimationLoop(() => {
    controls.update()
    if (params.fisheyeEnabled) {
      fisheye.render(renderer, scene, camera)
    } else {
      renderer.render(scene, camera)
    }
  })
}

const addMeshes = (scene: THREE.Scene) => {
  const geo = new THREE.CylinderGeometry(0.25, 0.25, 1, 32).translate(0, 0.5, 0)

  const count = 20
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(i / count, 1, 0.5), roughness: 0.5 })
    )
    mesh.scale.y = THREE.MathUtils.randFloat(1, 5)
    mesh.position.set(THREE.MathUtils.randFloatSpread(15), 0, THREE.MathUtils.randFloatSpread(15))
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    cylinderMeshes.push(mesh) // for raycasting
  }
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

    const groundProjection = new GroundedSkybox(exrTex, 5, 50)
    groundProjection.position.set(0, 5, 0)
    scene.add(groundProjection)
  })
}

const addFisheyeGUI = (fisheye: Fisheye) => {
  const folder = gui.addFolder('Fisheye Settings')
  folder.add(params, 'fisheyeEnabled').name('enabled')
  folder
    .add(params, 'zoom', 0, 1, 0.01)
    .onChange((value: number) => {
      fisheye.zoom = value
      fisheye.onResize(window.innerWidth, window.innerHeight)
    })
    .name('zoom')
  folder
    .add(params, 'resolution', 256, 1024, 128)
    .onChange((value: number) => {
      fisheye.resolution = value
      fisheye.updateResolution(value)
    })
    .name('resolution')
}

const setupRaycaster = (renderer: THREE.WebGLRenderer, camera: THREE.Camera, cylinderMeshes: THREE.Mesh[]) => {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let pointerDownTime = 0

  renderer.domElement.addEventListener('pointerdown', () => {
    pointerDownTime = performance.now()
  })

  renderer.domElement.addEventListener('pointerup', (event) => {
    const pointerUpTime = performance.now()
    const timeDiff = pointerUpTime - pointerDownTime

    // Only treat as click if time between down/up is short
    if (timeDiff < 200) {
      // Calculate pointer position in normalized device coordinates (-1 to +1)
      pointer.x = (event.offsetX / renderer.domElement.clientWidth) * 2 - 1
      pointer.y = -(event.offsetY / renderer.domElement.clientHeight) * 2 + 1

      if (params.fisheyeEnabled) {
        fisheye.computeRaycastRayDirection(raycaster, pointer)
      } else {
        raycaster.setFromCamera(pointer, camera)
      }

      const intersects = raycaster.intersectObjects(cylinderMeshes, true)
      if (intersects.length > 0) {
        // change color of first hit object
        const hit = intersects[0].object as THREE.Mesh
        hit.scale.y = THREE.MathUtils.randFloat(1, 5)
        const mat = hit.material as THREE.MeshStandardMaterial
        mat.color.setHSL(Math.random(), 1, 0.5)
      }
    }
  })
}

FisheyeStory.storyName = 'Default'
