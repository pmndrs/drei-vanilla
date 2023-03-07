import './index.css'

export const parameters = {
  layout: 'fullscreen',
}

export const decorators = [
  (Story) => {
    return Story()
  },
]
