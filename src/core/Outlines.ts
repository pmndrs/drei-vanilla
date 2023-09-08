import * as THREE from 'three'
import { toCreasedNormals } from 'three-stdlib'
import { shaderMaterial } from './shaderMaterial'

export type OutlinesProps = {
  /** Outline color, default: black */
  color: THREE.Color
  /** Outline opacity, default: 1 */
  opacity: number
  /** Outline transparency, default: false */
  transparent: boolean
  /** Outline thickness, default 0.05 */
  thickness: number
  /** Geometry crease angle (0 === no crease), default: Math.PI */
  angle: number
}

export type OutlinesType = {
  group: THREE.Group
  updateProps: (props: Partial<OutlinesProps>) => void
  /**
   * **Note**: Call this method after adding group to mesh.
   */
  render: () => void
}

const OutlinesMaterial = shaderMaterial(
  { color: new THREE.Color('black'), opacity: 1, thickness: 0.05 },
  /* glsl */ `
   #include <common>
   #include <morphtarget_pars_vertex>
   #include <skinning_pars_vertex>
   uniform float thickness;
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
     vec4 transformedNormal = vec4(normal, 0.0);
     vec4 transformedPosition = vec4(transformed, 1.0);
     #ifdef USE_INSTANCING
       transformedNormal = instanceMatrix * transformedNormal;
       transformedPosition = instanceMatrix * transformedPosition;
     #endif
     vec3 newPosition = transformedPosition.xyz + transformedNormal.xyz * thickness;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0); 
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
  thickness = 0.05,
  angle = Math.PI,
}: Partial<OutlinesProps>): OutlinesType {
  const group = new THREE.Group()

  let shapeProps: OutlinesProps = {
    color,
    opacity,
    transparent,
    thickness,
    angle,
  }

  function updateMesh(angle: number) {
    const parent = group.parent as THREE.Mesh & THREE.SkinnedMesh & THREE.InstancedMesh
    group.clear()
    if (parent && parent.geometry) {
      let mesh
      if (parent.skeleton) {
        mesh = new THREE.SkinnedMesh()
        mesh.material = new OutlinesMaterial({ side: THREE.BackSide })
        mesh.bind(parent.skeleton, parent.bindMatrix)
        group.add(mesh)
      } else if (parent.isInstancedMesh) {
        mesh = new THREE.InstancedMesh(parent.geometry, new OutlinesMaterial({ side: THREE.BackSide }), parent.count)
        mesh.instanceMatrix = parent.instanceMatrix
        group.add(mesh)
      } else {
        mesh = new THREE.Mesh()
        mesh.material = new OutlinesMaterial({ side: THREE.BackSide })
        group.add(mesh)
      }
      mesh.geometry = angle ? toCreasedNormals(parent.geometry, angle) : parent.geometry
    }
  }

  function updateProps(newProps?: Partial<OutlinesProps>) {
    shapeProps = { ...shapeProps, ...newProps }
    const mesh = group.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.Material>
    if (mesh) {
      const { transparent, thickness, color, opacity } = shapeProps
      Object.assign(mesh.material, { transparent, thickness, color, opacity })
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
    render() {
      updateMesh(shapeProps.angle)
      updateProps(shapeProps)
    },
  }
}
