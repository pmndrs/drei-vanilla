import * as THREE from 'three'
import { Setup } from '../Setup'
import GUI from 'lil-gui'
import { Meta } from '@storybook/html'
import { EXRLoader, GroundProjectedEnv, OrbitControls } from 'three-stdlib'

import { MeshTransmissionMaterial } from '../../src/materials/MeshTransmissionMaterial'
import { MeshDiscardMaterial } from '../../src/materials/MeshDiscardMaterial'

export default {
  title: 'Shaders/MeshTransmissionMaterial',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS

const mtmParams = {
  backside: true,
  thickness: 1,
  backsideThickness: 0.5,
}

let gui: GUI
let scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, animateLoop
export const MTMStory = async () => {
  const setupResult = Setup()
  scene = setupResult.scene
  camera = setupResult.camera
  renderer = setupResult.renderer
  animateLoop = setupResult.render

  gui = new GUI({ title: MTMStory.storyName })
  renderer.shadowMap.enabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  camera.position.set(12, 12, 12)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 6, 0)
  controls.update()

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: 0.3 })
  )
  floor.receiveShadow = true
  scene.add(floor)

  const dirLight = new THREE.DirectionalLight(0xabcdef, 10)
  dirLight.position.set(1, 20, 1)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 1024
  dirLight.shadow.mapSize.height = 1024
  scene.add(dirLight)

  setupEnvironment()
  setupMeshTransmissionMaterial()
}

/**
 * Add scene.environment and groundProjected skybox
 */
const setupEnvironment = () => {
  const exrLoader = new EXRLoader()

  // exr from polyhaven.com
  exrLoader.load('round_platform_1k.exr', (exrTex) => {
    exrTex.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = exrTex
    // scene.background = exrTex

    const groundProjection = new GroundProjectedEnv(exrTex)
    groundProjection.scale.setScalar(100)
    scene.add(groundProjection)
  })
}

/**
 * Add a torus which uses mesh transmission material
 */
function setupMeshTransmissionMaterial() {
  const discardMaterial = new MeshDiscardMaterial()
  const meshTransmissionMaterial = new MeshTransmissionMaterial(6, false)

  const geometry = new THREE.TorusKnotGeometry(3, 1, 100, 32).translate(0, 6, 0)
  const model = new THREE.Mesh(geometry, meshTransmissionMaterial)

  const transmissionMeshes: THREE.Mesh[] = []

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true

      transmissionMeshes.push(child)
    }
  })
  scene.add(model)

  const fboBack = new THREE.WebGLRenderTarget(512, 512, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    encoding: renderer.outputEncoding,
    type: THREE.HalfFloatType,
  })

  const fboMain = new THREE.WebGLRenderTarget(512, 512, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    encoding: renderer.outputEncoding,
    type: THREE.HalfFloatType,
  })

  meshTransmissionMaterial.buffer = fboMain.texture

  let oldBg: THREE.Color | THREE.Texture | null
  let oldTone: THREE.ToneMapping
  let oldSide: THREE.Side
  const state = {
    gl: renderer,
    scene,
    camera,
  }

  addTransmissionGui(gui, meshTransmissionMaterial)

  // runs on every frame
  animateLoop((time: number) => {
    meshTransmissionMaterial.time = time * 0.001

    for (const mesh of transmissionMeshes) {
      if (meshTransmissionMaterial.buffer === fboMain.texture) {
        // Save defaults
        oldTone = state.gl.toneMapping
        oldBg = state.scene.background
        oldSide = mesh.material.side

        // Switch off tonemapping lest it double tone maps
        // Save the current background and set the HDR as the new BG
        // Use discardMaterial, the parent will be invisible, but it's shadows will still be cast
        state.gl.toneMapping = THREE.NoToneMapping
        mesh.material = discardMaterial

        if (mtmParams.backside) {
          // Render into the backside buffer
          state.gl.setRenderTarget(fboBack)
          state.gl.render(state.scene, state.camera)
          // And now prepare the material for the main render using the backside buffer
          mesh.material = meshTransmissionMaterial
          mesh.material.buffer = fboBack.texture
          mesh.material.thickness = mtmParams.backsideThickness
          mesh.material.side = THREE.BackSide
        }

        // Render into the main buffer
        state.gl.setRenderTarget(fboMain)
        state.gl.render(state.scene, state.camera)

        mesh.material.thickness = mtmParams.thickness
        mesh.material.side = oldSide
        mesh.material.buffer = fboMain.texture

        // Set old state back
        state.scene.background = oldBg
        state.gl.setRenderTarget(null)
        mesh.material = meshTransmissionMaterial
        state.gl.toneMapping = oldTone
      }
    }
  })
}

/**
 * Add gui
 * @param gui gui instance
 * @param mat material instance
 */
function addTransmissionGui(gui: GUI, mat: MeshTransmissionMaterial) {
  const folder = gui.addFolder('Default options')
  folder.addColor(mat, 'color')
  folder.add(mat, 'roughness', 0, 1)

  folder.add(mat, 'reflectivity', 0, 1)
  folder.addColor(mat, 'attenuationColor')
  folder.add(mat, 'attenuationDistance', 0, 2)

  const fol = gui.addFolder('Transmission Material options')
  fol.open()
  fol.add(mat, 'chromaticAberration', 0, 2)
  fol.add(mat, 'anisotropicBlur', 0, 10)
  fol.add(mat, 'distortion', 0, 10)
  fol.add(mat, 'temporalDistortion', 0, 1)
  fol.add(mtmParams, 'backside')
  fol.add(mtmParams, 'thickness', 0, 4)
  fol.add(mtmParams, 'backsideThickness', 0, 4)
}

MTMStory.storyName = 'TorusKnot'
