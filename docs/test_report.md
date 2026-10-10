# VideoFlow 测试报告

## 最终交付审查补充（2026-10-10）

本轮未修改运行时代码，也未覆盖原测试材料。在仅含 Git 候选文件的全新源码副本中实际执行：npm ci（331 包）、Electron 运行时安装、Vite 构建（22 模块）、npm test（**11 passed，20.7 秒**）、npm run pack，均通过。测试样本和日志只写入本轮专属副本。

副本未复制原 node_modules/dist；本机缓存可能复用，FFmpeg 从重新校验 SHA256 的本地固定版本 ZIP 提取。没有 GitHub 远程，不能称为真实克隆或干净机器测试。无 .git 的导出最初产生较大 CSS；加入本地 Git 元数据后 HTML/CSS/JS 与原构建哈希一致，README 已补充 ZIP 准备说明。

本轮未重新跑完整安装验收或重新生成 NSIS，沿用下面的阶段三历史结果；原 0.3.0 安装包 SHA256 复核不变。许可证 `-L`/buildconf 实测、源码提交范围、未测项及二进制分发阻塞详见 [最终交付审查](final_delivery_check.md) 和 [发布许可复核](release_readiness.md)。

## 阶段三最终结果（2026-10-10）

版本 **0.3.0**。Windows 11 10.0.26200 x64、125% 显示缩放；沿用 Node 24.18.0、npm 11.16.0 和既有依赖。原始 requirements.md 和 UI 参考图的 SHA256 与本报告末尾记录一致。下面将自动化、用户反馈和未验证项分开记录；此前阶段记录仅表示当时结果。

### 构建与安装产物

- `npm.cmd run build` 成功，22 个模块。
- 最终 `npm.cmd test`：**11 passed（16.3 秒）**。
- `npm.cmd run dist:win` 成功，Windows x64 NSIS；应用图标、版本 0.3.0、中文安装向导、开始菜单和桌面快捷方式已配置。
- 最终安装包 `release/0.3.0/VideoFlow-Setup-0.3.0-x64.exe`：**169,428,428 字节（161.58 MiB / 169.43 MB）**。
- SHA256：`2789C7B867AF28D47FA5E6D948582CD38679A2C85D5C1AF4B166BC76EC89AB48`。
- `Get-AuthenticodeSignature` 实测为 **NotSigned**；构建日志出现 signing 不代表有证书签名。
- 未覆盖旧 `release/VideoFlow-Setup-0.1.0.exe`；本轮初始候选包也保存在忽略提交的 `.cache/phase3-first-candidate/`。

### 源码自动化回归

| 验证项 | 实际结果 |
| --- | --- |
| 所有阶段二媒体测试 | 五种目标格式、四种格式反向 MP4、音视频编码核对、完整解码、真实进度、重名不覆盖、源文件不变，通过 |
| 文件和解析异常 | 中文/空格、0.04 秒视频、损坏/空/纯音频、不存在文件、源文件改变、导入后删除，通过 |
| 不可写目录 | 对测试专属临时目录设置当前用户 Windows ACL 拒绝写入，转换真实失败并显示权限提示；恢复 ACL 后检查没有输出，清理目录，通过 |
| 缺失引擎 | 开发环境错误配置、安装环境内置引擎缺失时明确失败；安装模式不会回退到开发目录或环境变量，通过 |
| 磁盘不足提示 | 仅验证 ENOSPC / No space left 错误映射；**没有真实填满磁盘，不计为磁盘耗尽实测** |
| 容器名称 | FFprobe 别名结合扩展名显示 MKV/WEBM/MOV/MP4/AVI，通过 |
| GUI / IPC / 安全 | 页面、真实拖入、按钮禁用、错误状态、隔离、子框架不暴露桥接、无页面运行错误，通过 |
| 窗口与滚动 | 920×640、1280×720、1366×768、1536×1024；无页面水平溢出，主内容滚动时侧栏坐标不变，通过 |
| 取消与窗口关闭 | 真实编码中取消，继续转换/取消退出分支，临时输出清理，通过 |
| 开发启动器 | 实际启动 dev.mjs，Windows 可见窗口句柄、标题及关闭退出，通过 |

阶段三首轮 10 passed / 1 failed：权限测试在拒绝写入的 ACL 尚未恢复时尝试枚举目录，Windows 同时拒绝该测试读取；产品已正确返回权限错误。调整为恢复 ACL 后检查目录，再全量通过。未用伪造的媒体结果修正测试。

### 独立安装后的自动化验收

真实执行 NSIS `/S /D=...`，安装位置为源码外的 `%LOCALAPPDATA%\Programs\VideoFlow 验收 0.3.0`，同时覆盖中文与空格。先完成首个候选的安装测试；最终修改后，真实静默卸载旧候选并安装最终包，卸载/安装退出码均为 0，卸载后原 EXE 和桌面快捷方式确实消失。

