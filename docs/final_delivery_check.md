# VideoFlow 0.3.0 最终交付审查

日期：2026-10-10。审查对象：当前源码候选集、文档、截图、打包配置，以及已存在的 0.3.0 Windows x64 安装包。完整读取了 requirements、README、开发日志、测试报告、发布检查与打包配置。

本轮未增加功能、修改运行时代码或重构媒体处理；只补充/纠正文档并在隔离副本中执行验证。未删除原安装包、用户视频或既有测试材料；未暂存/提交当前仓库、创建远程仓库或执行 push。

## 两项独立结论

| 交付对象 | 结论 | 准确边界 |
| --- | --- | --- |
| **GitHub 源码提交准备** | **已达到源码与文档提交条件** | 按下方清单提交，不包含引擎二进制、安装包、用户视频和缓存。尚未实际提交/推送，没有远程克隆验收。自有代码没有开源许可声明，不得把“可以提交源码”表述为“已授权开源使用” |
| **安装包公开分发** | **未达到，维持阻塞** | 能构建、安装和转换，不等于分发合规；完整对应源码、静态依赖通知和 FFmpeg 的 IJG 归属材料尚未齐备。现有包仅保留本地验收用途，不能直接作为公开 Release 附件 |

无根目录 LICENSE 并非 GitHub 存储源码的技术障碍；是否公开、是否开放复用权及采用哪种许可证由开发者决定，本轮不替其选择。[GitHub 许可说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository) 区分了公开仓库和开源许可。这里没有推导独立 CLI 的 GPL 标签必然适用于全部 VideoFlow，也没有出具整个项目的法律合规保证。

## 已通过

| 检查项 | 证据与结果 |
| --- | --- |
| 当前 Git 状态 | 当前项目尚无 HEAD、无已跟踪文件、无远程；候选文件均未提交。没有忽略规则生效前已提交大文件的问题 |
| .gitignore | 实际 check-ignore 验证 node_modules、release、.cache、test_output、私密环境配置和证书等排除；只允许两张安装截图进入 screenshots 提交集 |
| 完整提交集 | 初始候选 81 文件、2,378,071 字节；新增三份 Markdown 后最终复查为 84 文件、约 2.42 MB，无单文件超过 10 MiB，无 EXE/ZIP/视频。5 个二进制图像为应用 PNG/ICO、两张截图和原始参考 PNG |
| 源码、依赖与脚本 | Electron/Preload、Vue 组件和状态、媒体引擎/进程/任务、锁文件、开发脚本、图标、测试和 NSIS 配置齐全；未依赖开发者专有绝对目录 |
| 开发/安装引擎边界 | 开发支持覆盖变量、resources、项目 tools 与 PATH；isPackaged 仅用自身 resources/ffmpeg，不回退。构建从 tools/ffmpeg/bin 复制两个工具，不能只配置开发变量代替这些文件 |
| 干净源码副本安装依赖 | 未复制原 node_modules/dist，实际 npm ci 安装 331 包，随后 install-electron 成功 |
| 干净副本构建 | Vite 22 模块通过；有 Git 元数据的副本 HTML/CSS/JS 与现有构建逐文件哈希相同 |
| 干净副本回归 | **11 passed，20.7 秒**；包含真实 FFmpeg 转换和解码、IPC/GUI/开发启动器、取消和 ACL 权限拒绝等 |
| 干净副本打包目录 | npm run pack 通过，实际生成 x64 win-unpacked；两个资源引擎与原引擎 SHA256 一致，发布脚本收集 23 个生产 npm 依赖许可证 |
| 历史安装证据 | 阶段三已执行真实安装/卸载重装、原生选择、MP4↔MKV、进度/取消/退出、重启和两种快捷方式；安装完整测试 1 passed / 11.7 秒。本轮复核原包哈希，不冒充重新执行了整个安装验收 |
| README | 已含介绍、功能、架构、安装/使用、开发/构建/测试命令；修复被忽略 release 目录的 GitHub 失效链接，明确当前没有公开下载；补充固定引擎准备与源码 ZIP 的 Git 元数据说明 |
| 招聘总结交付物 | 新增 ai_development_summary.md：三个阶段、真实反馈、AI 工程选择、修复、测试和限制；满足用户转述的 Markdown 总结与决策/反馈记录要求，未声称通过未提供的完整招聘评分表 |
| 需求/材料保护 | 原 requirements 和参考图哈希未变，旧版/现版安装包及测试材料保留；根目录需求仍是唯一依据，docs/requirements.md 仅作为链接入口 |

