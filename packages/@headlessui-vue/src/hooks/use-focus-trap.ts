import {
  ref,

  // Types
  Ref,
  watchEffect,
} from 'vue'

import { Keys } from '../keyboard'
import { focusElement, focusIn, Focus, FocusResult } from '../utils/focus-management'
import { useWindowEvent } from '../hooks/use-window-event'
import { contains } from '../internal/dom-containers'

export function useFocusTrap(
  containers: Ref<Set<HTMLElement>>,
  enabled: boolean = true,
  options: { initialFocus?: Ref<HTMLElement | null> } = {}
) {
  let restoreElement = ref<HTMLElement | null>(
    typeof window !== 'undefined' ? (document.activeElement as HTMLElement) : null
  )
  let previousActiveElement = ref<HTMLElement | null>(null)

  // Handle initial focus
  watchEffect(onInvalidate => {
    if (!enabled) return
    if (containers.value.size !== 1) return

    let activeElement = document.activeElement as HTMLElement

    if (options.initialFocus?.value) {
      if (options.initialFocus?.value === activeElement) {
        return // Initial focus ref is already the active element
      }
    } else if (contains(containers.value, activeElement)) {
      return // Already focused within Dialog
    }

    restoreElement.value = activeElement

    // Try to focus the initialFocus ref
    if (options.initialFocus?.value) {
      focusElement(options.initialFocus.value)
    } else {
      let couldFocus = false
      for (let container of containers.value) {
        let result = focusIn(container, Focus.First)
        if (result === FocusResult.Success) {
          couldFocus = true
          break
        }
      }

      if (!couldFocus) throw new Error('There are no focusable elements inside the <FocusTrap />')
    }

    previousActiveElement.value = document.activeElement as HTMLElement

    onInvalidate(() => {
      focusElement(restoreElement.value)
      restoreElement.value = null
      previousActiveElement.value = null
    })
  })

  // Handle Tab & Shift+Tab keyboard events
  useWindowEvent('keydown', event => {
    if (!enabled) return
    if (event.key !== Keys.Tab) return
    if (!document.activeElement) return
    if (containers.value.size !== 1) return

    event.preventDefault()

    for (let element of containers.value) {
      let result = focusIn(
        element,
        (event.shiftKey ? Focus.Previous : Focus.Next) | Focus.WrapAround
      )

      if (result === FocusResult.Success) {
        previousActiveElement.value = document.activeElement as HTMLElement
        break
      }
    }
  })

  // Prevent programmatically escaping
  useWindowEvent('focus', event => {
    if (!enabled) return
    if (containers.value.size !== 1) return

    let previous = previousActiveElement.value
    if (!previous) return

    let toElement = event.target as HTMLElement | null

    if (toElement && toElement instanceof HTMLElement) {
      if (!contains(containers.value, toElement)) {
        event.preventDefault()
        event.stopPropagation()
        focusElement(previous)
      } else {
        previousActiveElement.value = toElement
        focusElement(toElement)
      }
    } else {
      focusElement(previousActiveElement.value)
    }
  })
}
