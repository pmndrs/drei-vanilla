import * as THREE from 'three'

export type BillboardProps = {
  /**
   * @default true
   */
  follow?: boolean
  /**
   * @default false
   */
  lockX?: boolean
  /**
   * @default false
   */
  lockY?: boolean
  /**
   * @default false
   */
  lockZ?: boolean
}

export type BillboardType = {
  group: THREE.Group
  /**
   * Should called every frame to update the billboard
   */
  update: (camera: THREE.Camera) => void
  updateProps: (newProps: Partial<BillboardProps>) => void
}

export const Billboard = ({
  follow = true,
  lockX = false,
  lockY = false,
  lockZ = false,
}: BillboardProps = {}): BillboardType => {
  const group = new THREE.Group()

  const props: BillboardProps = {
    follow,
    lockX,
    lockY,
    lockZ,
  }

  function update(camera: THREE.Camera) {
    const { follow, lockX, lockY, lockZ } = props
    if (!follow) return
    // save previous rotation in case we're locking an axis
    const prevRotation = group.rotation.clone()

    // always face the camera
    camera.getWorldQuaternion(group.quaternion)

    // readjust any axis that is locked
    if (lockX) group.rotation.x = prevRotation.x
    if (lockY) group.rotation.y = prevRotation.y
    if (lockZ) group.rotation.z = prevRotation.z
  }

  return {
    group,
    update,
    updateProps(newProps) {
      Object.assign(props, newProps)
    },
  }
}
