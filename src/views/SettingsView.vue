<script setup>
import AppIcon from '../components/AppIcon.vue'
defineProps({ desktop: Object })
</script>

<template>
  <section class="panel settings-section"><h2>输出目录</h2><p class="muted mt-2">用于保存转换后的视频，本次运行期间有效。</p><div class="settings-directory"><div class="directory-display"><AppIcon name="folder" /><span :title="desktop.outputDirectory">{{ desktop.outputDirectory || '尚未获取目录' }}</span></div><button class="button" :disabled="desktop.locked || desktop.ipcState !== 'connected'" @click="desktop.chooseOutput">选择目录</button></div></section>
  <section class="panel settings-section"><h2>视频处理引擎</h2><div v-for="name in ['ffmpeg', 'ffprobe']" :key="name" class="settings-row"><div class="engine-details"><strong>{{ name === 'ffmpeg' ? 'FFmpeg' : 'FFprobe' }}</strong><p class="muted mt-1">{{ desktop.status?.engines[name].version || desktop.status?.engines[name].error || '正在检测…' }}</p><p v-if="desktop.status?.engines[name].available" class="muted mt-1 engine-path" :title="desktop.status.engines[name].path">{{ desktop.status.engines[name].path }}</p></div><span class="status-tag" :class="{ neutral: !desktop.status?.engines[name].available }">{{ desktop.status?.engines[name].available ? '可用' : '不可用' }}</span></div></section>
  <section class="panel settings-section"><h2>关于 VideoFlow</h2><div class="settings-row"><div><strong>VideoFlow <span class="muted">v{{ desktop.status?.version || '—' }}</span></strong><p class="muted mt-1">简洁、直观的本地视频格式转换器</p></div><span class="status-tag">本地视频处理</span></div><div class="settings-row"><div><strong>桌面通信状态</strong><p class="muted mt-1">{{ desktop.ipcState === 'connected' ? `主进程已响应 · Electron ${desktop.status.electron}` : desktop.ipcState === 'connecting' ? '正在连接桌面主进程…' : '桌面连接失败，请重试' }}</p></div><button class="button compact" :disabled="!!desktop.busy" @click="desktop.connect"><AppIcon name="refresh" :size="16" :class="{ spinning: desktop.busy === 'connect' }" />检查连接</button></div></section>
</template>
