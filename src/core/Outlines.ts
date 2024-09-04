import { shaderMaterial } from './shaderMaterial'
import * as THREE from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type OutlinesProps = {
  /** Outline color, default: black */
  color?: THREE.Color
  /** Line thickness is independent of zoom, default: false */
  screenspace?: boolean
  /** Outline opacity, default: 1 */
  opacity?: number
  /** Outline transparency, default: false */
  transparent?: boolean
  /** Outline thickness, default 0.05 */
  thickness?: number
  /** Geometry crease angle (0 === no crease), default: Math.PI */
  angle?: number
  toneMapped?: boolean
  polygonOffset?: boolean
  polygonOffsetFactor?: number
  renderOrder?: number
  /** needed if `screenspace` is true */
  gl?: THREE.WebGLRenderer
}

export type OutlinesType = {
  group: THREE.Group
  updateProps: (props: Partial<OutlinesProps>) => void
  /**
   * **Note**: Call this method to generate the outline mesh
   */
  generate: () => void
}

const OutlinesMaterial = shaderMaterial(
  {
    screenspace: false,
    color: new THREE.Color('black'),
    opacity: 1,
    thickness: 0.05,
    size: new THREE.Vector2(),
  },
  /* glsl */ `
   #include <common>
   #include <morphtarget_pars_vertex>
   #include <skinning_pars_vertex>
   uniform float thickness;
   uniform float screenspace;
   uniform vec2 size;
   void main() {
     #if defined (USE_SKINNING)
	   #include <beginnormal_vertex>
       #include <morphnormal_vertex>
       #include <skinbase_vertex>
       #include <skinnormal_vertex>
       #include <defaultnormal_vertex>
     #endif
     #include <begin_vertex>
	   #include <morphtarget_vertex>
	   #include <skinning_vertex>
     #include <project_vertex>
     vec4 tNormal = vec4(normal, 0.0);
     vec4 tPosition = vec4(transformed, 1.0);
     #ifdef USE_INSTANCING
       tNormal = instanceMatrix * tNormal;
       tPosition = instanceMatrix * tPosition;
     #endif
     if (screenspace == 0.0) {
       vec3 newPosition = tPosition.xyz + tNormal.xyz * thickness;
       gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0); 
     } else {
       vec4 clipPosition = projectionMatrix * modelViewMatrix * tPosition;
       vec4 clipNormal = projectionMatrix * modelViewMatrix * tNormal;
       vec2 offset = normalize(clipNormal.xy) * thickness / size * clipPosition.w * 2.0;
       clipPosition.xy += offset;
       gl_Position = clipPosition;
     }
   }`,
  /* glsl */ `
   uniform vec3 color;
   uniform float opacity;
   void main(){
     gl_FragColor = vec4(color, opacity);
     #include <tonemapping_fragment>
     #include <${parseInt(THREE.REVISION.replace(/\D+/g, '')) >= 154 ? 'colorspace_fragment' : 'encodings_fragment'}>
   }`
)

export function Outlines({
  color = new THREE.Color('black'),
  opacity = 1,
  transparent = false,
  screenspace = false,
  toneMapped = true,
  polygonOffset = false,
  polygonOffsetFactor = 0,
  renderOrder = 0,
  thickness = 0.05,
  angle = Math.PI,
  gl,
}: Partial<OutlinesProps>): OutlinesType {
  const group = new THREE.Group()

  let shapeProps: OutlinesProps = {
    color,
    opacity,
    transparent,
    screenspace,
    toneMapped,
    polygonOffset,
    polygonOffsetFactor,
    renderOrder,
    thickness,
    angle,
  }

  function updateMesh(angle?: number) {
    const parent = group.parent as THREE.Mesh & THREE.SkinnedMesh & THREE.InstancedMesh
    group.clear()
    if (parent && parent.geometry) {
      let mesh
      const material = new OutlinesMaterial({ side: THREE.BackSide })
      if (parent.skeleton) {
        mesh = new THREE.SkinnedMesh()
        mesh.material = material
        mesh.bind(parent.skeleton, parent.bindMatrix)
        group.add(mesh)
      } else if (parent.isInstancedMesh) {
        mesh = new THREE.InstancedMesh(parent.geometry, material, parent.count)
        mesh.instanceMatrix = parent.instanceMatrix
        group.add(mesh)
      } else {
        mesh = new THREE.Mesh()
        mesh.material = material
        group.add(mesh)
      }
      mesh.geometry = angle ? toCreasedNormals(parent.geometry, angle) : parent.geometry
    }
  }

  function updateProps(newProps?: Partial<OutlinesProps>) {
    shapeProps = { ...shapeProps, ...newProps }
    const mesh = group.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.Material>
    if (mesh) {
      const {
        transparent,
        thickness,
        color,
        opacity,
        screenspace,
        toneMapped,
        polygonOffset,
        polygonOffsetFactor,
        renderOrder,
      } = shapeProps
      const contextSize = new THREE.Vector2()
      if (!gl && shapeProps.screenspace) {
        console.warn('Outlines: "screenspace" requires a WebGLRenderer instance to calculate the outline size')
      }
      if (gl) gl.getSize(contextSize)

      Object.assign(mesh.material, {
        transparent,
        thickness,
        color,
        opacity,
        size: contextSize,
        screenspace,
        toneMapped,
        polygonOffset,
        polygonOffsetFactor,
      })
      if (renderOrder !== undefined) mesh.renderOrder = renderOrder
    }
  }

  return {
    group,
    updateProps(props: Partial<OutlinesProps>) {
      const angle = props.angle ?? shapeProps.angle
      if (angle !== shapeProps.angle) {
        updateMesh(angle)
      }
      updateProps(props)
    },
    generate() {
      updateMesh(shapeProps.angle)
      updateProps(shapeProps)
    },
  }
}
