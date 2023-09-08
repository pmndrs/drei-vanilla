// @ts-ignore
import { Text as TextMeshImpl, preloadFont } from 'troika-three-text'

export type TextProps = {
  characters?: string
  color?: number | string
  // the text content
  text: string
  /** Font size, default: 1 */
  fontSize?: number
  maxWidth?: number
  lineHeight?: number
  letterSpacing?: number
  textAlign?: 'left' | 'right' | 'center' | 'justify'
  font?: string
  anchorX?: number | 'left' | 'center' | 'right'
  anchorY?: number | 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom'
  clipRect?: [number, number, number, number]
  depthOffset?: number
  direction?: 'auto' | 'ltr' | 'rtl'
  overflowWrap?: 'normal' | 'break-word'
  whiteSpace?: 'normal' | 'overflowWrap' | 'nowrap'
  outlineWidth?: number | string
  outlineOffsetX?: number | string
  outlineOffsetY?: number | string
  outlineBlur?: number | string
  outlineColor?: number | string
  outlineOpacity?: number
  strokeWidth?: number | string
  strokeColor?: number | string
  strokeOpacity?: number
  fillOpacity?: number
  sdfGlyphSize?: number
  debugSDF?: boolean
  onSync?: (troika: any) => void
  onPreloadEnd?: () => void
}

export type TextType = {
  mesh: THREE.Mesh
  updateProps: (newProps: Partial<TextProps>) => void
  dispose: () => void
}

export const Text = ({
  sdfGlyphSize = 64,
  anchorX = 'center',
  anchorY = 'middle',
  fontSize = 1,
  ...restProps
}: TextProps): TextType => {
  const props: TextProps = {
    sdfGlyphSize,
    anchorX,
    anchorY,
    fontSize,
    ...restProps,
  }
  const troikaMesh = new TextMeshImpl()

  Object.assign(troikaMesh, props)

  if (props.font && props.characters) {
    preloadFont(
      {
        font: props.font,
        characters: props.characters,
      },
      () => {
        props.onPreloadEnd && props.onPreloadEnd()
      }
    )
  }

  return {
    mesh: troikaMesh,
    updateProps(newProps) {
      Object.assign(troikaMesh, newProps)
      troikaMesh.sync(() => {
        props.onSync && props.onSync(troikaMesh)
      })
    },
    dispose() {
      troikaMesh.dispose()
    },
  }
}
