import {
  defineComponent,
  onMounted,
  ref,

  // Types
  PropType,
  Ref,
} from 'vue'
import { render } from '../../utils/render'
import { useFocusTrap } from '../../hooks/use-focus-trap'

export let FocusTrap = defineComponent({
  name: 'FocusTrap',
  props: {
    as: { type: [Object, String], default: 'div' },
    initialFocus: { type: Object as PropType<Ref<HTMLElement | null>>, default: null },
  },
  render() {
    let slot = {}
    let propsWeControl = { ref: 'el' }
    let { initialFocus, ...passThroughProps } = this.$props

    return render({
      props: { ...passThroughProps, ...propsWeControl },
      slot,
      attrs: this.$attrs,
      slots: this.$slots,
    })
  },
  setup(props) {
    let { initialFocus } = props
    let containers = ref(new Set<HTMLElement>())
    let container = ref<HTMLElement | null>(null)

    onMounted(() => {
      if (!container.value) return

      containers.value.add(container.value)

      useFocusTrap(containers, true, { initialFocus })
    })

    return { el: container }
  },
})
