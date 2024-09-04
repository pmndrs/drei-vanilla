import * as THREE from 'three'
import { shaderMaterial } from './shaderMaterial'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import { useFBO } from './useFBO'
import { PlaneGeometry } from 'three'

const isVector3 = (object: any): object is THREE.Vector3 => object?.isVector3

export type CausticsProjectionMaterialType = THREE.MeshNormalMaterial & {
  viewMatrix: { value?: THREE.Matrix4 }
  color?: THREE.Color
  causticsTexture?: THREE.Texture
  causticsTextureB?: THREE.Texture
  lightProjMatrix?: THREE.Matrix4
  lightViewMatrix?: THREE.Matrix4
}

export type CausticsProps = {
  /** How many frames it will render, set it to Infinity for runtime, default: 1 */
  frames?: number
  /** Will display caustics only and skip the models, default: false */
  causticsOnly?: boolean
  /** Will include back faces and enable the backsideIOR prop, default: false */
  backside?: boolean
  /** The IOR refraction index, default: 1.1 */
  ior?: number
  /** The IOR refraction index for back faces (only available when backside is enabled), default: 1.1 */
  backsideIOR?: number
  /** The texel size, default: 0.3125 */
  worldRadius?: number
  /** Intensity of the projected caustics, default: 0.05 */
  intensity?: number
  /** Caustics color, default: white */
  color?: THREE.Color
  /** Buffer resolution, default: 2048 */
  resolution?: number
  /** Camera position, it will point towards the contents bounds center, default: THREE.Vector3(1,1,1) */
  lightSource?: THREE.Vector3 | THREE.Object3D
  /** Caustics camera near, default: 0.1 */
  near?: number
  /** Caustics camera far,when 0 ,gets automatically updated in render loop default: 0 */
  far?: number
}

