# Porting Guide: React to SolidJS (Rock UI)

This guide serves as a reference for porting components from the `base-ui` React implementation to `@subf/base-ui` (SolidJS). It complements the general guidelines in `AGENTS.md`.

## Core Philosophy

- **Fine-Grained Reactivity**: Replace React's render cycle model with Solid's signal-based reactivity.
- **Unstyled/Headless**: Components provide functionality and accessibility, not styles.
- **Structure Mirroring**: Maintain the same directory structure and API surface where possible, adapting implementation details to Solid patterns.
- **Efficient Rendering**: Solid only render the component/hook once. If some variable will be changed during React's rerender, you MUST put it into a function accessor to get update.

## 1. State Management

| React Pattern       | SolidJS Pattern                     | Notes                                                                                           |
| :------------------ | :---------------------------------- | :---------------------------------------------------------------------------------------------- |
| `useState(initial)` | `createSignal(initial)`             | Access value as function: `value()`.                                                            |
| `useRef(initial)`   | `let ref` or `ref={el => ref = el}` | Solid refs are synchronous. Use function refs for callback logic.                               |
| `useReducer`        | `createStore` or Signals            | Stores are better for complex nested state.                                                     |
| `useContext`        | `useContext`                        | Works similarly, but context values are reactive objects.                                       |
| `useEffect`         | `createEffect`                      | **Warning**: Solid effects track _all_ read signals. Wrap non-tracking reads in `untrack()`.    |
| `useLayoutEffect`   | `createEffect`                      | In Solid, effects essentially run after render. Use `onMount` for DOM-dependent initialization. |
| `useMemo`           | `createMemo`                        | Caches derived values.                                                                          |
| `useCallback`       | Normal function / `createMemo`      | Functions don't re-create on render in Solid unless inside a tracking scope.                    |

### Derived State

**React**:

```tsx
const disabled = props.disabled || form.disabled
```

**SolidJS**:

```tsx
// Always access props/signals as functions in derived logic
const disabled = () => props.disabled || form.disabled()
```

## 2. Props & Reactivity

### Prop Splitting

Use `splitComponentProps` to separate component logic props from HTML attribute props.

```tsx
import { splitComponentProps } from '../../solid-helpers'

const [
  renderProps, // class & render
  local, // keys that defined in props
  elementProps, // rest props
] = splitComponentProps(props, [
  'value',
  'disabled',
  'onChange',
  // other props...
])
```

### Default Props

Handle default props using the accessor pattern or `mergeProps`:

```tsx
import { mergeProps } from '../../merge-props'

// for complex default
const mergedProps = mergeProps({ disabled: false }, props)
const onKeyDown = () => {
  if (mergedProps.disabled) {
    return
  }
  // ...
}
// for simple default
const disabled = () => local.disabled ?? false
const onKeyDown = () => {
  if (disabled()) {
    return
  }
  // ...
}
```

### Hook Execute Strategy And Return

In hook function block, unlike React, code that outside function only **run ONCE**.

And hooks' return should be reactive. Common way is return a `createMemo`, or a object with accessor/function props. `createStore` has no such limitation.

### Use hook

If you want to pass component props like `props.value` into hook, to keep reactivity, use getter instead of directly pass.

```ts
useSomething({
  get value() {
    return props.value
  },
})
```

## 3. Rendering

### `useRenderElement`

We use a ported version of `useRenderElement` that handles dynamic tag rendering and prop merging.

**React**:

```tsx
const { getRootProps } = useButton({...});
return <button {...getRootProps(props)} />
```

**SolidJS**:

```tsx
const element = useRenderElement('button', props, {
  state,
  props: elementProps,
  // ...
})
return element()
```

### Control Flow

Use Solid's control flow components instead of JS logic in JSX.

- `{condition && <div />}` -> `<Show when={condition}><div /></Show>`
- `{list.map(...)}` -> `<For each={list}>{item => ...}</For>`

## 4. Events

- **Naming**: Use standard DOM names (e.g., `onClick`, `onKeyDown`).
- **Delegation**: Solid uses event delegation for standard events.
- **Handlers**: Wrap multiple state updates in `batch(() => { ... })` to prevent intermediate renders (though Solid's fine-grained updates make this less critical than React).

## 5. Floating UI Integration

We have a complete port of `floating-ui-react` in `src/floating-ui-solid`. Use these hooks for all positioning needs.

- **Import**: `import { useFloating, ... } from '../floating-ui-solid'`
- **Usage**: Similar API to React, but options are often reactive accessors.
- **Context**: Ensure `FloatingTree` is used if nested floating elements are needed.

## 6. Utilities

We have a robust set of internal utilities in `src/utils` and `src/utils-internal`.

- **State**: `useControlled`, `usePreviousValue`
- **DOM**: `useBaseUiId`, `useRenderElement`, `isElementDisabled`
- **Events**: `useEnhancedClickHandler`, `createBaseUIEventDetails`
- **Store**: Internal store implementation in `src/utils-internal/store` for complex shared state (e.g. Popups).

```ts
import { combineStyle } from '@solid-primitives/props'
import { mergeRefs } from '@solid-primitives/refs'
```

## 7. Common Pitfalls to Avoid

1.  **Destructuring Props**: `const { value } = props` loses reactivity. Always use `props.value`.
2.  **Early Returns**: You cannot return early in the component body (e.g., `if (loading) return null`) if hooks/signals are defined after. All signals must be created unconditionally.
3.  **Effect Dependencies**: Don't pass a dependency array to `createEffect`. It tracks automatically.
4.  **Reactivity in Context**: Plain object in context is NOT reactivity. Use `createStore`.

## 8. Testing

Follow the testing guidelines in `AGENTS.md`.

- Port tests from React but adapt to `@solidjs/testing-library`.
- Use `vi.fn()` for mocks.
- Ensure `userEvent` interactions await properly.
- Use `src/floating-ui-solid` tests as reference for complex hook testing.

## Reference

See `AGENTS.md` for project-specific conventions like naming, file structure, and build commands.
