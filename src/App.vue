<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import Sidebar from './components/Sidebar.vue'
import AppIcon from './components/AppIcon.vue'
import ConvertView from './views/ConvertView.vue'
import HistoryView from './views/HistoryView.vue'
import SettingsView from './views/SettingsView.vue'
import { useDesktop } from './composables/useDesktop'

const desktop = reactive(useDesktop())
const page = ref('convert')
const pages = {
  convert: { title: '视频格式转换', subtitle: '支持多种视频格式转换，快速、简单、高效' },
  history: { title: '转换记录', subtitle: '查看本次运行期间的视频转换任务与结果' },
  settings: { title: '设置', subtitle: '管理输出目录，了解客户端与视频处理引擎状态' },
}
const current = computed(() => pages[page.value])
onMounted(desktop.connect)
</script>

<template>
  <div class="app-shell" @dragover.prevent @drop.prevent>
    <div class="titlebar"><span>VideoFlow</span></div>
    <Sidebar :page="page" :version="desktop.status?.version" @navigate="page = $event" />
    <main class="workspace">
      <header class="page-header"><div><h1>{{ current.title }}</h1><p>{{ current.subtitle }}</p></div><div v-if="page === 'convert'" class="output-actions"><button class="button output-choice" :disabled="desktop.locked || desktop.ipcState !== 'connected'" @click="desktop.chooseOutput"><AppIcon name="folder" :size="22" /><span><strong>{{ desktop.busy === 'output' ? '正在选择目录…' : '选择输出目录' }}</strong><small :title="desktop.outputDirectory">{{ desktop.outputDirectory || '正在获取默认目录…' }}</small></span></button><button class="button open-directory" :disabled="!!desktop.busy || !desktop.outputDirectory || desktop.ipcState !== 'connected'" @click="desktop.openOutput"><AppIcon name="folder" />打开目录</button></div></header>
      <div v-if="desktop.error" role="alert" class="error-banner"><AppIcon name="info" /><span>{{ desktop.error }}</span><button v-if="desktop.ipcState === 'error'" class="text-button" :disabled="!!desktop.busy" @click="desktop.connect">重试连接</button><button aria-label="关闭错误提示" class="icon-button" @click="desktop.error = ''"><AppIcon name="close" :size="17" /></button></div>
      <div v-if="desktop.ipcState === 'connecting'" role="status" class="notice mb-4"><AppIcon name="refresh" class="spinning" />正在连接桌面主进程…</div>
      <ConvertView v-if="page === 'convert'" :desktop="desktop" />
      <HistoryView v-else-if="page === 'history'" :desktop="desktop" />
      <SettingsView v-else :desktop="desktop" />
      <footer class="workspace-footer"><span><AppIcon name="shield" :size="14" />本地处理，保护隐私</span><span role="status"><i class="connection-dot" :class="{ connected: desktop.ipcState === 'connected' }"></i>{{ desktop.ipcState === 'connected' ? '桌面连接正常' : desktop.ipcState === 'connecting' ? '正在连接' : '桌面连接不可用' }}</span></footer>
    </main>
  </div>
</template>
