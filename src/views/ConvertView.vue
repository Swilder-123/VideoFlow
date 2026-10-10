<script setup>
import VideoImport from '../components/VideoImport.vue'
import VideoInfo from '../components/VideoInfo.vue'
import ConversionSettings from '../components/ConversionSettings.vue'
import TaskList from '../components/TaskList.vue'
defineProps({ desktop: Object })
</script>

<template>
  <div class="import-grid">
    <VideoImport :disabled="desktop.locked || desktop.ipcState !== 'connected'" :loading="desktop.busy === 'video'" :phase="desktop.importPhase" @select="desktop.chooseVideo" @drop="desktop.dropVideo" />
    <VideoInfo :video="desktop.video" :phase="desktop.importPhase" :disabled="desktop.locked || desktop.ipcState !== 'connected'" @select="desktop.chooseVideo" @remove="desktop.removeVideo" />
  </div>
  <ConversionSettings v-model:format="desktop.format" :video="desktop.video" :output-directory="desktop.outputDirectory" :disabled="desktop.locked || desktop.ipcState !== 'connected'" :can-convert="desktop.canConvert" :active="!!desktop.activeTask" :cancelling="desktop.busy === 'cancel'" :engine-error="desktop.status?.engines.ffmpeg.error || desktop.status?.engines.ffprobe.error" @choose-output="desktop.chooseOutput" @start="desktop.startConversion" @cancel="desktop.cancelConversion()" />
  <TaskList :tasks="desktop.tasks" :active="!!desktop.activeTask" :disabled="!!desktop.busy || !!desktop.importPhase" @cancel="desktop.cancelConversion" @open="desktop.openResult" @clear="desktop.clearTasks" />
</template>
