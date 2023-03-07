import { BoxGeometry, Mesh, Texture, TextureLoader } from 'three'
import { shaderMaterial } from '../../src/core/shaderMaterial'
import { Setup } from '../Setup'
import { Meta } from '@storybook/html'
import { OrbitControls } from 'three-stdlib'

export default {
  title: 'Shaders/shaderMaterial',
  argTypes: { repeats: { control: { type: 'range', min: 1, max: 5, step: 1 } } },
} as Meta

const MyMaterial = shaderMaterial(
  { map: new Texture(), repeats: 1 },
  `
    varying vec2 vUv;

    void main()	{
      vUv = uv;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    }
    `,
  `
    varying vec2 vUv;
    uniform float repeats;
    uniform sampler2D map;

    float random (vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main(){
      vec2 uv = vUv;

      uv *= repeats;
      uv = fract(uv);

      vec3 color = vec3(
        texture2D(map, uv).r,
        texture2D(map, uv + vec2(0.01,0.01)).g,
        texture2D(map, uv - vec2(0.01,0.01)).b
      );
      
      gl_FragColor = vec4(color,1.0);

      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }
  `
)

export const ShaderMaterialStory = (args) => {
  const { renderer, scene, camera, render } = Setup()
  new OrbitControls(camera, renderer.domElement)

  const loader = new TextureLoader()

  loader.load('https://source.unsplash.com/random/400x400', function (texture) {
    const geometry = new BoxGeometry(1, 1, 1)
    const material = new MyMaterial({
      map: texture,
      repeats: args.repeats,
    })

    const mesh = new Mesh(geometry, material)
    scene.add(mesh)

    render(() => {
      mesh.rotation.x += 0.005
      mesh.rotation.y += 0.01
    })
  })

  return renderer.domElement
}

ShaderMaterialStory.storyName = 'Default'
ShaderMaterialStory.args = {
  repeats: 2,
}
