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

type UniformProps = { [name: string]: UniformValue }

type ShaderMaterialInstance<TProps extends UniformProps> = THREE.ShaderMaterial & TProps

type ShaderMaterialParameters<TProps extends UniformProps> = THREE.ShaderMaterialParameters & Partial<TProps>

type ShaderMaterial<TProps extends UniformProps> = (new (
  parameters?: ShaderMaterialParameters<TProps>
) => ShaderMaterialInstance<TProps>) & { key: string }

export function shaderMaterial<TProps extends UniformProps>(
  uniforms: TProps,
  vertexShader: string,
  fragmentShader: string,
  onInit?: (material: ShaderMaterialInstance<TProps>) => void
) {
  const entries = Object.entries(uniforms)

  class Material extends THREE.ShaderMaterial {
    static key = THREE.MathUtils.generateUUID()

    constructor(parameters?: ShaderMaterialParameters<TProps>) {
      super({
        uniforms: entries.reduce((acc, [name, value]) => {
          const uniform = THREE.UniformsUtils.clone({ [name]: { value } })
          return {
            ...acc,
            ...uniform,
          }
        }, {}),
        vertexShader,
        fragmentShader,
      })

      for (const [name] of entries) {
        Object.defineProperty(this, name, {
          get: () => this.uniforms[name].value,
          set: (v) => (this.uniforms[name].value = v),
        })
      }

      Object.assign(this, parameters)

      onInit?.(this as unknown as ShaderMaterialInstance<TProps>)
    }
  }

  return Material as ShaderMaterial<TProps>
}
