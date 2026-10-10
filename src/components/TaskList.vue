<script setup>
import AppIcon from './AppIcon.vue'
import { sizeText } from '../format'
defineProps({ history: Boolean, tasks: { type: Array, default: () => [] }, disabled: Boolean, active: Boolean })
defineEmits(['cancel', 'open', 'clear'])
const labels = { waiting: '等待中', running: '转换中', completed: '已完成', failed: '失败', cancelled: '已取消' }
</script>

<template>
  <section class="task-section">
    <div class="section-heading"><h2>{{ history ? '本次运行的转换记录' : '转换任务' }}<span class="count-badge">{{ tasks.length }}</span></h2><button class="button compact" :disabled="disabled || active || !tasks.length" @click="$emit('clear')"><AppIcon name="trash" :size="15" />清空记录</button></div>
    <div class="task-table-wrap">
      <table class="task-table"><thead><tr><th>文件名称</th><th>输出格式</th><th>进度</th><th>状态</th><th>开始时间</th><th>操作</th></tr></thead><tbody>
        <tr v-for="task in tasks" :key="task.id" :data-task-id="task.id">
          <td><strong class="task-filename" :title="task.name">{{ task.name }}</strong><small v-if="task.outputSize">{{ sizeText(task.outputSize) }}</small><small v-if="task.outputPath" class="task-path" :title="task.outputPath">{{ task.outputPath }}</small><p v-if="task.error" class="task-error" role="alert">{{ task.error }}</p></td>
          <td>{{ task.format }}</td>
          <td><div v-if="task.progress !== null" class="task-progress"><progress :value="task.progress" max="100" :aria-label="`${task.name} 转换进度`"></progress><span>{{ Math.floor(task.progress) }}%</span></div><span v-else class="muted">{{ task.status === 'running' ? '处理中，等待有效时长与进度' : '—' }}</span></td>
          <td><span class="task-status" :class="task.status">{{ labels[task.status] }}</span></td>
          <td>{{ new Date(task.startedAt).toLocaleString('zh-CN', { hour12: false }) }}</td>
          <td><div class="task-actions"><button v-if="['waiting', 'running'].includes(task.status)" class="button compact" :disabled="disabled" @click="$emit('cancel', task.id)">取消</button><template v-if="task.status === 'completed'"><button class="button compact" :disabled="disabled" @click="$emit('open', task.id, 'file')">打开文件</button><button class="button compact" :disabled="disabled" @click="$emit('open', task.id, 'folder')">打开文件夹</button></template></div></td>
        </tr>
        <tr v-if="!tasks.length"><td colspan="6"><div class="empty-state"><div class="empty-icon"><AppIcon :name="history ? 'history' : 'file'" :size="29" /></div><h3>{{ history ? '暂无转换记录' : '还没有转换任务' }}</h3><p>{{ history ? '本次运行期间的转换任务将在这里保留' : '选择视频并开始转换，即可查看实际进度和结果' }}</p></div></td></tr>
      </tbody></table>
    </div>
  </section>
</template>
