import { defineComponent, ref } from 'vue'

import { FocusTrap } from './focus-trap'
import { assertActiveElement, getByText } from '../../test-utils/accessibility-assertions'
import { suppressConsoleLogs } from '../../test-utils/suppress-console-logs'
import { render } from '../../test-utils/vue-testing-library'
import { click, press, shift, Keys } from '../../test-utils/interactions'
import { html } from '../../test-utils/html'

jest.mock('../../hooks/use-id')

beforeAll(() => {
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(setImmediate as any)
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(clearImmediate as any)
})

afterAll(() => jest.restoreAllMocks())

function renderTemplate(input: string | Partial<Parameters<typeof defineComponent>[0]>) {
  let defaultComponents = { FocusTrap }

  if (typeof input === 'string') {
    return render(defineComponent({ template: input, components: defaultComponents }))
  }

  return render(
    defineComponent(
      Object.assign({}, input, {
        components: { ...defaultComponents, ...input.components },
      }) as Parameters<typeof defineComponent>[0]
    )
  )
}

it.skip('should focus the first focusable element inside the FocusTrap', () => {
  renderTemplate(
    html`
      <FocusTrap>
        <button>Trigger</button>
      </FocusTrap>
    `
  )

  assertActiveElement(getByText('Trigger'))
})

it.skip('should focus the autoFocus element inside the FocusTrap if that exists', () => {
  renderTemplate(
    html`
      <FocusTrap>
        <input id="a" type="text" />
        <input id="b" type="text" autofocus />
        <input id="c" type="text" />
      </FocusTrap>
    `
  )

  assertActiveElement(document.getElementById('b'))
})

it.skip('should focus the initialFocus element inside the FocusTrap if that exists', () => {
  renderTemplate({
    template: html`
      <FocusTrap :initialFocus="initialFocusRef">
        <input id="a" type="text" />
        <input id="b" type="text" />
        <input id="c" type="text" ref="initialFocusRef" />
      </FocusTrap>
    `,
    setup() {
      let initialFocusRef = ref(null)
      return { initialFocusRef }
    },
  })

  assertActiveElement(document.getElementById('c'))
})

it.skip('should focus the initialFocus element inside the FocusTrap even if another element has autoFocus', () => {
  renderTemplate({
    template: html`
      <FocusTrap :initialFocus="initialFocusRef">
        <input id="a" type="text" />
        <input id="b" type="text" autofocus />
        <input id="c" type="text" ref="initialFocusRef" />
      </FocusTrap>
    `,
    setup() {
      let initialFocusRef = ref(null)
      return { initialFocusRef }
    },
  })

  assertActiveElement(document.getElementById('c'))
})

it.skip(
  'should error when there is no focusable element inside the FocusTrap',
  suppressConsoleLogs(() => {
    expect(() => {
      renderTemplate(
        html`
          <FocusTrap>
            <span>Nothing to see here...</span>
          </FocusTrap>
        `
      )
    }).toThrowErrorMatchingInlineSnapshot(
      `"There are no focusable elements inside the <FocusTrap />"`
    )
  })
)

it.skip(
  'should not be possible to programmatically escape the focus trap',
  suppressConsoleLogs(async () => {
    renderTemplate({
      template: html`
        <div>
          <input id="a" autofocus />

          <FocusTrap>
            <input id="b" />
            <input id="c" />
            <input id="d" />
          </FocusTrap>
        </div>
      `,
    })

    let [a, b, c, d] = Array.from(document.querySelectorAll('input'))

    // Ensure that input-b is the active elememt
    assertActiveElement(b)

    // Tab to the next item
    await press(Keys.Tab)

    // Ensure that input-c is the active elememt
    assertActiveElement(c)

    // Try to move focus
    a?.focus()

    // Ensure that input-c is still the active element
    assertActiveElement(c)

    // Click on an element within the FocusTrap
    await click(b)

    // Ensure that input-b is the active element
    assertActiveElement(b)

    // Try to move focus again
    a?.focus()

    // Ensure that input-b is still the active element
    assertActiveElement(b)

    // Focus on an element within the FocusTrap
    d?.focus()

    // Ensure that input-d is the active element
    assertActiveElement(d)

    // Try to move focus again
    a?.focus()

    // Ensure that input-d is still the active element
    assertActiveElement(d)
  })
)

