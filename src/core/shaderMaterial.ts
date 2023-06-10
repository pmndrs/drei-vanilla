import * as THREE from 'three'

type UniformValue =
  | THREE.CubeTexture
  | THREE.Texture
  | Int32Array
  | Float32Array
  | THREE.Matrix4
  | THREE.Matrix3
  | THREE.Quaternion
  | THREE.Vector4
  | THREE.Vector3
  | THREE.Vector2
  | THREE.Color
  | number
  | boolean
  | Array<any>
  | null

type Uniforms = { [name: string]: UniformValue }

type ShaderMaterialInstance<TUniforms extends Uniforms> = THREE.ShaderMaterial & TUniforms

type ShaderMaterialParameters<TUniforms extends Uniforms> = THREE.ShaderMaterialParameters & Partial<TUniforms>

type ShaderMaterial<TUniforms extends Uniforms> = (new (
  parameters?: ShaderMaterialParameters<TUniforms>
) => ShaderMaterialInstance<TUniforms>) & { key: string }

export function shaderMaterial<TUniforms extends Uniforms>(
  uniforms: TUniforms,
  vertexShader: string,
  fragmentShader: string,
  onInit?: (material: ShaderMaterialInstance<TUniforms>) => void
) {
  const entries = Object.entries(uniforms)
  const uniformDefs = Object.fromEntries(entries.map(([name, value]) => [name, { value }])) as {
    [K in keyof TUniforms]: { value: TUniforms[K] }
  }

  class Material extends THREE.ShaderMaterial {
    static key = THREE.MathUtils.generateUUID()

    constructor(parameters?: ShaderMaterialParameters<TUniforms>) {
      super({ ...parameters, uniforms: uniformDefs, vertexShader, fragmentShader })

      for (const [name] of entries) {
        Object.defineProperty(this, name, {
          get: () => this.uniforms[name].value,
          set: (v) => (this.uniforms[name].value = v),
        })
      }

      Object.assign(this, parameters)

      onInit?.(this as unknown as ShaderMaterialInstance<TUniforms>)
    }
  }

  return Material as ShaderMaterial<TUniforms>
}
