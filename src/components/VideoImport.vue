<script setup>
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'
defineProps({ disabled: Boolean, loading: Boolean, phase: String })
const emit = defineEmits(['select', 'drop'])
const hovering = ref(false)
function drop(event) { hovering.value = false; emit('drop', [...event.dataTransfer.files]) }
</script>

<template>
  <section class="import-zone" :class="{ 'is-dragging': hovering && !disabled }" :aria-busy="loading" @dragover.prevent="hovering = true" @dragleave.prevent="hovering = false" @drop.prevent="!disabled && drop($event)">
    <div class="upload-illustration"><AppIcon name="upload" :size="49" /></div>
    <h2>{{ phase === 'parsing' ? '正在解析视频信息…' : phase === 'thumbnail' ? '正在提取缩略图…' : loading ? '正在选择视频文件…' : '点击选择视频文件 或 拖拽视频到这里' }}</h2>
    <p>支持 MP4、AVI、MOV、MKV、WEBM 等常见视频格式</p>
    <button class="button primary" :disabled="disabled" @click="$emit('select')"><AppIcon :name="loading ? 'refresh' : 'video'" :class="{ spinning: loading }" />{{ phase ? '正在读取视频…' : loading ? '等待文件选择…' : '选择视频文件' }}</button>
    <span class="import-footnote">本地文件处理，视频无需上传</span>
  </section>
</template>
