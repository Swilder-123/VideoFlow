<script setup>
import AppIcon from './AppIcon.vue'
defineProps({ page: String, version: String })
defineEmits(['navigate'])
const items = [{ id: 'convert', label: '视频转换', icon: 'play' }, { id: 'history', label: '转换记录', icon: 'history' }, { id: 'settings', label: '设置', icon: 'settings' }]
</script>

<template>
  <aside class="sidebar">
    <div class="brand"><div class="brand-icon"><AppIcon name="video" :size="30" /></div><div><strong>VideoFlow</strong><p>视频格式转换器</p></div></div>
    <nav aria-label="主导航" class="flex flex-col gap-2">
      <button v-for="item in items" :key="item.id" class="nav-item" :class="{ active: page === item.id }" :aria-current="page === item.id ? 'page' : undefined" @click="$emit('navigate', item.id)"><span class="nav-icon"><AppIcon :name="item.icon" :size="23" /></span>{{ item.label }}</button>
    </nav>
    <div class="sidebar-footer"><span class="phase-dot"></span> 本地视频格式转换<p>v{{ version || '—' }}</p></div>
  </aside>
</template>