最终执行 `npm.cmd run test:installed`：**1 passed（11.7 秒）**，这一项包含以下完整真实流程：

| 安装验收项 | 结果及验证方式 |
| --- | --- |
| 独立启动与资源路径 | installed EXE 启动，isPackaged=true，版本 0.3.0，app.asar 路径位于安装目录；cwd 为安装目录；应用 PATH 仅保留 Windows System32 |
| 无开发引擎依赖 | 设置故意无效的引擎环境变量，实际仍使用安装目录 resources/ffmpeg；两引擎 SHA256 与随附清单一致 |
| 原生文件选择 | 使用 Windows UI Automation 定位本应用对话框，限定控件句柄的 Win32 消息输入真实路径并点击打开；没有替换视频选择的返回值 |
| 元数据与缩略图 | 真实中文空格路径，FFprobe 解析、FFmpeg JPEG、可见缩略图和 MP4/MKV 容器名称，通过 |
| MP4 → MKV → MP4 | 使用安装包内 FFmpeg 完成实际转换；结果文件非空且完整解码无错误 |
| 实际进度与取消 | 720p / 20 秒样本转 WEBM，在真实进度出现后取消，取消状态和临时目录清理通过 |
| 活动任务退出 | 再次开始真实 WEBM 转换后关闭，自动选择“取消任务并退出”；退出后无该安装目录的 FFmpeg/FFprobe 子进程，无不完整输出 |
| 文件和目录打开 | 实际调用 shell.openPath / showItemInFolder，IPC 返回成功，未替换 shell；证明操作系统接受打开请求，**不等同于人工完整观看/听取播放** |
| 重启后使用 | 重新启动安装 EXE，原生选择视频、解析和缩略图再次通过，任务记录为空符合本次运行记录范围 |
| 页面错误 | 未捕获 JavaScript pageerror |

输出目录选择和退出确认的选择结果由自动化提供；输入视频选择、磁盘处理、编码进度、进程清理和结果打开均真实执行。不是在测试中编造转换任务或百分比。

另用 PowerShell 实际运行**桌面快捷方式和开始菜单快捷方式**各一次；两者目标均为独立安装位置，得到可见原生窗口及正确标题，CloseMainWindow 成功、正常退出。最终进程检查无 VideoFlow、FFmpeg 或 FFprobe 残留，系统临时目录无 videoflow-thumbnail-*，最后验收输出目录无 .videoflow-*。

安装自动化调试期间，首次使用启动包装进程 ID 和顶层窗口定位失败；切换实际主进程 ID、所属原生对话框查找。Windows PowerShell 的无 BOM 中文脚本及不支持 ValuePattern 的文件名控件也导致测试辅助脚本失败，最终使用 ASCII 脚本、UI Automation 定位与控件范围内 Win32 消息解决。失败均真实记录，最终成功才列为通过。

本机证据：`.cache/installed-acceptance.json`；最后样本/结果保存在项目外 `VideoFlow 验收数据/videoflow-installed-N88cWm/`。截图为 [`installed-main.png`](../screenshots/installed-main.png) 和 [`installed-920.png`](../screenshots/installed-920.png)。已实际查看截图，保留原卡片、侧栏与配色；修复窄表格中百分号换行及过期阶段标签。

### 打包资源和本地源码交付检查

- 安装目录包含 ffmpeg.exe（105,423,872 字节）、ffprobe.exe（105,221,120 字节），不包含 ffplay；二者均为 9.0.2-essentials_build-www.gyan.dev。
- `resources/licenses/` 包含 GPL 原文、供应方 README、buildconf、引擎版本/哈希清单、Electron 和 23 个生产 npm 依赖的许可证；Electron 的 Chromium notices 随运行时保留。
- 实际检查 app.asar：版本 0.3.0、主进程和 HTML 与最终源码构建字节一致；没有 tests、scripts、tools、test_output、.cache 或 .env。
- `npm.cmd ls --depth=0` 无依赖树错误。未声称完成漏洞审计；阶段一审计端点超时的限制仍保留。
- `.gitignore` 验证排除 node_modules、release、缓存、测试输出、私密环境配置/证书和普通测试截图，只保留两张检查过的安装版截图。
- 对自有源码、脚本和交付文档做本机用户名/绝对开发路径及常见密钥模式扫描，无命中；日志中的旧绝对路径改为项目相对表示。此项是本地文本检查，不等同于完整安全审计。
- 未提交用户 test_output 视频、创建远程仓库或推送 GitHub；Git 仍未建立首次提交。

### 人工测试与未验证项

**用户已提供的人工反馈**：阶段二 MP4、MKV、WEBM 转换结果能够正常打开、播放；原生选择窗口可正常弹出。没有把该反馈改写为用户已经验收 0.3.0 安装版。

