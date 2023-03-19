import { ColorManagement, Scene } from 'three'
import './index.css'

export const parameters = {
  layout: 'fullscreen',
}

if ('enabled' in ColorManagement) (ColorManagement as any).enabled = true
else ColorManagement.legacyMode = false

const pool: THREE.Object3D[] = []

const add = Scene.prototype.add
Scene.prototype.add = function (...objects) {
  pool.push(...objects)
  return add.apply(this, objects)
}

export const decorators = [
  (Story) => {
    while (pool.length) {
      const object = pool.shift()
      if (object?.parent) {
        object.traverse((node) => {
          ;(node as any).dispose?.()
          for (const key in node) node[key]?.dispose?.()
        })
      }
    }

    Story()

    // @ts-ignore
    return window.canvas
  },
]
