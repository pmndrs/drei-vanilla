import * as THREE from 'three'

export type SpriteAnimatorProps = {
  startFrame?: number
  endFrame?: number
  fps?: number
  frameName?: string
  textureDataURL?: string
  textureImageURL: string
  loop?: boolean
  numberOfFrames?: number
  autoPlay?: boolean
  animationNames?: Array<string>
  onStart?: Function
  onEnd?: Function
  onLoopEnd?: Function
  onFrame?: Function
  play?: boolean
  pause?: boolean
  flipX?: boolean
  position?: Array<number>
  alphaTest?: number
  asSprite?: boolean
}

export type SpriteAnimatorType = {
  group: THREE.Group // A reference to the THREE.Group used for animations.
  init: Function // Function to initialize the sprite animator.
  update: Function // Function to update the sprite animation.
  pauseAnimation: Function // Function to pause the animation.
  playAnimation: Function // Function to play the animation.
  setFrameName: Function // Function to set the frame name.
}

export const SpriteAnimator = ({
  startFrame,
  endFrame,
  fps,
  frameName,
  textureDataURL,
  textureImageURL,
  loop,
  numberOfFrames,
  autoPlay,
  animationNames,
  onStart,
  onEnd,
  onLoopEnd,
  onFrame,
  play,
  pause,
  flipX,
  alphaTest,
  asSprite,
}: SpriteAnimatorProps): SpriteAnimatorType => {
  let spriteData = {
    frames: <any>[],
    meta: {
      version: '1.0',
      size: { w: 1, h: 1 },
      scale: '1',
    },
  }

  //   let isJsonReady = false
  let hasEnded = false

  let spriteTexture = new THREE.Texture()
  const spriteMaterial = new THREE.SpriteMaterial({
    toneMapped: false,
    transparent: true,
    map: spriteTexture,
    alphaTest: alphaTest ?? 0.0,
  })
  const basicMaterial = new THREE.MeshBasicMaterial({
    toneMapped: false,
    side: THREE.DoubleSide,
    map: spriteTexture,
    transparent: true,
    alphaTest: alphaTest ?? 0.0,
  })

  const spriteMesh = new THREE.Sprite(spriteMaterial)
  const planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basicMaterial)

  let matRef: THREE.SpriteMaterial | THREE.MeshBasicMaterial = spriteMaterial

  let spriteRef: THREE.Sprite | THREE.Mesh = spriteMesh

  const group = new THREE.Group()
  group.add(spriteRef)

  let timerOffset = window.performance.now()
  //   let textureData: THREE.Texture
  let currentFrame = startFrame || 0
  let currentFrameName = frameName || ''
  const fpsInterval = 1000 / (fps || 30)

  const setSpriteTexture = (texture: THREE.Texture) => {
    spriteTexture = texture
    if (matRef) {
      matRef.map = texture
    }
  }

  //   let totalFrames = 0
  const aspect = new THREE.Vector3(1, 1, 1)
  const setAspect = (v: THREE.Vector3) => {
    aspect.copy(v)
  }

  const flipOffset = flipX ? -1 : 1

  let displayAsSprite = asSprite ?? true
  const setDisplayAsSprite = (state: boolean) => {
    displayAsSprite = state
    if (displayAsSprite) {
      matRef = spriteMaterial
      spriteRef = spriteMesh
      group.add(spriteMesh)
      group.remove(planeMesh)
    } else {
      matRef = basicMaterial
      spriteRef = planeMesh
      group.remove(spriteMesh)
      group.add(planeMesh)
    }
  }

  setDisplayAsSprite(displayAsSprite)

  async function loadJsonAndTextureAndExecuteCallback(
    jsonUrl: string,
    textureUrl: string,
    callback: (json: any, texture: THREE.Texture) => void
  ) {
    const textureLoader = new THREE.TextureLoader()
    const jsonPromise = fetch(jsonUrl).then((response) => response.json())
    const texturePromise = new Promise<THREE.Texture>((resolve) => {
      textureLoader.load(textureUrl, resolve)
    })

    await Promise.all([jsonPromise, texturePromise]).then((response) => {
      callback(response[0], response[1])
    })
  }

  const calculateAspectRatio = (width: number, height: number): THREE.Vector3 => {
    const aspectRatio = height / width
    spriteRef.scale.set(1, aspectRatio, 1)
    return spriteRef.scale
  }

  // initial loads
  const init = async () => {
    if (textureDataURL && textureImageURL) {
      await loadJsonAndTextureAndExecuteCallback(textureDataURL, textureImageURL, parseSpriteData)
    } else if (textureImageURL) {
      // only load the texture, this is an image sprite only
      const textureLoader = new THREE.TextureLoader()
      const texture = await textureLoader.loadAsync(textureImageURL)
      parseSpriteData(null, texture)
    }
  }

  const setFrameName = (name: string) => {
    frameName = name
    if (currentFrameName !== frameName && frameName) {
      currentFrame = 0
      currentFrameName = frameName
    }
  }

  const pauseAnimation = () => {
    pause = true
  }

  const playAnimation = () => {
    play = true
    pause = false
  }

  const parseSpriteData = (json: any, _spriteTexture: THREE.Texture): void => {
    // sprite only case
    if (json === null) {
      if (_spriteTexture && numberOfFrames) {
        //get size from texture
        const width = _spriteTexture.image.width
        const height = _spriteTexture.image.height
        const frameWidth = width / numberOfFrames
        const frameHeight = height
        // textureData = _spriteTexture
        // totalFrames = numberOfFrames
        spriteData = {
          frames: [],
          meta: {
            version: '1.0',
            size: { w: width, h: height },
            scale: '1',
          },
        }

        if (parseInt(frameWidth.toString(), 10) === frameWidth) {
          // if it fits
          for (let i = 0; i < numberOfFrames; i++) {
            spriteData.frames.push({
              frame: { x: i * frameWidth, y: 0, w: frameWidth, h: frameHeight },
              rotated: false,
              trimmed: false,
              spriteSourceSize: { x: 0, y: 0, w: frameWidth, h: frameHeight },
              sourceSize: { w: frameWidth, h: height },
            })
          }
        }
      }
    } else if (_spriteTexture) {
      spriteData = json
      spriteData.frames = Array.isArray(json.frames) ? json.frames : parseFrames()
      //   totalFrames = Array.isArray(json.frames) ? json.frames.length : Object.keys(json.frames).length
      //   textureData = _spriteTexture

      const { w, h } = getFirstItem(json.frames).sourceSize
      const aspect = calculateAspectRatio(w, h)

      setAspect(aspect)
      if (matRef) {
        matRef.map = _spriteTexture
      }
    }

    _spriteTexture.premultiplyAlpha = false

    setSpriteTexture(_spriteTexture)
    modifySpritePosition()
  }

  // for frame based JSON Hash sprite data
  const parseFrames = (): any => {
    const sprites: any = {}
    const data = spriteData
    const delimiters = animationNames
    if (delimiters) {
      for (let i = 0; i < delimiters.length; i++) {
        sprites[delimiters[i]] = []

        for (const innerKey in data['frames']) {
          const value = data['frames'][innerKey]
          const frameData = value['frame']
          const x = frameData['x']
          const y = frameData['y']
          const width = frameData['w']
          const height = frameData['h']
          const sourceWidth = value['sourceSize']['w']
          const sourceHeight = value['sourceSize']['h']

          if (typeof innerKey === 'string' && innerKey.toLowerCase().indexOf(delimiters[i].toLowerCase()) !== -1) {
            sprites[delimiters[i]].push({
              x: x,
              y: y,
              w: width,
              h: height,
              frame: frameData,
              sourceSize: { w: sourceWidth, h: sourceHeight },
            })
          }
        }
      }
    }

    return sprites
  }

  // modify the sprite material after json is parsed and state updated
  const modifySpritePosition = () => {
    if (!(spriteData && matRef.map)) return
    const {
      meta: { size: metaInfo },
      frames,
    } = spriteData

    const { w: frameW, h: frameH } = Array.isArray(frames)
      ? frames[0].sourceSize
      : frameName
      ? frames[frameName]
        ? frames[frameName][0].sourceSize
        : { w: 0, h: 0 }
      : { w: 0, h: 0 }

    matRef.map.wrapS = matRef.map.wrapT = THREE.RepeatWrapping
    matRef.map.center.set(0, 0)
    matRef.map.repeat.set((1 * flipOffset) / (metaInfo.w / frameW), 1 / (metaInfo.h / frameH))

    //const framesH = (metaInfo.w - 1) / frameW
    const framesV = (metaInfo.h - 1) / frameH
    const frameOffsetY = 1 / framesV
    matRef.map.offset.x = 0.0 //-matRef.map.repeat.x
    matRef.map.offset.y = 1 - frameOffsetY

    // isJsonReady = true
    if (onStart) onStart({ currentFrameName: frameName, currentFrame: currentFrame })
  }

  // run the animation on each frame
  const runAnimation = (): void => {
    if (!(spriteData && matRef.map)) return
    const now = window.performance.now()
    const diff = now - timerOffset
    const {
      meta: { size: metaInfo },
      frames,
    } = spriteData
    const { w: frameW, h: frameH } = getFirstItem(frames).sourceSize
    const spriteFrames = Array.isArray(frames) ? frames : frameName ? frames[frameName] : []

    let finalValX = 0
    let finalValY = 0
    const _endFrame = endFrame || spriteFrames.length - 1

    if (currentFrame > _endFrame) {
      currentFrame = loop ? startFrame ?? 0 : 0
      if (loop) {
        onLoopEnd?.({
          currentFrameName: frameName,
          currentFrame: currentFrame,
        })
      } else {
        onEnd?.({
          currentFrameName: frameName,
          currentFrame: currentFrame,
        })
        hasEnded = true
      }
      if (!loop) return
    }

    if (diff <= fpsInterval) return
    timerOffset = now - (diff % fpsInterval)

    calculateAspectRatio(frameW, frameH)
    const framesH = (metaInfo.w - 1) / frameW
    const framesV = (metaInfo.h - 1) / frameH
    const {
      frame: { x: frameX, y: frameY },
      sourceSize: { w: originalSizeX, h: originalSizeY },
    } = spriteFrames[currentFrame]
    const frameOffsetX = 1 / framesH
    const frameOffsetY = 1 / framesV
    finalValX =
      flipOffset > 0
        ? frameOffsetX * (frameX / originalSizeX)
        : frameOffsetX * (frameX / originalSizeX) - matRef.map.repeat.x
    finalValY = Math.abs(1 - frameOffsetY) - frameOffsetY * (frameY / originalSizeY)

    matRef.map.offset.x = finalValX
    matRef.map.offset.y = finalValY

    currentFrame += 1
  }

  // *** Warning! It runs on every frame! ***
  const update = () => {
    if (!spriteData?.frames || !matRef?.map) {
      return
    }

    if (pause) {
      return
    }

    if (!hasEnded && (autoPlay || play)) {
      runAnimation()
      onFrame && onFrame({ currentFrameName: currentFrameName, currentFrame: currentFrame })
    }
  }

  // utils
  const getFirstItem = (param: any): any => {
    if (Array.isArray(param)) {
      return param[0]
    } else if (typeof param === 'object' && param !== null) {
      const keys = Object.keys(param)
      return param[keys[0]][0]
    } else {
      return { w: 0, h: 0 }
    }
  }

  return {
    group,
    init,
    update,
    playAnimation,
    pauseAnimation,
    setFrameName,
  }
}