function createNormalMaterial(side: THREE.Side = THREE.FrontSide) {
  const viewMatrix = { value: new THREE.Matrix4() }
  return Object.assign(new THREE.MeshNormalMaterial({ side }) as CausticsProjectionMaterialType, {
    viewMatrix,
    onBeforeCompile: (shader) => {
      shader.uniforms.viewMatrix = viewMatrix
      shader.fragmentShader =
        `vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
           return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
         }\n` +
        shader.fragmentShader.replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
           normal = inverseTransformDirection( normal, viewMatrix );\n`
        )
    },
  })
}

export type CausticsProjectionShaderType = {
  causticsTexture?: THREE.Texture | null
  causticsTextureB?: THREE.Texture | null
  color?: THREE.Color
  lightProjMatrix?: THREE.Matrix4
  lightViewMatrix?: THREE.Matrix4
}

export const CausticsProjectionMaterial = shaderMaterial<CausticsProjectionShaderType>(
  {
    causticsTexture: null,
    causticsTextureB: null,
    color: new THREE.Color(),
    lightProjMatrix: new THREE.Matrix4(),
    lightViewMatrix: new THREE.Matrix4(),
  },
  `varying vec3 vWorldPosition;   
   void main() {
     gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.);
     vec4 worldPosition = modelMatrix * vec4(position, 1.);
     vWorldPosition = worldPosition.xyz;
   }`,
  `varying vec3 vWorldPosition;
  uniform vec3 color;
  uniform sampler2D causticsTexture; 
  uniform sampler2D causticsTextureB; 
  uniform mat4 lightProjMatrix;
  uniform mat4 lightViewMatrix;
   void main() {
    // Apply caustics  
    vec4 lightSpacePos = lightProjMatrix * lightViewMatrix * vec4(vWorldPosition, 1.0);
    lightSpacePos.xyz /= lightSpacePos.w;
    lightSpacePos.xyz = lightSpacePos.xyz * 0.5 + 0.5; 
    vec3 front = texture2D(causticsTexture, lightSpacePos.xy).rgb;
    vec3 back = texture2D(causticsTextureB, lightSpacePos.xy).rgb;
    gl_FragColor = vec4((front + back) * color, 1.0);
    #include <tonemapping_fragment>
    #include <${parseInt(THREE.REVISION.replace(/\D+/g, '')) >= 154 ? 'colorspace_fragment' : 'encodings_fragment'}>
   }`
)

export type CausticsMaterialType = {
  cameraMatrixWorld: THREE.Matrix4
  cameraProjectionMatrixInv: THREE.Matrix4
  normalTexture: THREE.Texture | null
  depthTexture: THREE.Texture | null
  lightDir: THREE.Vector3
  lightPlaneNormal: THREE.Vector3
  lightPlaneConstant: number
  near: number
  far: number
  modelMatrix: THREE.Matrix4
  worldRadius: number
  ior: number
  bounces: number
  resolution: number
  size: number
  intensity: number
}

export const CausticsMaterial = shaderMaterial<CausticsMaterialType>(
  {
    cameraMatrixWorld: new THREE.Matrix4(),
    cameraProjectionMatrixInv: new THREE.Matrix4(),
    normalTexture: null,
    depthTexture: null,
    lightDir: new THREE.Vector3(0, 1, 0),
    lightPlaneNormal: new THREE.Vector3(0, 1, 0),
    lightPlaneConstant: 0,
    near: 0.1,
    far: 100,
    modelMatrix: new THREE.Matrix4(),
    worldRadius: 1 / 40,
    ior: 1.1,
    bounces: 0,
    resolution: 1024,
    size: 10,
    intensity: 0.5,
  },
  /* glsl */ `
  varying vec2 vUv;
  void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,
  /* glsl */ `  
  uniform mat4 cameraMatrixWorld;
  uniform mat4 cameraProjectionMatrixInv;
  uniform vec3 lightDir;
  uniform vec3 lightPlaneNormal;
  uniform float lightPlaneConstant;
  uniform float near;
  uniform float far;
  uniform float time;
  uniform float worldRadius;
  uniform float resolution;
  uniform float size;
  uniform float intensity;
  uniform float ior;
  precision highp isampler2D;
  precision highp usampler2D;
  uniform sampler2D normalTexture;
  uniform sampler2D depthTexture;
  uniform float bounces;
  varying vec2 vUv;
  vec3 WorldPosFromDepth(float depth, vec2 coord) {
    float z = depth * 2.0 - 1.0;
    vec4 clipSpacePosition = vec4(coord * 2.0 - 1.0, z, 1.0);
    vec4 viewSpacePosition = cameraProjectionMatrixInv * clipSpacePosition;
    // Perspective division
    viewSpacePosition /= viewSpacePosition.w;
    vec4 worldSpacePosition = cameraMatrixWorld * viewSpacePosition;
    return worldSpacePosition.xyz;
  }                  
  float sdPlane( vec3 p, vec3 n, float h ) {
    // n must be normalized
    return dot(p,n) + h;
  }
  float planeIntersect( vec3 ro, vec3 rd, vec4 p ) {
    return -(dot(ro,p.xyz)+p.w)/dot(rd,p.xyz);
  }
  vec3 totalInternalReflection(vec3 ro, vec3 rd, vec3 pos, vec3 normal, float ior, out vec3 rayOrigin, out vec3 rayDirection) {
    rayOrigin = ro;
    rayDirection = rd;
    rayDirection = refract(rayDirection, normal, 1.0 / ior);
    rayOrigin = pos + rayDirection * 0.1;
    return rayDirection;
  }
  void main() {
    // Each sample consists of random offset in the x and y direction
    float caustic = 0.0;
    float causticTexelSize = (1.0 / resolution) * size * 2.0;
    float texelsNeeded = worldRadius / causticTexelSize;
    float sampleRadius = texelsNeeded / resolution;
    float sum = 0.0;
    if (texture2D(depthTexture, vUv).x == 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    vec2 offset1 = vec2(-0.5, -0.5);//vec2(rand() - 0.5, rand() - 0.5);
    vec2 offset2 = vec2(-0.5, 0.5);//vec2(rand() - 0.5, rand() - 0.5);
    vec2 offset3 = vec2(0.5, 0.5);//vec2(rand() - 0.5, rand() - 0.5);
    vec2 offset4 = vec2(0.5, -0.5);//vec2(rand() - 0.5, rand() - 0.5);
    vec2 uv1 = vUv + offset1 * sampleRadius;
    vec2 uv2 = vUv + offset2 * sampleRadius;
    vec2 uv3 = vUv + offset3 * sampleRadius;
    vec2 uv4 = vUv + offset4 * sampleRadius;
    vec3 normal1 = texture2D(normalTexture, uv1, -10.0).rgb * 2.0 - 1.0;
    vec3 normal2 = texture2D(normalTexture, uv2, -10.0).rgb * 2.0 - 1.0;
    vec3 normal3 = texture2D(normalTexture, uv3, -10.0).rgb * 2.0 - 1.0;
    vec3 normal4 = texture2D(normalTexture, uv4, -10.0).rgb * 2.0 - 1.0;
    float depth1 = texture2D(depthTexture, uv1, -10.0).x;
    float depth2 = texture2D(depthTexture, uv2, -10.0).x;
    float depth3 = texture2D(depthTexture, uv3, -10.0).x;
    float depth4 = texture2D(depthTexture, uv4, -10.0).x;
    // Sanity check the depths
    if (depth1 == 1.0 || depth2 == 1.0 || depth3 == 1.0 || depth4 == 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    vec3 pos1 = WorldPosFromDepth(depth1, uv1);
    vec3 pos2 = WorldPosFromDepth(depth2, uv2);
    vec3 pos3 = WorldPosFromDepth(depth3, uv3);
    vec3 pos4 = WorldPosFromDepth(depth4, uv4);
    vec3 originPos1 = WorldPosFromDepth(0.0, uv1);
    vec3 originPos2 = WorldPosFromDepth(0.0, uv2);
    vec3 originPos3 = WorldPosFromDepth(0.0, uv3);
    vec3 originPos4 = WorldPosFromDepth(0.0, uv4);
    vec3 endPos1, endPos2, endPos3, endPos4;
    vec3 endDir1, endDir2, endDir3, endDir4;
    totalInternalReflection(originPos1, lightDir, pos1, normal1, ior, endPos1, endDir1);
    totalInternalReflection(originPos2, lightDir, pos2, normal2, ior, endPos2, endDir2);
    totalInternalReflection(originPos3, lightDir, pos3, normal3, ior, endPos3, endDir3);
    totalInternalReflection(originPos4, lightDir, pos4, normal4, ior, endPos4, endDir4);
    float lightPosArea = length(cross(originPos2 - originPos1, originPos3 - originPos1)) + length(cross(originPos3 - originPos1, originPos4 - originPos1));
    float t1 = planeIntersect(endPos1, endDir1, vec4(lightPlaneNormal, lightPlaneConstant));
    float t2 = planeIntersect(endPos2, endDir2, vec4(lightPlaneNormal, lightPlaneConstant));
    float t3 = planeIntersect(endPos3, endDir3, vec4(lightPlaneNormal, lightPlaneConstant));
    float t4 = planeIntersect(endPos4, endDir4, vec4(lightPlaneNormal, lightPlaneConstant));
    vec3 finalPos1 = endPos1 + endDir1 * t1;
    vec3 finalPos2 = endPos2 + endDir2 * t2;
    vec3 finalPos3 = endPos3 + endDir3 * t3;
    vec3 finalPos4 = endPos4 + endDir4 * t4;
    float finalArea = length(cross(finalPos2 - finalPos1, finalPos3 - finalPos1)) + length(cross(finalPos3 - finalPos1, finalPos4 - finalPos1));
    caustic += intensity * (lightPosArea / finalArea);
    // Calculate the area of the triangle in light spaces
    gl_FragColor = vec4(vec3(max(caustic, 0.0)), 1.0);
  }`
)

const NORMALPROPS = {
  depth: true,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  type: THREE.UnsignedByteType,
}

const CAUSTICPROPS = {
  minFilter: THREE.LinearMipmapLinearFilter,
  magFilter: THREE.LinearFilter,
  type: THREE.FloatType,
  generateMipmaps: true,
}

export type CausticsType = {
  scene: THREE.Scene
  group: THREE.Group
  helper: THREE.CameraHelper
  params: CausticsProps
  update: () => void

  normalTarget: THREE.WebGLRenderTarget
  normalTargetB: THREE.WebGLRenderTarget
  causticsTarget: THREE.WebGLRenderTarget
  causticsTargetB: THREE.WebGLRenderTarget
}

export function createCausticsUpdate(
  updateParameters: () => {
    params: Omit<CausticsProps, 'color'>
    scene: THREE.Scene
    group: THREE.Group
    camera: THREE.OrthographicCamera
    plane: THREE.Mesh<PlaneGeometry, InstanceType<typeof CausticsProjectionMaterial>>
    normalTarget: THREE.WebGLRenderTarget
    normalTargetB: THREE.WebGLRenderTarget
    causticsTarget: THREE.WebGLRenderTarget
    causticsTargetB: THREE.WebGLRenderTarget
    helper?: THREE.CameraHelper | null
  }
) {
  // Normal materials for front and back faces
  const normalMat = createNormalMaterial()
  const normalMatB = createNormalMaterial(THREE.BackSide)
  // The quad that catches the caustics
  const causticsMaterial = new CausticsMaterial()
  const causticsQuad = new FullScreenQuad(causticsMaterial)

  let count = 0

  const v = new THREE.Vector3()
  const lpF = new THREE.Frustum()
  const lpM = new THREE.Matrix4()
  const lpP = new THREE.Plane()

  const lightDir = new THREE.Vector3()
  const lightDirInv = new THREE.Vector3()
  const bounds = new THREE.Box3()
  const focusPos = new THREE.Vector3()

  const boundsVertices: THREE.Vector3[] = []
  const worldVerts: THREE.Vector3[] = []
  const projectedVerts: THREE.Vector3[] = []
  const lightDirs: THREE.Vector3[] = []

  const cameraPos = new THREE.Vector3()

  for (let i = 0; i < 8; i++) {
    boundsVertices.push(new THREE.Vector3())
    worldVerts.push(new THREE.Vector3())
    projectedVerts.push(new THREE.Vector3())
    lightDirs.push(new THREE.Vector3())
  }

  return function update(gl: THREE.WebGLRenderer) {
    const {
      params,
      helper,
      camera,
      plane,
      normalTarget,
      normalTargetB,
      causticsTarget,
      causticsTargetB,
      scene,
      group,
    } = updateParameters()

    if (params.frames === Infinity || (params.frames && count++ < params.frames)) {
      if (isVector3(params.lightSource)) {
        lightDir.copy(params.lightSource).normalize()
      } else if (params.lightSource) {
        lightDir.copy(group.worldToLocal(params.lightSource.getWorldPosition(v)).normalize())
      }

      lightDirInv.copy(lightDir).multiplyScalar(-1)

      scene.parent?.matrixWorld.identity()
      bounds.setFromObject(scene, true)
      boundsVertices[0].set(bounds.min.x, bounds.min.y, bounds.min.z)
      boundsVertices[1].set(bounds.min.x, bounds.min.y, bounds.max.z)
      boundsVertices[2].set(bounds.min.x, bounds.max.y, bounds.min.z)
      boundsVertices[3].set(bounds.min.x, bounds.max.y, bounds.max.z)
      boundsVertices[4].set(bounds.max.x, bounds.min.y, bounds.min.z)
      boundsVertices[5].set(bounds.max.x, bounds.min.y, bounds.max.z)
      boundsVertices[6].set(bounds.max.x, bounds.max.y, bounds.min.z)
      boundsVertices[7].set(bounds.max.x, bounds.max.y, bounds.max.z)

      for (let i = 0; i < 8; i++) {
        worldVerts[i].copy(boundsVertices[i])
      }

      bounds.getCenter(focusPos)
      boundsVertices.map((v) => v.sub(focusPos))
      const lightPlane = lpP.set(lightDirInv, 0)

      boundsVertices.map((v, i) => lightPlane.projectPoint(v, projectedVerts[i]))

      const centralVert = projectedVerts.reduce((a, b) => a.add(b), v.set(0, 0, 0)).divideScalar(projectedVerts.length)
      const radius = projectedVerts.map((v) => v.distanceTo(centralVert)).reduce((a, b) => Math.max(a, b))
      const dirLength = boundsVertices.map((x) => x.dot(lightDir)).reduce((a, b) => Math.max(a, b))
      // Shadows
      camera.position.copy(cameraPos.copy(lightDir).multiplyScalar(dirLength).add(focusPos))
      camera.lookAt(scene.localToWorld(focusPos))
      const dirMatrix = lpM.lookAt(camera.position, focusPos, v.set(0, 1, 0))
      camera.left = -radius
      camera.right = radius
      camera.top = radius
      camera.bottom = -radius
      if (params.near) camera.near = params.near
      if (params.far) {
        camera.far = params.far
      } else {
        const yOffset = v.set(0, radius, 0).applyMatrix4(dirMatrix)
        const yTime = (camera.position.y + yOffset.y) / lightDir.y
        camera.far = yTime
      }

      camera.updateProjectionMatrix()
      camera.updateMatrixWorld()

      // Now find size of ground plane
      const groundProjectedCoords = worldVerts.map((v, i) =>
        v.add(lightDirs[i].copy(lightDir).multiplyScalar(-v.y / lightDir.y))
      )
      const centerPos = groundProjectedCoords
        .reduce((a, b) => a.add(b), v.set(0, 0, 0))
        .divideScalar(groundProjectedCoords.length)
      const maxSize =
        2 *
        groundProjectedCoords
          .map((v) => Math.hypot(v.x - centerPos.x, v.z - centerPos.z))
          .reduce((a, b) => Math.max(a, b))
      plane.scale.setScalar(maxSize)
      plane.position.copy(centerPos)

      if (helper?.parent) helper.update()

      // Inject uniforms
      normalMatB.viewMatrix.value = normalMat.viewMatrix.value = camera.matrixWorldInverse

      const dirLightNearPlane = lpF.setFromProjectionMatrix(
        lpM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      ).planes[4]

      causticsMaterial.cameraMatrixWorld = camera.matrixWorld
      causticsMaterial.cameraProjectionMatrixInv = camera.projectionMatrixInverse
      causticsMaterial.lightDir = lightDirInv

      causticsMaterial.lightPlaneNormal = dirLightNearPlane.normal
      causticsMaterial.lightPlaneConstant = dirLightNearPlane.constant

      causticsMaterial.near = camera.near
      causticsMaterial.far = camera.far
      if (params.resolution) causticsMaterial.resolution = params.resolution
      causticsMaterial.size = radius

      if (params.intensity) causticsMaterial.intensity = params.intensity
      if (params.worldRadius) causticsMaterial.worldRadius = params.worldRadius

      // Switch the scene on
      scene.visible = true

      // Render front face normals
      gl.setRenderTarget(normalTarget)
      gl.clear()
      scene.overrideMaterial = normalMat
      gl.render(scene, camera)

      // Render back face normals, if enabled
      gl.setRenderTarget(normalTargetB)
      gl.clear()
      if (params.backside) {
        scene.overrideMaterial = normalMatB
        gl.render(scene, camera)
      }

      // Remove the override material
      scene.overrideMaterial = null
      // Render front face caustics
      if (params.ior) causticsMaterial.ior = params.ior
      plane.material.lightProjMatrix = camera.projectionMatrix
      plane.material.lightViewMatrix = camera.matrixWorldInverse
      causticsMaterial.normalTexture = normalTarget.texture
      causticsMaterial.depthTexture = normalTarget.depthTexture
      gl.setRenderTarget(causticsTarget)
      gl.clear()
      causticsQuad.render(gl)

      // Render back face caustics, if enabled
      if (params.backsideIOR) causticsMaterial.ior = params.backsideIOR
      causticsMaterial.normalTexture = normalTargetB.texture
      causticsMaterial.depthTexture = normalTargetB.depthTexture
      gl.setRenderTarget(causticsTargetB)
      gl.clear()
      if (params.backside) causticsQuad.render(gl)

      // Reset render target
      gl.setRenderTarget(null)

      // Switch the scene off if caustics is all that's wanted
      if (params.causticsOnly) scene.visible = false
    }
  }
}

export const Caustics = (
  renderer: THREE.WebGLRenderer,
  {
    frames = 1,
    causticsOnly = false,
    ior = 1.1,
    backside = false,
    backsideIOR = 1.1,
    worldRadius = 0.3125,
    color = new THREE.Color('white'),
    intensity = 0.05,
    resolution = 2024,
    lightSource = new THREE.Vector3(1, 1, 1),
    near = 0.1,
    far = 0, // auto calculates if zero
  }: CausticsProps = {}
): CausticsType => {
  const params = {
    frames,
    ior,
    color,
    causticsOnly,
    backside,
    backsideIOR,
    worldRadius,
    intensity,
    resolution,
    lightSource,
    near,
    far,
  }
  const group = new THREE.Group()
  group.name = 'caustics_group'

  const camera = new THREE.OrthographicCamera()

  const scene = new THREE.Scene()
  scene.name = 'caustics_scene'

  const gl = renderer

  const helper = new THREE.CameraHelper(camera)
  helper.name = 'caustics_helper'

  // Buffers for front and back faces
  const res = params.resolution
  const normalTarget = useFBO(res, res, NORMALPROPS)
  const normalTargetB = useFBO(res, res, NORMALPROPS)
  const causticsTarget = useFBO(res, res, CAUSTICPROPS)
  const causticsTargetB = useFBO(res, res, CAUSTICPROPS)

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new CausticsProjectionMaterial({
      transparent: true,
      color: params.color,
      causticsTexture: causticsTarget.texture,
      causticsTextureB: causticsTargetB.texture,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.SrcAlphaFactor,
      depthWrite: false,
    })
  )

  plane.name = 'caustics_plane'
  plane.rotation.x = -Math.PI / 2
  plane.renderOrder = 2
  group.add(scene, plane)
  // scene.add(activeModel) //add glb to caustics scene
  // mainObjects.add(group, helper) // add entire group to scene
  group.updateWorldMatrix(false, true)

  const update = createCausticsUpdate(() => ({
    params,
    scene,
    group,
    camera,
    plane,
    normalTarget,
    normalTargetB,
    causticsTarget,
    causticsTargetB,
    helper,
  }))

  return {
    scene,
    group,
    helper,
    params,
    update: update.bind({}, gl),

    normalTarget,
    normalTargetB,
    causticsTarget,
    causticsTargetB,
  }
}
