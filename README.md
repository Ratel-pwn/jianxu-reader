# 简续

本地优先的 Android / iOS 阅读伴侣。书库、设置、笔记、伴读和社区使用 React Native 原生界面；EPUB 内容在隔离阅读视图中重排，PDF 使用原生 PDF 组件保留原页。

## 开发

使用 Node 22.16+、JDK 17、Android SDK 36 / Build Tools 36.0.0 / NDK 27.1.12297006。项目固定 Expo 57 / React Native 0.86.3，以兼容 已安装的 SDK。iOS 本地编译需要 macOS 和相应 Xcode。

```sh
npm ci
npm run typecheck
npm run lint
npm test
npx expo prebuild --platform android --no-install
npm run android
```

这是 development build 项目，不能仅用 Expo Go 验证 PDF 原生模块。Windows 的独立编译入口为 `scripts/build-android.ps1`。未配置 EAS、商店签名或付费服务。

## 已实现

- 通过系统文件选择器导入 PDF / EPUB，复制原文件到 app document 目录；SHA-256 去重，失败时清理未完成导入。
- SQLite 本地书库、阅读位置、独立伴读边界、书签、笔记和外观设置。
- EPUB 阅读顺序、目录、正文语义、本地栅格图片、章节内连续滚动、正文链接、选中文字记笔记、字号/行距/背景；每次只加载一章。
- PDF 原页连续滚动、缩放、页码跳转、页级笔记和书签。
- 主动“我读到这里”；正常滚动或跳转不会自动改变伴读范围。人物/关系/术语/回顾尚无模型生成结果，界面如实显示未启用状态。
- 只保存 AI 服务名称、HTTPS 地址和模型名称；没有密钥字段、测试请求或模型调用。
- 真实的可本机运行社区服务与原生客户端：注册/登录、主题帖、回复、举报、屏蔽、退出、删除账户。无假用户或种子动态。默认未连接，书籍和私人位置不会自动上传。

## 社区开发

`npm run server:dev` 启动仅监听本机的 SQLite HTTP 服务。Android 模拟器开发地址为 `http://10.0.2.2:4318`；发布客户端只允许 HTTPS。用户主动输入地址和登录后才进行社区请求。

接口、数据生命周期、审核 CLI 和生产部署缺口见 [docs/community-api.md](docs/community-api.md)。社区测试使用临时数据库；不会在运行服务中创建假帖子。

## 当前边界

- EPUB 适配器保留内容语义与图片，但出于隔离策略移除书籍脚本、外部资源和自定义 CSS。DRM/加密资源、SVG/MathML、多媒体与固定版式 EPUB 尚不支持；尚未接入 Readium。位置采用文件指纹、章节 href、稳定正文块、文本上下文和比例回退，不仅是滚动像素。
- 伴读边界为当前正文块或 PDF 页。PDF 文本选择、高亮和全文搜索未实现；没有把页级笔记描述为文本高亮。
- EPUB 导入上限 50 MB，展开上限 150 MB，单资源 20 MB，最多 5000 个资源；PDF 上限 150 MB。复杂或超大章节的内存与设备性能仍需真机测试。
- 社区当前是本机验证服务，不是已公开运营的社区。公开服务的 TLS、备份、身份恢复、运营审核和条款仍需完成。
- 暂无跨设备同步、笔记导出或云备份。卸载应用会失去本机阅读数据。
- 默认模板图标尚需替换，商店文案、隐私清单、无障碍审计和最终品牌样式尚未完成。

## 验证与来源

当前验证记录见 [docs/verification.md](docs/verification.md)。不要将 JavaScript 导出或 Android prebuild 视为 APK、模拟器或 iOS 验证。


## 安全加固记录

当前完整检查通过 19 项核心测试及 7 项社区/存储测试。依赖审计从 23 项降为 20 项；剩余两类根因属于未修复的构建工具链依赖，不在本次 Android/iOS JavaScript 导出中。官方解码器修复源码及许可证保存在 vendor，只有 CommonJS 导出适配，带源码比对和恶意输入测试。详见 [安全审查](docs/security-review.md)。

EPUB 现在保留白名单内的行内样式、方向和语言属性，拒绝任意 CSS 与外部资源。单份标记内容限制为 4 MiB 字符，最大 60,000 个 DOM 节点、128 层嵌套；单张栅格图片读取上限 6 MiB。复杂版式、图片解码内存与真实设备表现仍需验收。

## 许可证

本项目第一方代码采用 **AGPL-3.0-only**（仅第 3 版）。完整条款见 [LICENSE](LICENSE)。第三方代码、模板和素材保留各自许可证与版权，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。公开源码不代表已完成应用商店分发或第三方原生二进制合规审查。
