import * as THREE from 'three'
import { Setup } from '../Setup'
import GUI from 'lil-gui'
import { Meta } from '@storybook/html'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { GroundedSkybox } from 'three/examples/jsm/objects/GroundedSkybox.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Sparkles, SparklesProps } from '../../src/core/Sparkles'
export default {
  title: 'Staging/Sparkles',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS

let gui: GUI
let scene: THREE.Scene,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  animateLoop: (callback: (time: number) => void) => void,
  allSparkles: Sparkles[] = []

export const SparkleStory = async () => {
  const setupResult = Setup()
  scene = setupResult.scene
  camera = setupResult.camera
  renderer = setupResult.renderer
  animateLoop = setupResult.render

  gui = new GUI({ title: SparkleStory.storyName })
  renderer.shadowMap.enabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  camera.position.set(8, 5, 8)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 2, 0)
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
  setupSparkles()
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
    scene.background = exrTex

    const groundProjection = new GroundedSkybox(exrTex, 5, 20)
    groundProjection.position.set(0, 5, 0)
    scene.add(groundProjection)
  })
}

function setupSparkles() {
  addSimpleSparkles()
  addRandomizedSparkles()

  const timer = new THREE.Timer()

  // runs on every frame
  animateLoop(() => {
    timer.update()
    const elapsedTime = timer.getElapsed()
    for (const sparkle of allSparkles) {
      sparkle.update(elapsedTime)
    }
  })
}

function addSimpleSparkles() {
  const sphereMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 'lightpink',
      emissiveIntensity: 0.2,
      roughness: 0.25,
    })
  )
  sphereMesh.position.set(-3, 2, 0)
  sphereMesh.castShadow = true
  scene.add(sphereMesh)

  const sparkleParameters: SparklesProps = {
    noise: 1,
    count: 100,
    speed: 1,
    opacity: 1,
    scale: 1,
    size: 5,
    color: new THREE.Color(0xffffff),
  }
  const sparkles = new Sparkles(sparkleParameters)
  sparkles.setPixelRatio(renderer.getPixelRatio())

  allSparkles.push(sparkles)
  sphereMesh.add(sparkles)

  // gui controls for sparkles
  const sFol = gui.addFolder('Simple Sparkles')
  sFol.add(sparkleParameters, 'count', 10, 1000, 100).onChange(() => sparkles.rebuildAttributes(sparkleParameters))
  sFol.add(sparkleParameters, 'size', 0, 50, 1).onChange(() => sparkles.rebuildAttributes(sparkleParameters))
  sFol.add(sparkleParameters, 'opacity', 0, 1, 1).onChange(() => sparkles.rebuildAttributes(sparkleParameters))
  sFol.add(sparkleParameters, 'speed', 0, 15, 1).onChange(() => sparkles.rebuildAttributes(sparkleParameters))
  sFol.add(sparkleParameters, 'noise', 0, 15, 1).onChange(() => sparkles.rebuildAttributes(sparkleParameters))
  sFol.add(sparkleParameters, 'scale', 0, 5, 0.5).onChange(() => sparkles.rebuildAttributes(sparkleParameters))
  sFol.addColor(sparkleParameters, 'color').onChange(() => sparkles.rebuildAttributes(sparkleParameters))
}

function addRandomizedSparkles() {
  // parent mesh for the sparkles
  const octahedronMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(2),
    new THREE.MeshStandardMaterial({
      color: 'purple',
      roughness: 0.25,
      wireframe: true,
    })
  )
  octahedronMesh.position.set(3, 2, 0)
  octahedronMesh.castShadow = true
  scene.add(octahedronMesh)

  const count = 100
  const sparkleParameters: SparklesProps = {
    count,
    noise: new Float32Array(count * 3),
    speed: new Float32Array(count),
    opacity: new Float32Array(count),
    scale: new THREE.Vector3(1, 3, 1), // bounds of the sparkles
    size: new Float32Array(count),
    color: new Float32Array(count * 3),
  }

  const randomParams = {
    minNoise: 0.3,
    maxNoise: 10,

    minSpeed: 0.3,
    maxSpeed: 10,

    minSize: 0.3,
    maxSize: 10,

    minColor: 0,
    maxColor: 1,
  }

  // Helper function to randomize Float32Array values
  function randomizeArrayContent(array: Float32Array, min: number, max: number) {
    for (let i = 0; i < array.length; i++) {
      array[i] = THREE.MathUtils.randFloat(min, max)
    }
  }

  // fill the arrays with random values
  function randomiseValues() {
    if (sparkleParameters.noise && sparkleParameters.noise instanceof Float32Array) {
      randomizeArrayContent(sparkleParameters.noise, randomParams.minNoise, randomParams.maxNoise)
    }
    if (sparkleParameters.speed instanceof Float32Array) {
      randomizeArrayContent(sparkleParameters.speed, randomParams.minSpeed, randomParams.maxSpeed)
    }
    if (sparkleParameters.size instanceof Float32Array) {
      randomizeArrayContent(sparkleParameters.size, randomParams.minSize, randomParams.maxSize)
    }
    if (sparkleParameters.opacity instanceof Float32Array) {
      randomizeArrayContent(sparkleParameters.opacity, 0.3, 1)
    }
    if (sparkleParameters.color instanceof Float32Array) {
      randomizeArrayContent(sparkleParameters.color, randomParams.minColor, randomParams.maxColor)
    }
  }

  randomiseValues()

  const advancedSparkles = new Sparkles(sparkleParameters)
  advancedSparkles.setPixelRatio(renderer.getPixelRatio())

  allSparkles.push(advancedSparkles)
  octahedronMesh.add(advancedSparkles)

  // gui controls for sparkles
  const updateSparkles = () => {
    randomiseValues()
    advancedSparkles.rebuildAttributes(sparkleParameters)
  }
  const sFol = gui.addFolder('Randomized Sparkles')
  sFol.add(randomParams, 'minNoise', 0, 100, 1).onChange(updateSparkles)
  sFol.add(randomParams, 'maxNoise', 0, 100, 1).onChange(updateSparkles)
  sFol.add(randomParams, 'minSpeed', 0, 50, 1).onChange(updateSparkles)
  sFol.add(randomParams, 'maxSpeed', 0, 50, 1).onChange(updateSparkles)
  sFol.add(randomParams, 'minSize', 0.1, 100, 1).onChange(updateSparkles)
  sFol.add(randomParams, 'maxSize', 0, 100, 1).onChange(updateSparkles)
  sFol.add(randomParams, 'minColor', 0, 1, 0.01).onChange(updateSparkles)
  sFol.add(randomParams, 'maxColor', 0, 1, 0.01).onChange(updateSparkles)
}

SparkleStory.storyName = 'Two Sparkles'