最终检查了 README、引擎说明及 docs 下共 8 份 Markdown 的相对文件链接，没有失效链接；与审查前候选清单比对，既有变更仅限 5 份文档，运行时代码、依赖、脚本和打包配置变更数为 0。

## 路径、隐私与敏感信息检查

扫描范围是 `git ls-files --cached --others --exclude-standard` 得到的提交候选文本，另外实际查看了两张提交截图。检查本机用户名/用户目录、常见私钥/API token、带凭据 URL 和 Windows 绝对路径模式；只记录命中位置，不输出可能的秘密内容。未发现个人账户路径、凭据、密钥或用户视频进入候选集。这是启发式本地检查，不能等同于全面安全审计。

存在以下**合理绝对路径**，因此不声称“项目完全不包含任何绝对路径”：

| 位置 | 性质 | 处理 |
| --- | --- | --- |
| 开发日志中的 Node 安装目录/npm.ps1 | 用户实际错误涉及的通用系统安装位置 | 保留历史记录；无个人用户名，不作为应用依赖 |
| 引擎 README 中的 C 盘 ffmpeg 示例 | 明确的配置示例 | 保留，使用者自行修改；正式安装版忽略该覆盖变量 |
| installed.acceptance.js 的 Z 盘 missing 路径 | 故意无效的测试路径 | 验证安装版忽略开发覆盖，不作为业务路径 |
| 两张安装截图中的 X 盘“VideoFlow 验收数据” | 真实测试输出目录，含随机测试目录名 | 已视检，无用户名和私人视频名称；保留原图和真实性，不把路径写入运行配置 |

第三方许可证中的作者/组织名称属于需保留的归属，不当作开发者个人信息删除。依赖锁文件 resolved 主机为 `registry.npmmirror.com`，没有 URL 凭据；`.npmrc` 仅设置 save-exact。没有发现需要修改的现有 .gitignore 规则，因此本轮未改它。

## 可复现性范围与操作记录

1. 按 Git 候选集复制到新建 `.cache/final-review-20261010-195248/source/`，不含原依赖、dist、release、tools 二进制、测试缓存或用户输出。
2. 在副本执行 `npm.cmd ci --registry=https://registry.npmmirror.com --no-audit --no-fund`，成功安装 331 包；设置 Electron 镜像，执行 `npx.cmd --no-install install-electron` 成功。
3. 首次副本没有 `.git`，构建成功但 Tailwind CSS 为 57.17 kB；为模拟克隆后的仓库状态，仅在副本 `git init`，再次构建 CSS 为 18.50 kB。HTML/CSS/JS 哈希与既有正式构建一致，README 记录 ZIP 解压用户的相应准备步骤，未修改构建或 UI 代码。
4. 重新核对本机完整下载 ZIP 的 SHA256，解压到新目录，取出两个引擎、LICENSE 和供应方 README 置于副本指定位置。没有使用早前未完成的下载文件，没有重新联网下载大归档。
5. 执行 `npm.cmd test`：11 项通过；执行 `npm.cmd run pack`：成功。产物只写在副本的 release 内，主项目原包不动。

日志、候选清单和扫描结果位于被忽略的 `.cache/final-review-20261010-195248/`，未进入提交列表。副本按当前机器环境运行，允许使用 npm/Electron 下载缓存；不是全新 Windows、空下载缓存或真实远程克隆。**能够复现本地构建流程，不保证独立机器和安装程序整体逐字节可复现**；NSIS 安装程序本轮未重建，仍采用阶段三验证过且哈希未变的包。

