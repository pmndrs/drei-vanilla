import { IUniform, MeshStandardMaterial, MeshStandardMaterialParameters } from 'three'

export interface MeshWobbleMaterialParameters {
  time?: number
  factor?: number
}

export class MeshWobbleMaterial extends MeshStandardMaterial {
  _time: IUniform<number>
  _factor: IUniform<number>

  constructor({
    time = 0,
    factor = 1,
    ...parameters
  }: MeshStandardMaterialParameters & MeshWobbleMaterialParameters = {}) {
    super(parameters)
    this.setValues(parameters)
    this._time = { value: time }
    this._factor = { value: factor }
  }

  // FIXME Use `THREE.WebGLProgramParametersWithUniforms` type when able to target @types/three@0.160.0
  override onBeforeCompile(shader: { vertexShader: string; uniforms: { [uniform: string]: IUniform } }) {
    shader.uniforms['time'] = this._time
    shader.uniforms['factor'] = this._factor

    shader.vertexShader = `
      uniform float time;
      uniform float factor;
      ${shader.vertexShader}
    `
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `float theta = sin( time + position.y ) / 2.0 * factor;
        float c = cos( theta );
        float s = sin( theta );
        mat3 m = mat3( c, 0, s, 0, 1, 0, -s, 0, c );
        vec3 transformed = vec3( position ) * m;
        vNormal = vNormal * m;`
    )
  }

  get time() {
    return this._time.value
  }

  set time(v) {
    this._time.value = v
  }

  get factor() {
    return this._factor.value
  }

  set factor(v) {
    this._factor.value = v
  }
}
