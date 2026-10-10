<script setup>
import AppIcon from '../components/AppIcon.vue'
import TaskList from '../components/TaskList.vue'
defineProps({ desktop: Object })
</script>

<template>
  <div class="notice mb-6"><AppIcon name="info" :size="18" /><p>这里显示本次运行期间的转换任务。退出应用后记录清空，已保存的视频文件会保留。</p></div>
  <TaskList history :tasks="desktop.tasks" :active="!!desktop.activeTask" :disabled="!!desktop.busy || !!desktop.importPhase" @cancel="desktop.cancelConversion" @open="desktop.openResult" @clear="desktop.clearTasks" />
</template>
