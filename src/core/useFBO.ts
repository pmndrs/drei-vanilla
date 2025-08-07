import * as THREE from 'three'

type FBOSettings = {
  /** @deprecated use `depthBuffer` instead. If set, the scene depth will be rendered into buffer.depthTexture. Default: false */
  depth?: boolean
} & THREE.RenderTargetOptions

function useFBO(
  /** Width in pixels */
  width = 1024,
  /** Height in pixels */
  height = 1024,
  /**Settings */
  settings?: FBOSettings
): THREE.WebGLRenderTarget {
  var _width = width
  var _height = height
  var _settings = settings || {}
  const { samples = 0, depth, ...targetSettings } = _settings

  const depthBuffer = depth ?? _settings.depthBuffer // backwards compatibility for deprecated `depth` prop

  var target = new THREE.WebGLRenderTarget(_width, _height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    ...targetSettings,
  })

  if (depthBuffer) {
    target.depthTexture = new THREE.DepthTexture(_width, _height, THREE.FloatType)
  }

  target.samples = samples

  return target
}

export { useFBO }