npm 安装有 inflight/rimraf/glob/boolean 等传递依赖弃用提醒，以及 electron-winstaller 安装脚本未授权提醒；安装、测试和当前 pack 实际通过，未盲目批准全部脚本或升级依赖。本轮使用 no-audit，不能将其记录为漏洞审计通过。阶段一审计端点超时记录继续保留。

## FFmpeg 实际许可检查

实测 ffmpeg.exe 与 ffprobe.exe 的 `-L` 均为 **GPL version 3 or later**；版本为 **9.0.2-essentials_build-www.gyan.dev**，供应方标注 revision `946fcce07b`。

- buildconf 含 enable-gpl、enable-version3、enable-static；含 x264/x265/xvid、Rubber Band、vid.stab 等相关组件。未发现 enable-nonfree，但这不是合规充分条件。
- LICENSE、NOTICES、vendor README、engine-manifest、buildconf 均存在；本地 LICENSE 与仓库 GPL 文本哈希一致，已装应用中也保留这些材料。
- 对照版本化 [FFmpeg LICENSE.md](https://raw.githubusercontent.com/FFmpeg/FFmpeg/946fcce07b/LICENSE.md) 和 [官方许可说明](https://ffmpeg.org/legal.html)；源码链接只有 FFmpeg 本身的 revision，未提供完整静态依赖及构建材料。
- 版本化 LICENSE.md 明确有 IJG 文档归属要求；当前 FFmpeg 通知中未找到明确 IJG 归属，各静态库精确版本通知也未核验齐全。即使其他组件的通知提到 JPEG，也不能据此认为 FFmpeg 的要求已履行。
- GNU 在线全文读取超时，curl 上游 COPYING.GPLv3 下载被重置；本轮按已有本地 GPL 文本核对源码定义、汇集作品和目标代码交付条款，未声称在线全文哈希核验成功。

具体包内/发布页材料清单、哈希及需要补齐的内容见 [发布许可复核](release_readiness.md)。该文件区分了源码提供、组件通知、项目自有代码许可策略和代码签名。

## 未通过

| 项目 | 结果 |
| --- | --- |
| 包含 FFmpeg 的安装包公开分发审查 | **未通过**：缺完整 Corresponding Source 及适用、可验证的提供方式 |
| FFmpeg 及静态依赖完整通知审查 | **未通过**：当前材料未齐，明确 IJG 归属项尚待补齐；未完成逐个库的准确许可核对 |
| “项目已开源”声明条件 | 尚未选择/声明项目许可证，不能宣称已开源授权；不自动阻止源码提交准备 |
| 安装包签名 | 实测 NotSigned；这是发布者身份/系统信任方面的缺口，**不是 GPL 源码问题的替代条件** |

目前没有未修复的本轮构建或回归测试失败。许可未通过不能掩盖为“功能测试已通过所以可以发布”。

## 未测试／未完成的验证

- 真实远程 GitHub clone、空 npm/Electron 缓存的全网络下载、独立干净 Windows、Windows 10。
- 0.3.0 安装版结果完整人工视听播放、交互式安装向导逐页验收；此前用户反馈仅覆盖阶段二 MP4/MKV/WEBM 正常播放。
- 真实磁盘耗尽、断电/强杀恢复、多显示器及其他 DPI、更多特殊编码素材。
- 当前依赖完整漏洞审计、渗透测试、杀毒/SmartScreen 体验、签名验证链。
- 新增总结是否达到招聘方未提供的其他评分项；本轮只核对用户明确转述的要求。

## 分发前必须解决的问题

1. **取得和核验精确对应源码**：覆盖实际二进制、相关静态依赖、补丁及构建/安装脚本；选择适用的源码交付方式，并验证使用者可获取。只有上游 commit 链接不够。
2. **补齐归属与许可通知**：逐项核对 FFmpeg 和实际库版本的 LICENSE/COPYING/NOTICE，处理 IJG 要求，不以 npm/Electron 通知代替视频引擎依赖通知。
3. **由开发者明确自身发布策略**：公开可见性、是否授予复用许可以及项目许可证由权利人决定；不把 FFmpeg GPL 文本放到根目录充当 VideoFlow 的许可决定。
4. **形成实际发布材料再验收**：源码入口、组件清单、校验值、许可说明与安装包一致；材料或引擎变更后重新打包复核。正式产品发布验收还应补做干净机器、完整人工播放和交互安装，决定签名策略；不能声称当前未测项已覆盖。

前两项是当前明确的二进制公开分发阻塞。第 3 项不代表必须选择某种开源许可证，也不意味未签名应用绝对不能分发。

## GitHub 仓库结构与最终提交清单

保留当前适度拆分的目录，无需重构：

```text
README.md / requirements.md       用户说明、唯一需求依据
package.json / package-lock.json  脚本、依赖精确锁定
.gitignore / .npmrc               提交边界与 npm 项目设置
index.html / vite.config.js       渲染入口与构建配置
electron/                        主进程、Preload、媒体 CLI/任务服务
src/                             Vue 组件、页面、状态和样式
build/                           icon.ico、icon.png
scripts/                         启动、图标、发布资源检查、打包及原生测试辅助
tests/                           真实媒体、桌面和安装验收测试
playwright*.config.js             两套测试配置
electron-builder.yml             Windows x64 NSIS
tools/ffmpeg/README.md            固定版本引擎准备说明（无二进制）
third-party/                     当前许可文本、原始通知、构建配置与哈希
screenshots/installed-*.png       两张实际安装版截图
前端UI图/                        用户提供的原始视觉参考
docs/requirements.md             指向唯一根需求的入口
docs/ai_development_log.md        过程日志与原始反馈
docs/ai_development_summary.md    会话结束总结
docs/test_report.md               自动/人工/未测结果
docs/release_readiness.md         公开分发材料与阻塞
docs/final_delivery_check.md      本审查与提交清单
```

- [x] 源码/配置/锁文件/图标/测试脚本完整，所列第三方通知保留原文。
- [x] README、开发日志、总结、测试报告、发布检查和本审查齐备。
- [x] 两张截图足以展示主要转换功能及小窗口结果操作；不含私人素材。它们不展示全部状态/页面，运行中、失败、取消、记录/设置页补图属于展示改善项，不用假任务补齐。
- [x] node_modules、dist、release、.cache、test-results、playwright-report、test_output、下载 ZIP/EXE、普通自动截图不提交。
- [x] 不提交本机证据 JSON、开发缓存、私密环境配置、证书/私钥或用户视频。
- [ ] 开发者最后查看暂存清单并进行首次提交；本轮没有执行这一步。
- [ ] 远程仓库/推送按后续授权进行，当前未执行；不要顺带上传安装包或启用公开 Release。

以下仅为准备好的本地提交检查命令，**没有在当前仓库执行**：

```powershell
git add -- .gitignore .npmrc README.md requirements.md package.json package-lock.json index.html vite.config.js electron-builder.yml playwright.config.js playwright.installed.config.js electron src build scripts tests docs third-party tools/ffmpeg/README.md screenshots/installed-main.png screenshots/installed-920.png '前端UI图'
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
```

检查无误后由开发者进行首次 commit。不要用 `git add -f` 绕过构建产物或用户素材的忽略规则。安装包当前不是 Git 提交物，公开 Release 附件需另过上面的分发审查。

## 保留的安装包

路径：本机项目 `release/0.3.0/VideoFlow-Setup-0.3.0-x64.exe`，169,428,428 字节（161.58 MiB）。

SHA256：`2789C7B867AF28D47FA5E6D948582CD38679A2C85D5C1AF4B166BC76EC89AB48`。审查前后相同。0.1.0 包、0.3.0 初始候选备份、原测试资料亦未删除。本轮文档更新没有进入既有安装包，不把文档补充描述成重新发布或补齐了二进制分发材料。
