import {
  Teleport,
  defineComponent,
  h,
  inject,
  onUnmounted,
  provide,
  reactive,
  ref,
  watchEffect,

  // Types
  InjectionKey,
  PropType,
} from 'vue'
import { render } from '../../utils/render'

// ---

function getPortalRoot() {
  let existingRoot = document.getElementById('headlessui-portal-root')
  if (existingRoot) return existingRoot

  let root = document.createElement('div')
  root.setAttribute('id', 'headlessui-portal-root')
  return document.body.appendChild(root)
}

export let Portal = defineComponent({
  name: 'Portal',
  props: {
    as: { type: [Object, String], default: 'template' },
  },
  setup(props, { slots, attrs }) {
    let groupContext = inject(PortalGroupContext, null)
    let myTarget = ref(groupContext === null ? getPortalRoot() : groupContext.resolveTarget())

    watchEffect(() => {
      if (groupContext === null) return
      myTarget.value = groupContext.resolveTarget()
    })

    onUnmounted(() => {
      let target = myTarget.value

      if (!target) return
      if (target === groupContext?.resolveTarget()) return

      if (target.children.length <= 0) {
        target.parentElement?.removeChild(target)
      }
    })

    return () => {
      if (myTarget.value === null) return null
      return h(Teleport, { to: myTarget.value }, [render({ props, slot: {}, attrs, slots })])
    }
  },
})

// ---

let PortalGroupContext = Symbol('PortalGroupContext') as InjectionKey<{
  resolveTarget(): HTMLElement | null
}>

export let PortalGroup = defineComponent({
  name: 'PortalGroup',
  props: {
    as: { type: [Object, String], default: 'template' },
    target: { type: Object as PropType<HTMLElement | null>, default: null },
  },
  setup(props, { attrs, slots }) {
    let api = reactive({
      resolveTarget() {
        return props.target
      },
    })

    provide(PortalGroupContext, api)

    return () => {
      let { target: _, ...passThroughProps } = props

      return render({ props: passThroughProps, slot: {}, attrs, slots })
    }
  },
})