**仍未验证**：独立干净 Windows 机器、Windows 10、多显示器/其他 DPI 组合、真实磁盘耗尽、断电/强杀恢复、更多特殊编码素材、安装版结果的完整人工视听播放、交互式安装向导逐页操作及杀毒/SmartScreen 体验。本次真实安装/卸载使用静默模式。没有生成便携包。

**公开发布条件未全部满足**：现有 GPL FFmpeg 对应源码/静态依赖/构建脚本的交付材料未齐，自有代码发布许可证未决定，未配置代码签名。详见 [发布检查](release_readiness.md)。本机功能、构建及安装验收通过，不把它宣称为已经具备全部公开正式交付条件。

## 阶段二最终结果（2026-10-10）

版本 0.2.0，沿用原 Windows / Node / Electron 环境。实际安装 FFmpeg 与 FFprobe **9.0.2-essentials_build-www.gyan.dev**，路径为项目 `tools/ffmpeg/bin/`；下载校验 SHA256 通过，详情见该目录 README。

执行 `npm.cmd run build` 成功（22 个模块）；执行 `npm.cmd test` 最终 **9 passed（15.9 秒）**，没有跳过的媒体用例。

| 用例 | 真实验证结果 |
| --- | --- |
| 桌面转换及生命周期 | Electron 中选择真实样本、MKV 转换、结果操作的路径路由、取消、关闭时继续/取消退出通过 |
| 原桌面集成回归 | 中文空格路径、真实拖拽、元数据/缩略图、错误状态、页面、IPC、隔离、三种窗口尺寸通过 |
| Vite 开发模式 | 真实桌面页面和 IPC 通过 |
| 开发启动器 | 实际执行 dev.mjs，Windows 可见窗口句柄、标题及关闭退出通过 |
| 格式与结果 | MP4 → MP4/AVI/MOV/MKV/WEBM；AVI/MOV/MKV/WEBM → MP4；视频和音频编码核对、全量解码、同名递增、原始文件字节不变通过 |
| 解析边界 | 0.04 秒单帧 JPEG、损坏/空/不支持类型/纯音频文件拒绝、失败不替换原选择、缩略图引擎缺失时降级通过 |
| 取消与失败 | 20 秒 720p 样本的真实 WEBM 转换，在有实际进度时取消；任务取消、无结果发布、无残留临时目录、源文件保留；无效目录和输入变化的失败状态通过 |
| 引擎与进度解析 | 缺失引擎说明、resources/ffmpeg 路径运行验证、分块进度解析通过（解析器用例单独使用文本输入，不冒充媒体测试） |
| 未知时长 | 真实 `-live 1` WebM 的 FFprobe 无 duration，运行进度保持 null，转 MP4 完成后才显示 100% |

首轮测试因单帧 MJPEG 色彩范围问题出现 1 项失败，已修复并全量重测通过。详细过程见开发日志。

该阶段完整媒体测试样本与结果目录：项目 `.cache/phase2-test-i3jh9D`。测试使用 FFmpeg lavfi 生成图案和音频，不依赖应用内模拟数据。输出经过 FFprobe 和 FFmpeg 解码验证；这不能替代对所有外部播放器的人工播放验收。真实完成界面截图：本机 `screenshots/phase2-completed.png`。

自动化对原生对话框和 shell 打开文件的调用边界进行替换，关闭确认测试验证两种用户选择的处理流程；未人工操作这些系统交互。本轮用户已确认第一阶段的原生选择对话框可正常弹出。尚未实测磁盘耗尽、权限拒绝、多显示器和更多特殊拍摄素材。本阶段未执行安装包构建，`release/` 保持旧阶段一产物。

以下保留第一阶段历史记录，**其中“尚未实现视频处理”等描述仅对应当时状态**。

## 阶段一历史测试报告

后续修复验证：用户反馈开发启动后没有窗口，已定位并移除交互式 Electron 启动中的 `windowsHide: true`。新增实际开发脚本的 Windows 原生窗口检测和关闭退出检查。最新执行 `npm.cmd test`：**3 passed（7.9 秒）**。下表中 2 项通过为阶段一初次验证记录；当时未覆盖开发启动器的 spawn 参数，此遗漏现已补齐。

执行日期：2026-10-10（Asia/Shanghai）。环境：Windows 11 / 10.0.26200 x64，Node 24.18.0，npm 11.16.0，Electron 44.7.0。系统显示缩放为 125%，截图像素尺寸可能大于窗口逻辑尺寸。

## 已实际执行

