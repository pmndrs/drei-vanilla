import { shaderMaterial } from '../core/shaderMaterial'

export const MeshDiscardMaterial = shaderMaterial(
  {},
  'void main() { }',
  'void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); discard;  }'
)