it.skip('should restore the previously focused element, before entering the FocusTrap, after the FocusTrap unmounts', async () => {
  renderTemplate({
    template: html`
      <div>
        <input id="item-1" autofocus />
        <button id="item-2" @click="setVisible(true)">
          Open modal
        </button>

        <FocusTrap ng-if="visible">
          <button id="item-3" @click="setVisible(false)">
            Close
          </button>
        </FocusTrap>
      </div>
    `,
    setup() {
      let visible = ref(false)

      return {
        visible,
        setVisible(value: boolean) {
          visible.value = value
        },
      }
    },
  })

  // The input should have focus by default because of the autoFocus prop
  assertActiveElement(document.getElementById('item-1'))

  // Open the modal
  await click(document.getElementById('item-2')) // This will also focus this button

  // Ensure that the first item inside the focus trap is focused
  assertActiveElement(document.getElementById('item-3'))

  // Close the modal
  await click(document.getElementById('item-3'))

  // Ensure that we restored focus correctly
  assertActiveElement(document.getElementById('item-2'))
})

it.skip('should be possible tab to the next focusable element within the focus trap', async () => {
  renderTemplate(
    html`
      <div>
        <button>Before</button>
        <FocusTrap>
          <button id="item-a">Item A</button>
          <button id="item-b">Item B</button>
          <button id="item-c">Item C</button>
        </FocusTrap>
        <button>After</button>
      </div>
    `
  )

  // Item A should be focused because the FocusTrap will focus the first item
  assertActiveElement(document.getElementById('item-a'))

  // Next
  await press(Keys.Tab)
  assertActiveElement(document.getElementById('item-b'))

  // Next
  await press(Keys.Tab)
  assertActiveElement(document.getElementById('item-c'))

  // Loop around!
  await press(Keys.Tab)
  assertActiveElement(document.getElementById('item-a'))
})

it.skip('should be possible shift+tab to the previous focusable element within the focus trap', async () => {
  renderTemplate(
    html`
      <div>
        <button>Before</button>
        <FocusTrap>
          <button id="item-a">Item A</button>
          <button id="item-b">Item B</button>
          <button id="item-c">Item C</button>
        </FocusTrap>
        <button>After</button>
      </div>
    `
  )

  // Item A should be focused because the FocusTrap will focus the first item
  assertActiveElement(document.getElementById('item-a'))

  // Previous (loop around!)
  await press(shift(Keys.Tab))
  assertActiveElement(document.getElementById('item-c'))

  // Previous
  await press(shift(Keys.Tab))
  assertActiveElement(document.getElementById('item-b'))

  // Previous
  await press(shift(Keys.Tab))
  assertActiveElement(document.getElementById('item-a'))
})

it.skip('should skip the initial "hidden" elements within the focus trap', async () => {
  renderTemplate(
    html`
      <div>
        <button id="before">Before</button>
        <FocusTrap>
          <button id="item-a" style="display:none">
            Item A
          </button>
          <button id="item-b" style="display:none">
            Item B
          </button>
          <button id="item-c">Item C</button>
          <button id="item-d">Item D</button>
        </FocusTrap>
        <button>After</button>
      </div>
    `
  )

  // Item C should be focused because the FocusTrap had to skip the first 2
  assertActiveElement(document.getElementById('item-c'))
})

it.skip('should be possible skip "hidden" elements within the focus trap', async () => {
  renderTemplate(
    html`
      <div>
        <button id="before">Before</button>
        <FocusTrap>
          <button id="item-a">Item A</button>
          <button id="item-b">Item B</button>
          <button id="item-c" style="display:none">
            Item C
          </button>
          <button id="item-d">Item D</button>
        </FocusTrap>
        <button>After</button>
      </div>
    `
  )

  // Item A should be focused because the FocusTrap will focus the first item
  assertActiveElement(document.getElementById('item-a'))

  // Next
  await press(Keys.Tab)
  assertActiveElement(document.getElementById('item-b'))

  // Notice that we skipped item-c

  // Next
  await press(Keys.Tab)
  assertActiveElement(document.getElementById('item-d'))

  // Loop around!
  await press(Keys.Tab)
  assertActiveElement(document.getElementById('item-a'))
})

it.skip('should be possible skip disabled elements within the focus trap', async () => {
  renderTemplate(
    html`
      <div>
        <button id="before">Before</button>
        <FocusTrap>
          <button id="item-a">Item A</button>
          <button id="item-b">Item B</button>
          <button id="item-c" disabled>
            Item C
          </button>
          <button id="item-d">Item D</button>
        </FocusTrap>
        <button>After</button>
      </div>
    `
  )

  // Item A should be focused because the FocusTrap will focus the first item
  assertActiveElement(document.getElementById('item-a'))

  // Next
  await press(Keys.Tab)
  assertActiveElement(document.getElementById('item-b'))

  // Notice that we skipped item-c

  // Next
  await press(Keys.Tab)
  assertActiveElement(document.getElementById('item-d'))

  // Loop around!
  await press(Keys.Tab)
  assertActiveElement(document.getElementById('item-a'))
})
