import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

const TS_FILES = ['**/*.{ts,tsx}']
const SCRIPT_FILES = ['scripts/**/*.mjs', '*.mjs']

export default tseslint.config(
  {
    ignores: ['dist/**', 'backups/**', 'viz/**', 'design-demos/**', 'node_modules/**', 'e2e/.artifacts/**', 'playwright-report/**'],
  },
  // 基础 JS 规则（对 TS 文件由下方 typescript-eslint 的 eslint-recommended 覆盖层接管）
  { files: [...TS_FILES, ...SCRIPT_FILES], ...js.configs.recommended },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: TS_FILES })),
  {
    files: TS_FILES,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // 只看护真实 bug：hooks 调用顺序是错误，依赖数组完整度是提示
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // 这个仓库里已存在大量 any / 未用变量，先降级为提示，逐步收敛
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': ['warn', { checkLoops: false }],
    },
  },
  {
    // context 与共享模块本来就同时导出 hook / 工具函数和组件，fast-refresh
    // 的"只导出组件"检查在这两处只会制造噪声，故关闭；组件目录继续保留该检查。
    files: ['src/services/**/*.tsx', 'src/lib/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: SCRIPT_FILES,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      // node 脚本里常带 page.evaluate(() => document…)：回调在浏览器上下文执行，
      // 所以这里同时给出 node 与 browser 的全局名，否则 no-undef 会误报。
      globals: { ...globals.node, ...globals.browser },
    },
  },
)
