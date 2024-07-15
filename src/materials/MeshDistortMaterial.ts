import { IUniform, MeshPhysicalMaterial, MeshPhysicalMaterialParameters } from 'three'
// @ts-ignore
import distort from '../helpers/glsl/distort.vert.glsl'

export interface MeshDistortMaterialParameters {
  time?: number
  distort?: number
  radius?: number
}

export class MeshDistortMaterial extends MeshPhysicalMaterial {
  _time: IUniform<number>
  _distort: IUniform<number>
  _radius: IUniform<number>

  constructor({
    time = 0,
    distort = 0.4,
    radius = 1,
    ...parameters
  }: MeshDistortMaterialParameters & MeshPhysicalMaterialParameters = {}) {
    super(parameters)
    this.setValues(parameters)
    this._time = { value: time }
    this._distort = { value: distort }
    this._radius = { value: radius }
  }

  // FIXME Use `THREE.WebGLProgramParametersWithUniforms` type when able to target @types/three@0.160.0
  onBeforeCompile(shader: { vertexShader: string; uniforms: { [uniform: string]: IUniform } }) {
    shader.uniforms.time = this._time
    shader.uniforms.radius = this._radius
    shader.uniforms.distort = this._distort

    shader.vertexShader = `
      uniform float time;
      uniform float radius;
      uniform float distort;
      ${distort}
      ${shader.vertexShader}
    `
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
        float updateTime = time / 50.0;
        float noise = snoise(vec3(position / 2.0 + updateTime * 5.0));
        vec3 transformed = vec3(position * (noise * pow(distort, 2.0) + radius));
        `
    )
  }

  get time() {
    return this._time.value
  }

  set time(v) {
    this._time.value = v
  }

  get distort() {
    return this._distort.value
  }

  set distort(v) {
    this._distort.value = v
  }

  get radius() {
    return this._radius.value
  }

  set radius(v) {
    this._radius.value = v
  }
}
