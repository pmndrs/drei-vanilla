import * as THREE from 'three'
import { shaderMaterial } from './shaderMaterial'
/** Based on
    https://github.com/Fyrestar/THREE.InfiniteGridHelper by https://github.com/Fyrestar
    and https://github.com/threlte/threlte/blob/main/packages/extras/src/lib/components/Grid/Grid.svelte
    by https://github.com/grischaerbe and https://github.com/jerzakm
*/

export type GridProps = {
  /** plane-geometry size, default: [1,1] */
  args?: Array<number>
  /** Cell size, default: 0.5 */
  cellSize?: number
  /** Cell thickness, default: 0.5 */
  cellThickness?: number
  /** Cell color, default: black */
  cellColor?: THREE.Color
  /** Section size, default: 1 */
  sectionSize?: number
  /** Section thickness, default: 1 */
  sectionThickness?: number
  /** Section color, default: #2080ff */
  sectionColor?: THREE.Color
  /** Follow camera, default: false */
  followCamera?: boolean
  /** Display the grid infinitely, default: false */
  infiniteGrid?: boolean
  /** Fade distance, default: 100 */
  fadeDistance?: number
  /** Fade strength, default: 1 */
  fadeStrength?: number
  /** Material side, default: THREE.BackSide */
  side?: THREE.Side
}

const GridMaterial = shaderMaterial<GridProps & any>(
  {
    cellSize: 0.5,
    sectionSize: 1,
    fadeDistance: 100,
    fadeStrength: 1,
    cellThickness: 0.5,
    sectionThickness: 1,
    cellColor: new THREE.Color(),
    sectionColor: new THREE.Color(),
    infiniteGrid: false,
    followCamera: false,
    worldCamProjPosition: new THREE.Vector3(),
    worldPlanePosition: new THREE.Vector3(),
  },
  /* glsl */ `
      varying vec3 localPosition;
      varying vec4 worldPosition;
  
      uniform vec3 worldCamProjPosition;
      uniform vec3 worldPlanePosition;
      uniform float fadeDistance;
      uniform bool infiniteGrid;
      uniform bool followCamera;
  
      void main() {
        localPosition = position.xzy;
        if (infiniteGrid) localPosition *= 1.0 + fadeDistance;
        
        worldPosition = modelMatrix * vec4(localPosition, 1.0);
        if (followCamera) {
          worldPosition.xyz += (worldCamProjPosition - worldPlanePosition);
          localPosition = (inverse(modelMatrix) * worldPosition).xyz;
        }
  
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
  /* glsl */ `
      varying vec3 localPosition;
      varying vec4 worldPosition;
  
      uniform vec3 worldCamProjPosition;
      uniform float cellSize;
      uniform float sectionSize;
      uniform vec3 cellColor;
      uniform vec3 sectionColor;
      uniform float fadeDistance;
      uniform float fadeStrength;
      uniform float cellThickness;
      uniform float sectionThickness;
  
      float getGrid(float size, float thickness) {
        vec2 r = localPosition.xz / size;
        vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
        float line = min(grid.x, grid.y) + 1.0 - thickness;
        return 1.0 - min(line, 1.0);
      }
  
      void main() {
        float g1 = getGrid(cellSize, cellThickness);
        float g2 = getGrid(sectionSize, sectionThickness);
  
        float dist = distance(worldCamProjPosition, worldPosition.xyz);
        float d = 1.0 - min(dist / fadeDistance, 1.0);
        vec3 color = mix(cellColor, sectionColor, min(1.0, sectionThickness * g2));
  
        gl_FragColor = vec4(color, (g1 + g2) * pow(d, fadeStrength));
        gl_FragColor.a = mix(0.75 * gl_FragColor.a, gl_FragColor.a, g2);
        if (gl_FragColor.a <= 0.0) discard;
  
        #include <tonemapping_fragment>
        #include <${parseInt(THREE.REVISION.replace(/\D+/g, '')) >= 154 ? 'colorspace_fragment' : 'encodings_fragment'}>
      }
    `
)

export type GridType = {
  /* Mesh with gridMaterial to add to your scene  */
  mesh: THREE.Mesh
  /* Call in animate loop to update grid w.r.t camera */
  update: (camera: THREE.Camera) => void
}

export const Grid = ({
  args = [1, 1],
  cellColor = new THREE.Color('#000000'),
  sectionColor = new THREE.Color('#2080ff'),
  cellSize = 0.5,
  sectionSize = 1,
  followCamera = false,
  infiniteGrid = false,
  fadeDistance = 100,
  fadeStrength = 1,
  cellThickness = 0.5,
  sectionThickness = 1,
  side = THREE.BackSide,
}: GridProps = {}): GridType => {
  const uniforms1 = { cellSize, sectionSize, cellColor, sectionColor, cellThickness, sectionThickness }
  const uniforms2 = { fadeDistance, fadeStrength, infiniteGrid, followCamera }
  const gridMaterial = new GridMaterial({
    transparent: true,
    side,
    ...uniforms1,
    ...uniforms2,
  })
  const planeGeometry = new THREE.PlaneGeometry(args[0], args[1])
  const mesh = new THREE.Mesh(planeGeometry, gridMaterial)
  mesh.frustumCulled = false

  const plane = new THREE.Plane()
  const upVector = new THREE.Vector3(0, 1, 0)
  const zeroVector = new THREE.Vector3(0, 0, 0)

  const update = (camera: THREE.Camera) => {
    if (!mesh.parent) return
    plane.setFromNormalAndCoplanarPoint(upVector, zeroVector).applyMatrix4(mesh.matrixWorld)
    const gridMaterial = mesh.material as THREE.ShaderMaterial
    const worldCamProjPosition = gridMaterial.uniforms.worldCamProjPosition as THREE.Uniform<THREE.Vector3>
    const worldPlanePosition = gridMaterial.uniforms.worldPlanePosition as THREE.Uniform<THREE.Vector3>
    plane.projectPoint(camera.position, worldCamProjPosition.value)
    worldPlanePosition.value.set(0, 0, 0).applyMatrix4(mesh.matrixWorld)
  }

  return {
    mesh,
    update,
  }
}
