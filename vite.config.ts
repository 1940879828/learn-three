import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  // 添加资源处理规则
  assetsInclude: ['**/*.json'],
  plugins: [vue()],
})
