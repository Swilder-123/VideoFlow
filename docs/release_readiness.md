# 公开发布检查

当前生成的是本地安装验收候选版。技术安装测试与公开分发许可准备分别记录，不将“能够打包”写成“已具备所有公开发布条件”。

## FFmpeg 分发材料

当前 Gyan 9.0.2 静态构建自述为 GPLv3，运行配置含 `--enable-gpl --enable-version3`，包含 libx264 等库。包中保留完整 GPL 文本、供应方 README（含库清单/配置）、运行时 buildconf、二进制校验值、Electron 和 npm 许可证。

核对依据：[FFmpeg 法律说明](https://ffmpeg.org/legal.html)、[构建提供方](https://www.gyan.dev/ffmpeg/builds/)、[GPLv3 第 6 节](https://www.gnu.org/licenses/gpl-3.0.html#section6)。仓库内随附的 `third-party/FFmpeg-GPL-3.0.txt` 可离线查阅。

**尚未取得对应这两个二进制的完整 Corresponding Source 材料集合及可履行的分发方式。**供应方 README 中的 FFmpeg 源码 revision 链接不能替代所有静态链接库及构建脚本的对应源码。不能仅凭附带 LICENSE 声称已满足全部公开再分发要求，也不代表供应方已替 VideoFlow 作出源码承诺。

公开发布前需完成：取得精确构建的源码/依赖/脚本并提供合规访问，或改用能提供完整材料的可复现构建；复核各组件通知；明确 VideoFlow 自有代码的发布许可证。没有擅自为项目选择开源许可证，也没有创建任何远程仓库。

## 签名与交付

尚无代码签名证书，本次生成未签名安装包。未声称能消除 Windows SmartScreen 提示。证书和私钥不应进入源码仓库。

正式公开发布还应使用独立干净 Windows 机器检查安装/卸载、杀毒误报及更多素材；本机安装验收结果见 `test_report.md`。

## 0.3.0 最终许可复核（2026-10-10）

本轮重新执行两个本地二进制的 `-L`、核对 `-buildconf`、供应方 README、许可证原文和版本/哈希清单。两者 `-L` 均声明 **GNU GPL version 3 or later**，即 GPL-3.0-or-later；供应方 README 的简写为 GPL v3。FFmpeg 版权声明为 FFmpeg developers，供应方为 Gyan Doshi，不替换为 VideoFlow 版权所有。

| 文件 | SHA256 |
| --- | --- |
| ffmpeg.exe | `3256173f3f8bffd7df12227c68adf68025edb1832273a9530688a7bb1ed8edec` |
| ffprobe.exe | `f0d36ecbbdd3bcfac3efa078c96c7271c2e68b3810595552ac3b7f17e9a65c52` |
| 下载 ZIP | `60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba` |

`--enable-gpl`、`--enable-version3`、`--enable-static` 均实际启用；未发现 `--enable-nonfree`、`--enable-libfdk-aac` 或 `--enable-openssl`，不能据此推导全部分发条件已经满足。启用组件中包括 libx264、libx265、libxvid、librubberband、libvidstab、avisynth，以及 GMP、VMAF、OpenCORE、VisualOn 等。

对应 FFmpeg revision 的 [LICENSE.md](https://raw.githubusercontent.com/FFmpeg/FFmpeg/946fcce07b/LICENSE.md) 说明：若启用其所列 GPL 部件/库，需要相应 GPL 配置；GMP 与若干 Apache-2.0 组件涉及 version3 兼容条件。该文件还明确提出 IJG 相关文档归属要求。这里是对 FFmpeg 自身说明的核对，**没有完成每个依赖准确版本、补丁及版权通知的逐项许可审计**。不能用 FFmpeg 总体 GPL 标签覆盖依赖保留通知等义务。

本机 `tools/ffmpeg/LICENSE` 与仓库 `third-party/FFmpeg-GPL-3.0.txt` 哈希相同，值为 `8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903`。本轮 GNU 网站读取超时、curl 拉取上游 COPYING.GPLv3 连接被重置；没有声称在线字节比对成功。实际查阅了本地完整 GPL 文本的第 1、5、6 节，及可访问的 FFmpeg 版本化 LICENSE.md。

### 源码交付条件与产品边界

按本地 GPLv3 第 1、6 节核对：对应源码不只是一个 FFmpeg tag，还涉及生成相应目标代码所需的源码、相关非系统依赖、补丁与构建/安装控制脚本；通用工具、系统库等存在条款规定的排除范围，应逐项判断。

对于拟在发布页提供 EXE 下载的方式，可按第 6(d) 节准备同一下载入口附近清晰可见、无需额外付费的完整对应源码访问安排，并确保材料持续可取得。若采用不同交付方式，需按相应条款重新核对。只有上游主页、Git commit 链接或一句“可以邮件索取源码”不足以证明当前下载分发已满足要求；本项目没有作出未经准备的书面承诺。

VideoFlow 通过独立进程调用 CLI，没有把 FFmpeg 库链接进 Electron。GPLv3 第 5 节区分独立作品的汇集与合成作品；是否适用仍需结合实际组合判断。**不能据此宣布 VideoFlow 自动成为 GPL，也不能宣布一定不受任何相关条件影响。**本次未增加根目录 LICENSE 或改变 package.json 的项目许可字段。

### 安装包与发布页材料清单

| 材料 | 现有状态 | 分发前动作 |
| --- | --- | --- |
| 原始 GPL 文本、FFmpeg 版权和供应方通知 | 已随包保留 GPL、vendor README、NOTICES；版权也可从二进制版本输出读取 | 维持原始通知与免责声明，发布页明确 FFmpeg/FFprobe 的许可及归属 |
| 精确引擎版本、哈希、buildconf | 已保存在 resources/licenses | 与待发布 EXE 内实际引擎再次比对，更新发布页校验信息 |
| FFmpeg 对应源码、依赖源码、补丁、构建/安装脚本 | **缺失，阻塞** | 向准确构建来源取得并验证材料，或改用材料完整的可复现构建，再建立适用的源码交付方式 |
| 全部静态依赖许可证、版权/NOTICE | **未逐项齐备，阻塞**；npm 通知不能替代 FFmpeg 依赖通知 | 以供应方组件版本清单为起点核对每个实际链接组件，收集必须保留的通知 |
| FFmpeg 的 IJG 归属要求 | **当前 FFmpeg 通知未找到明确 IJG 归属，阻塞** | 按版本化 LICENSE.md 及相关源文件核对并补全归属、修改说明等；不要把 Chromium 的 JPEG 通知当作已覆盖 FFmpeg 的证明 |
| Electron / Chromium / 生产 npm 通知 | 已随包保留 | 每次升级或重打包后重新核对 |
| VideoFlow 自有代码许可策略 | 开发者尚未决定 | 由权利人决定是否以及如何授权；第三方许可文件不能代替该决定 |
| 分发页面和材料可用性 | 没有公开发布页/源码材料入口 | 实际验证下载与源码入口；合规材料改变后更新包并重新校验，不把旧候选直接公开 |

缺失或无法确认的项维持阻塞，不以“代码能运行”或“未启用 nonfree”解除。代码签名与这些许可问题分开：未签名影响发布者身份与系统提示，但签名不能补足 GPL 材料，缺少签名也不是 GPL 条款本身的违规判据。

源码仓库只提交自有源码、文档、图标、截图和现有第三方通知，排除 FFmpeg 二进制与安装包；因此其提交准备结论与包含这些二进制的安装包分发结论不同，见 [最终交付审查](final_delivery_check.md)。
