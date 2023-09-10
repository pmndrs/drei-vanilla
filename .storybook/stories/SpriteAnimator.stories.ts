import * as THREE from 'three'
import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { SpriteAnimator, SpriteAnimatorType } from '../../src/core/SpriteAnimator'
import { GUI } from 'lil-gui'

export default {
  title: 'Misc/SpriteAnimator',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS
let gui: GUI
const allSpriteAnimators: SpriteAnimatorType[] = []

export const SpriteAnimatorStory = async () => {
  gui = new GUI({ title: 'Grid Story', closeFolders: true })
  const { renderer, scene, camera, render } = Setup()
  renderer.shadowMap.enabled = true
  camera.position.set(5, 5, 5)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1, 0)
  controls.update()

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: 0.5, transparent: true, depthWrite: false, depthTest: true })
  )
  floor.receiveShadow = true
  scene.add(floor)

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
  scene.add(dirLight)
  scene.add(new THREE.AmbientLight(0xffffff, 0.1))

  scene.add(new THREE.GridHelper(10))

  const geometry = new THREE.TorusKnotGeometry(0.2, 0.1, 100, 32)
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0,
  })
  mat.color.setHSL(Math.random(), 1, 0.5)
  const torusMesh = new THREE.Mesh(geometry, mat)
  torusMesh.position.set(0, 0.4, 0)
  torusMesh.castShadow = true
  torusMesh.receiveShadow = true
  scene.add(torusMesh)

  const folder = gui.addFolder('Light Settings')
  folder.add(dirLight, 'intensity', 0, 5)
  folder.addColor(dirLight, 'color')
  folder.add(dirLight.position, 'x', -15, 15).name('position x')
  folder.add(dirLight.position, 'y', -15, 15).name('position y')
  folder.add(dirLight.position, 'z', -15, 15).name('position z')

  await setupSprites(scene)
  await setupPlaneSprites(scene)

  render((time) => {
    controls.update()
    for (const spriteAnimator of allSpriteAnimators) {
      spriteAnimator.update()
    }
  })
}

const setupSprites = async (scene: THREE.Scene) => {
  // Flame
  const FlameSpriteAnimator = SpriteAnimator({
    startFrame: 0,
    fps: 40,
    autoPlay: true,
    loop: true,
    textureImageURL: './sprites/flame.png',
    textureDataURL: './sprites/flame.json',
    alphaTest: 0.01,
  })
  await FlameSpriteAnimator.init()
  FlameSpriteAnimator.group.position.set(-1, 0.5, 2)
  scene.add(FlameSpriteAnimator.group)
  allSpriteAnimators.push(FlameSpriteAnimator)

  createSpriteGui('Flame', FlameSpriteAnimator)

  // Alien
  const AlienSpriteAnimator = SpriteAnimator({
    startFrame: 0,
    autoPlay: true,
    loop: true,
    numberOfFrames: 16,
    alphaTest: 0.01,
    textureImageURL: './sprites/alien.png',
  })
  await AlienSpriteAnimator.init()

  AlienSpriteAnimator.group.position.set(0, 0.5, 2)

  scene.add(AlienSpriteAnimator.group)
  createSpriteGui('Alien', AlienSpriteAnimator)

  allSpriteAnimators.push(AlienSpriteAnimator)

  // Boy
  const animNames = ['idle', 'celebration']

  const boySA = SpriteAnimator({
    // onLoopEnd={onEnd}
    frameName: 'idle',
    fps: 24,
    animationNames: animNames,
    autoPlay: true,
    loop: true,
    alphaTest: 0.01,
    textureImageURL: './sprites/boy_hash.png',
    textureDataURL: './sprites/boy_hash.json',
  })
  await boySA.init()
  boySA.group.position.set(1, 0.5, 2)

  scene.add(boySA.group)

  allSpriteAnimators.push(boySA)

  createSpriteGui('Boy', boySA, animNames)
}

const setupPlaneSprites = async (scene: THREE.Scene) => {
  // Flame
  const FlameSpriteAnimator = SpriteAnimator({
    startFrame: 0,
    fps: 40,
    autoPlay: true,
    loop: true,
    textureImageURL: './sprites/flame.png',
    textureDataURL: './sprites/flame.json',
    alphaTest: 0.01,
    asSprite: false,
  })
  await FlameSpriteAnimator.init()
  FlameSpriteAnimator.group.position.set(-1, 0.5, -2)
  scene.add(FlameSpriteAnimator.group)
  allSpriteAnimators.push(FlameSpriteAnimator)

  createSpriteGui('Flame Plane', FlameSpriteAnimator)

  // Alien
  const AlienSpriteAnimator = SpriteAnimator({
    startFrame: 0,
    autoPlay: true,
    loop: true,
    numberOfFrames: 16,
    alphaTest: 0.01,
    textureImageURL: './sprites/alien.png',
    asSprite: false,
  })
  await AlienSpriteAnimator.init()

  AlienSpriteAnimator.group.position.set(0, 0.5, -2)

  scene.add(AlienSpriteAnimator.group)
  createSpriteGui('Alien Plane', AlienSpriteAnimator)

  allSpriteAnimators.push(AlienSpriteAnimator)

  // Boy
  const animNames = ['idle', 'celebration']

  const boySA = SpriteAnimator({
    // onLoopEnd={onEnd}
    frameName: 'idle',
    fps: 24,
    animationNames: animNames,
    autoPlay: true,
    loop: true,
    alphaTest: 0.01,
    textureImageURL: './sprites/boy_hash.png',
    textureDataURL: './sprites/boy_hash.json',
    asSprite: false,
  })
  await boySA.init()
  boySA.group.position.set(1, 0.5, -2)

  scene.add(boySA.group)

  allSpriteAnimators.push(boySA)

  createSpriteGui('Boy Plane', boySA, animNames)
}

function createSpriteGui(name: string, spriteAnimator: SpriteAnimatorType, animationNames: string[] = []) {
  const fol = gui.addFolder(name)
  fol.add(spriteAnimator, 'pauseAnimation')
  fol.add(spriteAnimator, 'playAnimation')

  for (const name of animationNames) {
    const anim = {
      playAnim: () => {
        spriteAnimator.setFrameName(name)
      },
    }
    fol
      .add(anim, 'playAnim')
      .name('play: ' + name)
      .onChange(() => {
        spriteAnimator.setFrameName(name)
      })
  }
}

SpriteAnimatorStory.storyName = 'Default'
