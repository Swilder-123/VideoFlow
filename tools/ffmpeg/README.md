# 本地 FFmpeg / FFprobe

将 Windows x64 构建中的 `ffmpeg.exe`、`ffprobe.exe` 放在本目录下的 `bin/` 中，保留下载包内的许可证和构建说明。可从 [FFmpeg 下载页](https://ffmpeg.org/download.html) 指向的 [Gyan Windows 构建](https://www.gyan.dev/ffmpeg/builds/) 获取 essentials 构建。

本项目直接调用 CLI，不使用 FFmpeg API 或封装库，不自动修改系统 PATH。可使用绝对路径覆盖：

```powershell
$env:VIDEOFLOW_FFMPEG_PATH='C:\ffmpeg\bin\ffmpeg.exe'
$env:VIDEOFLOW_FFPROBE_PATH='C:\ffmpeg\bin\ffprobe.exe'
npm.cmd run dev
```

开发环境查找优先级（每个工具独立解析）：

1. 对应环境变量；显式指定但不可用时报告错误，不悄悄换用其他程序。
2. `process.resourcesPath/ffmpeg/ffmpeg.exe` 和 `ffprobe.exe`，预留正式安装包的 resources 目录。
3. 开发工程 `tools/ffmpeg/bin/`。
4. 系统 PATH 中的绝对目录。

每次启动执行 `-version` 验证可运行性，设置页展示实际版本与路径。缺失时有明确说明；不会自动下载或假装可用。配置后重启应用。

0.3.0 安装版仅查找自身 `resources/ffmpeg/`（app.asar 外），忽略上述环境变量和全局 PATH；缺失会明确要求重新安装。electron-builder 的 `extraResources` 仅复制 ffmpeg.exe、ffprobe.exe，不复制 ffplay。最终用户无需单独安装引擎。

准备构建时还需将下载包中的 LICENSE 保留为本目录 `LICENSE`，原始 README 保留为 `third-party/FFmpeg-vendor-README.txt`。`npm.cmd run prepare:release` 校验两个本地引擎、生成版本/哈希清单、buildconf 和许可证目录；安装包内保留于 `resources/licenses/`。更换引擎时必须同步更新其来源、供应方通知和许可判断，不能复用旧声明。

当前构建含 GPLv3 组件，完整对应源码交付材料尚未补齐。可以用于本地安装验收，公开分发前必须完成 [发布检查](../../docs/release_readiness.md)，不能把仅附带 LICENSE 当作全部许可要求已经满足。

## 本机实际安装记录

### 固定版本准备示例

先从文末固定版本地址下载 ZIP，保存为 `.cache/ffmpeg-9.0.2-download.zip`。以下命令在项目根目录运行，只向新建解压目录写入；不会自动删除已有引擎或测试材料：

```powershell
$archive = '.cache\ffmpeg-9.0.2-download.zip'
$expected = '60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba'
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expected) { throw '下载包校验失败' }
$unpackDirectory = Join-Path '.cache' ('ffmpeg-9.0.2-' + [guid]::NewGuid().ToString('N'))
Expand-Archive -LiteralPath $archive -DestinationPath $unpackDirectory
$vendorDirectory = Join-Path $unpackDirectory 'ffmpeg-9.0.2-essentials_build'
New-Item -ItemType Directory -Force 'tools\ffmpeg\bin' | Out-Null
Copy-Item -LiteralPath (Join-Path $vendorDirectory 'bin\ffmpeg.exe') -Destination 'tools\ffmpeg\bin\ffmpeg.exe'
Copy-Item -LiteralPath (Join-Path $vendorDirectory 'bin\ffprobe.exe') -Destination 'tools\ffmpeg\bin\ffprobe.exe'
Copy-Item -LiteralPath (Join-Path $vendorDirectory 'LICENSE') -Destination 'tools\ffmpeg\LICENSE'
Copy-Item -LiteralPath (Join-Path $vendorDirectory 'README.txt') -Destination 'third-party\FFmpeg-vendor-README.txt'
npm.cmd run prepare:release
```

以上复制步骤适用于首次准备或明确更新本地引擎时；已有不同构建请先备份，不要把旧构建的通知与新二进制混用。发布准备脚本中的提供方/许可标签针对当前 Gyan 构建，并不会自动审计任意替换引擎的许可。

### 原始安装记录

2026-10-10：原 PATH 未找到 FFmpeg 或 FFprobe，下载 Gyan 的 `ffmpeg-9.0.2-essentials_build.zip`，并与同址提供的 `.sha256` 校验文件比较，结果一致：

```text
60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba
```

已复制 `bin/` 和原始 LICENSE 到本目录；FFmpeg 与 FFprobe 均实测 `-version` 成功，版本为 `9.0.2-essentials_build-www.gyan.dev`。下载地址：<https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-9.0.2-essentials_build.zip>。网络较慢，开发时采用分段下载后合并并校验；下载脚本和中间文件只保存在 `.cache/`，不属于应用运行时。
