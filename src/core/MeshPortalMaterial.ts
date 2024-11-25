import * as THREE from 'three'
import { shaderMaterial } from './shaderMaterial'
import { version } from '../helpers/constants'
import { FullScreenQuad } from '../helpers/Pass'

export type PortalMaterialType = {
  resolution: THREE.Vector2
  blur: number
  size?: number
  sdf?: THREE.Texture | null
  map?: THREE.Texture | null
}

export const MeshPortalMaterial = shaderMaterial<PortalMaterialType>(
  {
    blur: 0,
    map: null,
    sdf: null,
    size: 0,
    resolution: /* @__PURE__ */ new THREE.Vector2(),
  },
  `varying vec2 vUv;
   void main() {
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
     vUv = uv;
   }`,
  `uniform sampler2D sdf;
   uniform sampler2D map;
   uniform float blur;
   uniform float size;
   uniform float time;
   uniform vec2 resolution;
   varying vec2 vUv;
   #include <packing>
   void main() {
     vec2 uv = gl_FragCoord.xy / resolution.xy;
     vec4 t = texture2D(map, uv);
     float k = blur;
     float d = texture2D(sdf, vUv).r/size;
     float alpha = 1.0 - smoothstep(0.0, 1.0, clamp(d/k + 1.0, 0.0, 1.0));
     gl_FragColor = vec4(t.rgb, blur == 0.0 ? t.a : t.a * alpha);
     #include <tonemapping_fragment>
     #include <${version >= 154 ? 'colorspace_fragment' : 'encodings_fragment'}>
   }`
)

const makeSDFGenerator = (clientWidth: number, clientHeight: number, renderer: THREE.WebGLRenderer) => {
  const finalTarget = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.FloatType,
    format: THREE.RedFormat,
    generateMipmaps: true,
  })
  const outsideRenderTarget = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  })
  const insideRenderTarget = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  })
  const outsideRenderTarget2 = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  })
  const insideRenderTarget2 = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  })
  const outsideRenderTargetFinal = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    type: THREE.FloatType,
    format: THREE.RedFormat,
  })
  const insideRenderTargetFinal = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    type: THREE.FloatType,
    format: THREE.RedFormat,
  })
  const uvRender = new FullScreenQuad(
    new THREE.ShaderMaterial({
      uniforms: { tex: { value: null } },
      vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: /*glsl*/ `
        uniform sampler2D tex;
        varying vec2 vUv;
        #include <packing>
        void main() {
          gl_FragColor = pack2HalfToRGBA(vUv * (round(texture2D(tex, vUv).x)));
        }`,
    })
  )
  const uvRenderInside = new FullScreenQuad(
    new THREE.ShaderMaterial({
      uniforms: { tex: { value: null } },
      vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: /*glsl*/ `
        uniform sampler2D tex;
        varying vec2 vUv;
        #include <packing>
        void main() {
          gl_FragColor = pack2HalfToRGBA(vUv * (1.0 - round(texture2D(tex, vUv).x)));
        }`,
    })
  )
  const jumpFloodRender = new FullScreenQuad(
    new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: null },
        offset: { value: 0.0 },
        level: { value: 0.0 },
        maxSteps: { value: 0.0 },
      },
      vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: /*glsl*/ `
        varying vec2 vUv;
        uniform sampler2D tex;
        uniform float offset;
        uniform float level;
        uniform float maxSteps;
        #include <packing>
        void main() {
          float closestDist = 9999999.9;
          vec2 closestPos = vec2(0.0);
          for (float x = -1.0; x <= 1.0; x += 1.0) {
            for (float y = -1.0; y <= 1.0; y += 1.0) {
              vec2 voffset = vUv;
              voffset += vec2(x, y) * vec2(${1 / clientWidth}, ${1 / clientHeight}) * offset;
              vec2 pos = unpackRGBATo2Half(texture2D(tex, voffset));
              float dist = distance(pos.xy, vUv);
              if(pos.x != 0.0 && pos.y != 0.0 && dist < closestDist) {
                closestDist = dist;
                closestPos = pos;
              }
            }
          }
          gl_FragColor = pack2HalfToRGBA(closestPos);
        }`,
    })
  )
  const distanceFieldRender = new FullScreenQuad(
    new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: null },
        size: { value: new THREE.Vector2(clientWidth, clientHeight) },
      },
      vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: /*glsl*/ `
        varying vec2 vUv;
        uniform sampler2D tex;
        uniform vec2 size;
        #include <packing>
        void main() {
          gl_FragColor = vec4(distance(size * unpackRGBATo2Half(texture2D(tex, vUv)), size * vUv), 0.0, 0.0, 0.0);
        }`,
    })
  )
  const compositeRender = new FullScreenQuad(
    new THREE.ShaderMaterial({
      uniforms: {
        inside: { value: insideRenderTargetFinal.texture },
        outside: { value: outsideRenderTargetFinal.texture },
        tex: { value: null },
      },
      vertexShader: /*glsl*/ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: /*glsl*/ `
        varying vec2 vUv;
        uniform sampler2D inside;
        uniform sampler2D outside;
        uniform sampler2D tex;
        #include <packing>
        void main() {
          float i = texture2D(inside, vUv).x;
          float o =texture2D(outside, vUv).x;
          if (texture2D(tex, vUv).x == 0.0) {
            gl_FragColor = vec4(o, 0.0, 0.0, 0.0);
          } else {
            gl_FragColor = vec4(-i, 0.0, 0.0, 0.0);
          }
        }`,
    })
  )

  return (image: THREE.Texture) => {
    const ft = finalTarget
    image.minFilter = THREE.NearestFilter
    image.magFilter = THREE.NearestFilter
    uvRender.material.uniforms.tex.value = image
    renderer.setRenderTarget(outsideRenderTarget)
    uvRender.render(renderer)

    const passes = Math.ceil(Math.log(Math.max(clientWidth, clientHeight)) / Math.log(2.0))
    let lastTarget = outsideRenderTarget
    let target: THREE.WebGLRenderTarget = null!
    for (let i = 0; i < passes; i++) {
      const offset = Math.pow(2, passes - i - 1)
      target = lastTarget === outsideRenderTarget ? outsideRenderTarget2 : outsideRenderTarget
      jumpFloodRender.material.uniforms.level.value = i
      jumpFloodRender.material.uniforms.maxSteps.value = passes
      jumpFloodRender.material.uniforms.offset.value = offset
      jumpFloodRender.material.uniforms.tex.value = lastTarget.texture
      renderer.setRenderTarget(target)
      jumpFloodRender.render(renderer)
      lastTarget = target
    }
    renderer.setRenderTarget(outsideRenderTargetFinal)
    distanceFieldRender.material.uniforms.tex.value = target.texture
    distanceFieldRender.render(renderer)
    uvRenderInside.material.uniforms.tex.value = image
    renderer.setRenderTarget(insideRenderTarget)
    uvRenderInside.render(renderer)
    lastTarget = insideRenderTarget

    for (let i = 0; i < passes; i++) {
      const offset = Math.pow(2, passes - i - 1)
      target = lastTarget === insideRenderTarget ? insideRenderTarget2 : insideRenderTarget
      jumpFloodRender.material.uniforms.level.value = i
      jumpFloodRender.material.uniforms.maxSteps.value = passes
      jumpFloodRender.material.uniforms.offset.value = offset
      jumpFloodRender.material.uniforms.tex.value = lastTarget.texture
      renderer.setRenderTarget(target)
      jumpFloodRender.render(renderer)
      lastTarget = target
    }
    renderer.setRenderTarget(insideRenderTargetFinal)
    distanceFieldRender.material.uniforms.tex.value = target.texture
    distanceFieldRender.render(renderer)
    renderer.setRenderTarget(ft)
    compositeRender.material.uniforms.tex.value = image
    compositeRender.render(renderer)
    renderer.setRenderTarget(null)
    return ft
  }
}

