import antfu from '@antfu/eslint-config';

export default antfu({
  formatters: true,
  vue: {
    overrides: {
      'antfu/top-level-function': 'off',
      'vue/component-name-in-template-casing': ['error', 'kebab-case'],
      'antfu/if-newline': 'off',
      'style/brace-style': ['error', '1tbs']
    },
  },
  typescript: {
    overrides: {
      'antfu/top-level-function': 'off',
      'antfu/if-newline': 'off',
      'style/brace-style': ['error', '1tbs']
    },
  },
  javascript: {
    overrides: {
      'antfu/top-level-function': 'off',
      'antfu/if-newline': 'off',
      'style/brace-style': ['error', '1tbs']
    },
  },
  stylistic: {
    semi: true,
  },
});
