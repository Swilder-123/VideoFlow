<script setup>
import AppIcon from './AppIcon.vue'
defineProps({ format: String, outputDirectory: String, disabled: Boolean, video: Object, canConvert: Boolean, active: Boolean, cancelling: Boolean, engineError: String })
defineEmits(['update:format', 'choose-output', 'start', 'cancel'])
</script>

<template>
  <section class="panel conversion-settings">
    <h2 class="mb-4">转换设置</h2>
    <div class="settings-grid">
      <div><label for="output-format">输出格式</label><div class="select-wrap"><select id="output-format" :disabled="disabled" :value="format" @change="$emit('update:format', $event.target.value)"><option v-for="item in ['MP4', 'AVI', 'MOV', 'MKV', 'WEBM']" :key="item">{{ item }}</option></select><AppIcon name="chevron" :size="17" /></div><p class="field-help">{{ format === 'MP4' ? '兼容性优先，适用于大多数设备' : '使用与目标容器兼容的视频和音频编码' }}</p></div>
      <div><label for="output-path">输出路径</label><div class="path-control"><input id="output-path" :value="outputDirectory" placeholder="正在获取默认目录…" readonly :title="outputDirectory" /><button aria-label="选择输出路径" :disabled="disabled" @click="$emit('choose-output')"><AppIcon name="folder" /></button></div><p class="field-help">转换后的视频将保存到此目录</p></div>
    </div>
    <div class="conversion-actions"><button class="button primary start-button" :disabled="!canConvert" aria-describedby="conversion-unavailable" @click="$emit('start')"><AppIcon name="convert" />{{ active ? '正在转换…' : '开始转换' }}</button><button class="button" :disabled="!active || cancelling" @click="$emit('cancel')"><AppIcon name="stop" :size="18" />{{ cancelling ? '正在取消…' : '取消转换' }}</button></div>
    <p id="conversion-unavailable" class="availability-note"><AppIcon name="info" :size="15" />{{ engineError || (video && video.extension === format.toLowerCase() ? '同格式将重新编码并另存为新文件，原文件不变。' : '转换结果另存为新文件，同名文件自动编号，不覆盖原文件。') }}</p>
  </section>
</template>