/**
 * Generate and apply sdf mask on the portalMesh
 * @param portalMesh mesh which uses MeshPortalMaterial
 * @param resolution resolution of sdf texture
 * @param gl renderer to help generate sdf image
 */
export const meshPortalMaterialApplySDF = (portalMesh: THREE.Mesh, resolution: number, gl: THREE.WebGLRenderer) => {
  const maskRenderTarget = new THREE.WebGLRenderTarget(resolution, resolution)
  const portalMat = portalMesh.material as InstanceType<typeof MeshPortalMaterial>
  // Apply the SDF mask only once
  const tempMesh = new THREE.Mesh(portalMesh.geometry, new THREE.MeshBasicMaterial())
  const boundingBox = new THREE.Box3().setFromBufferAttribute(
    tempMesh.geometry.attributes.position as THREE.BufferAttribute
  )
  const orthoCam = new THREE.OrthographicCamera(
    boundingBox.min.x * (1 + 2 / resolution),
    boundingBox.max.x * (1 + 2 / resolution),
    boundingBox.max.y * (1 + 2 / resolution),
    boundingBox.min.y * (1 + 2 / resolution),
    0.1,
    1000
  )
  orthoCam.position.set(0, 0, 1)
  orthoCam.lookAt(0, 0, 0)

  gl.setRenderTarget(maskRenderTarget)
  gl.render(tempMesh, orthoCam)
  const sg = makeSDFGenerator(resolution, resolution, gl)
  const sdf = sg(maskRenderTarget.texture)
  const readSdf = new Float32Array(resolution * resolution)
  gl.readRenderTargetPixels(sdf, 0, 0, resolution, resolution, readSdf)
  // Get smallest value in sdf
  let min = Infinity
  for (let i = 0; i < readSdf.length; i++) {
    if (readSdf[i] < min) min = readSdf[i]
  }
  min = -min

  portalMat.size = min
  portalMat.sdf = sdf.texture

  gl.setRenderTarget(null)
}
