<script setup>
import AppIcon from './AppIcon.vue'
import { sizeText, durationText, containerText } from '../format'
defineProps({ video: Object, disabled: Boolean, phase: String })
defineEmits(['select', 'remove'])
</script>

<template>
  <section class="panel video-panel">
    <div class="preview-placeholder" :aria-busy="!!phase"><img v-if="video?.thumbnail && !phase" :src="video.thumbnail" alt="当前视频缩略图" class="video-thumbnail" /><template v-else><div class="preview-icon"><AppIcon :name="phase ? 'refresh' : 'video'" :class="{ spinning: !!phase }" :size="36" /></div><span>{{ phase === 'parsing' ? '正在解析视频…' : phase === 'thumbnail' ? '正在生成缩略图…' : video ? '缩略图不可用' : '等待导入视频' }}</span><small>{{ video?.thumbnailError || '选择文件后在此查看视频信息' }}</small></template></div>
    <div class="video-details">
      <div class="flex items-center justify-between gap-2 mb-4"><h2>视频信息</h2><button class="button compact" :disabled="disabled || !video" @click="$emit('select')"><AppIcon name="refresh" :size="15" />重新选择</button></div>
      <dl>
        <dt>文件名称</dt><dd :title="video?.path">{{ video?.name || '未选择文件' }}</dd>
        <dt>文件大小</dt><dd>{{ video ? sizeText(video.size) : '—' }}</dd>
        <dt>视频时长</dt><dd>{{ video ? durationText(video.duration) : '—' }}</dd>
        <dt>分辨率</dt><dd>{{ video ? (video.width && video.height ? `${video.width} × ${video.height}` : '未知') : '—' }}</dd>
        <dt>视频编码</dt><dd>{{ video ? video.codec || '未知' : '—' }}</dd>
        <dt>帧率</dt><dd>{{ video ? (video.fps ? `${video.fps.toFixed(2)} fps` : '未知') : '—' }}</dd>
        <dt>容器格式</dt><dd :title="video?.container">{{ video ? containerText(video) : '—' }}</dd>
      </dl>
      <button v-if="video" class="text-button mt-3" :disabled="disabled" @click="$emit('remove')"><AppIcon name="close" :size="14" />移除文件</button>
    </div>
  </section>
</template>
