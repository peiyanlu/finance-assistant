import { computed, watch } from 'vue'
import { StyleProvider, Themes } from '@varlet/ui'
import { useDark } from '@vueuse/core'
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui'


const styleVars = {
  '--option-font-size': '14px',
}

const isDark = useDark()

/**
 * varlet theme
 */
const changeTheme = (dark: boolean) => {
  StyleProvider({
    ...(dark ? Themes.md3Dark : Themes.md3Light),
    ...styleVars,
  })
}

/**
 * 初始化 + 自动监听
 */
watch(
  isDark,
  (dark) => {
    changeTheme(dark)
  },
  {
    immediate: true,
  },
)

/**
 * naive theme
 */
const theme = computed(() => {
  return isDark.value ? darkTheme : null
})

/**
 * naive theme overrides
 */
const themeOverrides = computed<GlobalThemeOverrides>(() => {
  return isDark.value
    ? {
      common: {
        primaryColor: '#D1BDFF',
        primaryColorHover: '#DDD0FF',
        primaryColorPressed: '#BEA3FF',
        primaryColorSuppl: '#E9DDFF',
      },
    }
    : {
      common: {
        primaryColor: '#6751A4',
        primaryColorHover: '#7A66B8',
        primaryColorPressed: '#57438D',
        primaryColorSuppl: '#D9D0EC',
      },
    }
})

/**
 * theme hook
 */
export const useTheme = () => {
  return {
    isDark,
    theme,
    themeOverrides,
  }
}
