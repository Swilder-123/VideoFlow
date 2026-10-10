import { ref, computed, onUnmounted } from 'vue'

export function useDesktop() {
  const status = ref(null)
  const ipcState = ref('connecting')
  const error = ref('')
  const busy = ref('')
  const video = ref(null)
  const outputDirectory = ref('')
  const format = ref('MP4')
  const tasks = ref([])
  const importPhase = ref('')
  const activeTask = computed(() => tasks.value.find((task) => ['waiting', 'running'].includes(task.status)))
  const locked = computed(() => !!busy.value || !!importPhase.value || !!activeTask.value)
  const canConvert = computed(() => !locked.value && ipcState.value === 'connected' && !!video.value && !!outputDirectory.value && status.value?.engines.ffmpeg.available && status.value?.engines.ffprobe.available)
  let revision = -1
  function sync(snapshot) {
    if (!snapshot || snapshot.revision < revision) return
    revision = snapshot.revision
    video.value = snapshot.video
    tasks.value = snapshot.tasks
    importPhase.value = snapshot.importPhase
  }
  const unsubscribe = window.videoFlow?.onMediaChanged(sync)
  onUnmounted(() => unsubscribe?.())

  async function perform(action, callback) {
    if (busy.value) return
    error.value = ''
    busy.value = action
    try {
      if (!window.videoFlow) throw new Error('桌面连接不可用，请通过 Electron 启动 VideoFlow。')
      return await callback()
    } catch (reason) { error.value = reason.message || '操作失败，请重试。' }
    finally { busy.value = '' }
  }
  async function unwrap(promise) {
    const result = await promise
    if (!result.ok) throw new Error(result.error)
    return result.data
  }
  async function connect() {
    ipcState.value = 'connecting'
    await perform('connect', async () => {
      status.value = await unwrap(window.videoFlow.getStatus())
      sync(status.value.media)
      outputDirectory.value = status.value.outputDirectory
      ipcState.value = 'connected'
    })
    if (ipcState.value !== 'connected') ipcState.value = 'error'
  }
  const chooseVideo = () => perform('video', async () => {
    await unwrap(window.videoFlow.selectVideo())
  })
  const dropVideo = (files) => perform('video', async () => {
    if (files.length !== 1) throw new Error('当前阶段一次只能选择一个视频文件。')
    await unwrap(window.videoFlow.importDroppedFile(files[0]))
  })
  const chooseOutput = () => perform('output', async () => {
    const selected = await unwrap(window.videoFlow.selectOutputDirectory())
    if (selected) outputDirectory.value = selected
  })
  const openOutput = () => perform('open', () => unwrap(window.videoFlow.openOutputDirectory()))
  const removeVideo = () => perform('remove', () => unwrap(window.videoFlow.removeVideo()))
  const startConversion = () => perform('start', () => unwrap(window.videoFlow.startConversion(video.value?.id, format.value)))
  const cancelConversion = (id = activeTask.value?.id) => perform('cancel', () => unwrap(window.videoFlow.cancelConversion(id)))
  const clearTasks = () => perform('clear', () => unwrap(window.videoFlow.clearTasks()))
  const openResult = (id, kind) => perform('open', () => unwrap(window.videoFlow.openResult(id, kind)))
  return { status, ipcState, error, busy, video, outputDirectory, format, tasks, importPhase, activeTask, locked, canConvert, connect, chooseVideo, dropVideo, chooseOutput, openOutput, removeVideo, startConversion, cancelConversion, clearTasks, openResult }
}
