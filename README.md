# solid-toaster

An advanced sonner-like toast component for solid.js

## Features

- SolidJS-first implementation with signal-based updates
- Promise toasts, action/cancel buttons, and custom JSX
- Multiple toaster instances and per-toast positioning
- Theming, rich colors, RTL support, and fully unstyled mode
- Exported CSS themes (base, theme, styles) for quick setup
- Option to prevent duplicated toast

## Install

```bash
bun add solid-toaster
# or
npm i solid-toaster
# or
pnpm add solid-toaster
```

Peer dependency: `solid-js`.

## Quick start

```tsx
import 'solid-toaster/styles.css'

import { Toaster, toast } from 'solid-toaster'

function App() {
  return (
    <>
      <button onClick={() => toast('Hello Solid!')}>Toast</button>
      <Toaster />
    </>
  )
}
```

### CSS options

You can import prebuilt styles in seperately:

```tsx
import 'solid-toaster/base.css' // css without theme
import 'solid-toaster/theme.css' // theme
```

## Usage

### Basic variants

```tsx
import { toast, Toaster } from 'solid-toaster'

toast('Default toast')
toast.success('Saved!')
toast.info('Heads up')
toast.warning('Careful')
toast.error('Something went wrong')
toast.loading('Loading...')
toast.promise(promise, options)

<Toaster />
```

#### Compact variants

More tree shakable friendly.

```tsx
import { BaseToaster } from 'solid-toaster'
import * as toast from 'solid-toaster/compact'

toast.message('Default toast')
toast.success('Saved!')
toast.info('Heads up')
toast.warning('Careful')
toast.error('Something went wrong')
toast.loading('Loading...')
toast.promise(promise, options)

<BaseToaster icons={{ loading: <div class="i-lucide:loader-2 animate-spin" /> }} />
```

### Actions and cancel

```tsx
toast('Project deleted', {
  description: 'This can be undone for 5 seconds.',
  action: {
    label: 'Undo',
    onClick: (event) => {
      event.preventDefault()
      toast.success('Undo complete')
    },
  },
  cancel: {
    label: 'Dismiss',
    onClick: () => toast('Dismissed'),
  },
})
```

### Promise toasts

```tsx
const result = toast.promise(
  fetch('/api/user').then((res) => res.json()),
  {
    loading: 'Fetching user... ',
    success: (data) => `Loaded ${data.name}`,
    error: (error) => `Failed: ${error.message}`,
  },
)

// Optional: access the resolved value later
result?.unwrap().then((data) => {
  console.log('Resolved data', data)
})
```

### Custom JSX

```tsx
toast.custom((id) => (
  <div class="my-toast">
    Custom toast {id}
    <button onClick={() => toast.dismiss(id)}>Close</button>
  </div>
))
```

### Multiple toasters

```tsx
<Toaster id="global" position="top-right" />
<Toaster id="canvas" position="top-left" />

// Route to a specific toaster
toast('To global', { toasterId: 'global' })
toast('To canvas', { toasterId: 'canvas' })
```

### Prevent duplicates

```tsx
<Toaster preventDuplicate />
```

When enabled, new toasts that match the most recent toast in the same position
are highlighted instead of duplicated.

## API

### `Toaster` props

```ts
interface ToasterProps {
  id?: string
  invert?: boolean
  theme?: 'light' | 'dark' | 'system'
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
  hotkey?: string[]
  expand?: boolean
  duration?: number
  gap?: number
  visibleToasts?: number
  preventDuplicate?: boolean
  class?: string
  style?: JSX.CSSProperties
  toastClass?: string
  toastStyle?: JSX.CSSProperties
  cancelButtonStyle?: JSX.CSSProperties
  actionButtonStyle?: JSX.CSSProperties
  unstyled?: boolean
  classes?: ToastClasses
  offset?: Offset
  mobileOffset?: Offset
  dir?: 'rtl' | 'ltr' | 'auto'
  swipeDirections?: ('top' | 'right' | 'bottom' | 'left')[]
  customAriaLabel?: string
  containerAriaLabel?: string
  icons?: ToastIcons
  richColors?: boolean
  closeButton?: boolean
  closeButtonAriaLabel?: string
}
```

### Toast API

```ts
toast(message, options?)

toast.success(message, options?)
toast.info(message, options?)
toast.warning(message, options?)
toast.error(message, options?)
toast.loading(message, options?)

toast.promise(promise, options?)
toast.custom(render, options?)

toast.dismiss(id?)

toast.getToasts()
toast.getHistory()
```

### `ExternalToast` options

`ExternalToast` is the options object accepted by `toast(...)` and its variants.
It mirrors the internal toast shape minus auto-managed fields.

Key options include:

- `description`, `duration`, `position`, `class`, `style`
- `action`, `cancel`, `dismissible`, `closeButton`, `richColors`, `invert`
- `icons`, `classes`, `testId`, `onDismiss`, `onAutoClose`

See `src/types.ts` for the full type definitions.

## Styling

- Use `classes` and `toastClass`/`toastStyle` for styling individual toast parts.
- Set `unstyled` to `true` (per toast or on `Toaster`) to disable default styling.
- `richColors` enables stronger accent colors for success/info/warning/error.

## Development

```bash
bun run dev
bun run play

# Validation
bun run qa
bun run build
```

## License

MIT