| 验证 | 结果与范围 |
| --- | --- |
| 安装 Vue 与全部开发依赖 | 使用 npm mirror 安装成功，生成 package-lock.json |
| `npm ls --depth=0` | 主要依赖齐全，无依赖树错误 |
| Electron 官方安装器 | 设置镜像后下载并安装 Windows x64 二进制成功 |
| `npm run build` | 成功，21 个模块，生成本地 HTML / JS / CSS |
| `npm test` | 最后一次源码测试：2 passed（5.6 秒） |
| `npm run dev` | 开发脚本实际启动 Vite 与 Electron；发现产物监听问题后修复，并用开发模式集成测试复核 |
| `npm run pack` | 成功生成 `release/win-unpacked/VideoFlow.exe` 及所需运行库 |
| 指定 `VIDEOFLOW_TEST_EXE` 后 `npm test` | 打包后的真实 EXE 完整桌面集成测试通过（该次 1 passed，4.4 秒）；打包模式不运行开发服务器用例 |
| `npm audit --omit=dev` | 审计端点超时，无法得出安全审计结论 |
| 原始需求及图片哈希 | 与开发前一致，未修改 |
| `npm run dist:win` | 首次 GitHub 超时，第二次默认缓存 `EXDEV`；设置工具镜像及项目内缓存后成功生成 NSIS 安装包与 blockmap |

安装包：`release/VideoFlow-Setup-0.1.0.exe`。成功构建时设置 `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/`，`ELECTRON_BUILDER_CACHE` 指向项目 `.cache/electron-builder`。构建日志出现 signing 阶段不表示具备发布签名；实际 `Get-AuthenticodeSignature` 检查 EXE 为 `NotSigned`。

## 桌面集成测试覆盖

- Electron 创建并显示真实 BrowserWindow；生产使用 `file:` 页面，开发使用 `http://127.0.0.1:5173/`。
- Vue 中文主页面加载，主进程真实回复状态，连接指示正常。
- `contextIsolation=true`、`nodeIntegration=false`、`sandbox=true`；渲染页面不能访问 `window.require` 或 `window.process`；子框架没有桌面桥接接口。
- 文件选择后只显示真实文件系统属性，所有解析字段保持“未知（待解析）”，缩略图注明不可用。
- 中文、空格、大写扩展名路径可读取；取消选择保留原文件。
- 不支持的类型、空文件、不存在的文件出现明确错误，错误后原选择不丢失。
- Chromium 文件拖拽事件携带真实磁盘路径，经 Preload 获取路径并成功读取；空拖拽报错；文件可移除。
- 文件选择等待期间按钮禁用，并显示真实操作等待状态。
- 五种目标格式选项存在；切换格式生效，转换按钮始终禁用。
- 选择目录结果在页面和主进程状态中同步；测试结束前恢复系统默认目录。
- 记录页保持空状态；设置页可重新检查 IPC；无虚构任务或百分比。
- 三种窗口尺寸 920×680、1280×800、1536×1024，页面无横向溢出，关键控件可见；较窄窗口将导入区与视频信息纵向排列。
- 生产页面未捕获 JavaScript `pageerror` 或控制台 error；开发页面未捕获 `pageerror`。

## 验证边界

文件选择和目录选择测试替换了 Electron 原生对话框的返回值，**没有人工点击操作 Windows 文件对话框**。其后文件读取、路径校验、IPC、渲染更新均真实执行。拖拽使用真实磁盘文件，通过 Chromium 自动化事件注入，不等同于人工从资源管理器拖动。

测试临时文件明确不是有效视频，仅验证阶段一的文件系统行为，没有用于声称视频解析或转换成功；测试结束删除临时夹具。应用本身没有预置这些文件或任何演示记录。

没有执行真实 FFprobe、FFmpeg、转换进度、播放、任务取消、磁盘空间不足等阶段二及后续测试；未实现的功能在 UI 中明确禁用或注明不可用。

尚未人工验收系统对话框、资源管理器打开、原生窗口控件和多显示器/DPI 组合；未执行安装/卸载回归。程序当前未签名，使用默认 Electron 程序图标，未集成 FFmpeg。

## 截图

- `screenshots/convert.png`：默认窗口的空状态转换页。
- `screenshots/convert-920.png`、`convert-1280.png`、`convert-1536.png`：三种逻辑窗口尺寸。
- `screenshots/history.png`：真实空记录。
- `screenshots/settings.png`：输出目录与引擎状态。

开发过程中实际打开并检查了默认主界面、小窗口和设置页截图。界面保留参考图的灰白布局、左侧导航、青绿色主操作和卡片/表格结构；空视频与空任务展示来自本阶段真实能力边界。

## 原始文件保护

开发前后 SHA256 一致：

```text
requirements.md
33731057675CE9FE1EFD91E028168FDCE8D1A2479C994C840E4CB7ADDC514590

前端UI图/现代中文视频转换器界面.png
4816D90E01C3FE83F69D379E19DBACE8B5419B03D2FB4445BDA50D22FD9E565D
```
