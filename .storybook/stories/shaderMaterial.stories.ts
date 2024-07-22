import { BoxGeometry, Mesh, Texture, TextureLoader, REVISION } from 'three'
import { shaderMaterial } from '../../src/core/shaderMaterial'
import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'lil-gui'

export default {
  title: 'Shaders/shaderMaterial',
} as Meta // TODO: this should be `satisfies Meta` but commit hooks lag behind TS

const MyMaterial = shaderMaterial(
  {
    map: new Texture(),
    repeats: 1,
  },
  /* glsl */ `
    varying vec2 vUv;

    void main()	{
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    uniform float repeats;
    uniform sampler2D map;

    // float random(vec2 st) {
    //   return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    // }

    void main() {
      vec2 uv = fract(vUv * repeats);

      vec3 color = vec3(
        texture(map, uv).r,
        texture(map, uv + vec2(0.01)).g,
        texture(map, uv - vec2(0.01)).b
      );

      gl_FragColor = vec4(color, 1.0);

      #include <tonemapping_fragment>
      #include <${parseInt(REVISION.replace(/\D+/g, '')) >= 154 ? 'colorspace_fragment' : 'encodings_fragment'}>
    }
  `
)

export const ShaderMaterialStory = async () => {
  const params = {
    repeats: 2,
  }
  const gui = new GUI({ title: ShaderMaterialStory.storyName })
  const { renderer, scene, camera, render } = Setup()
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  const texture = new TextureLoader().load('photo-1678043639454-dbdf877f0ae8.jpeg')

  const geometry = new BoxGeometry(1, 1, 1)
  const material = new MyMaterial({ map: texture })
  const mesh = new Mesh(geometry, material)
  scene.add(mesh)

  render((time) => {
    controls.update()
    mesh.rotation.x = time / 5000
    mesh.rotation.y = time / 2500
  })
  material.repeats = params.repeats

  const folder = gui.addFolder('Settings')
  folder.add(params, 'repeats', 1, 5, 1).onChange((v) => {
    material.repeats = v
  })
}

ShaderMaterialStory.storyName = 'Default'
