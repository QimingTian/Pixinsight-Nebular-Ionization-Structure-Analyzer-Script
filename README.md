# Nebular Ionization Structure Analyzer

本仓库旨在构建 **Nebular Ionization Structure Analyzer (NISA)**——一套面向窄带天文影像（Hα、OIII、SII）的 PixInsight PJSR 脚本库，可自动输出电离结构、激波结构、比值图与分区图等科学级别产物。目标是提供模块化、可复用、可交互的 PixInsight 工作流，帮助科研人员快速完成窄带数据的定量评估。

## 项目目标
- 对经过校准/配准的窄带主图像自动收集统计量（信噪比、背景、剔除指标等）。
- 生成诊断图表（直方图、噪声评估、分辨率估计）。
- 支持不同滤光片、拍摄批次或处理版本之间的对比分析。
- 提供可复用的脚本预设，便于科研人员共享工作流。

## 目录规划
```
README.md
scripts/
  cli/
    # 面向命令行的 PixInsight JavaScript (PJSR) 脚本
  gui/
    # 通过对话框交互的 PJSR 脚本
resources/
  samples/
    # 示例影像或 FITS 头信息，用于测试
  docs/
    # 额外参考资料、公式、方法说明
tests/
  # 基于 PixInsight JavaScript 引擎的自动化测试框架
```

## 首要脚本 (NISA 主程序)
`src/scripts/NebularIonizationStructureAnalyzer/NebularIonizationStructureAnalyzer.js` 将提供：
1. **模块化代码**：包括 I/O、预处理、比值计算、像素分区、多尺度边界检测、报告生成等独立子模块（位于同目录 `lib/` 中）。
2. **对话框 UI**：允许用户选择 Hα/OIII/SII 输入、阈值、S/N 限制与输出目录。
3. **主执行流程**：串联数据载入 → 预处理 → 比值图 → 分区图 → 多尺度电离前沿 → 报告/PNG 输出。
4. **多类输出**：`output/` 目录下生成 FITS (比值图、分区图、前沿图)、PNG 覆盖图、CSV 数据报告。
5. **前提条件**：脚本假设输入通道已经完成基础校准与 DBE/背景梯度处理，不再重复背景扣除。

## PixInsight 仓库布局
PixInsight 仅识别特定的 repository 结构，本仓库已整理为：
```
src/
  scripts/
    NebularIonizationStructureAnalyzer/
      NebularIonizationStructureAnalyzer.js
      NebularIonizationStructureAnalyzer.xjs
      manifest.xmld
      Icon.png
      lib/
        io.js
        preprocessing.js
        ratio.js
        segmentation.js
        multiscale.js
        report.js
repository/
  repository.json
```
`repository/repository.json` 已按照 PixInsight 官方示例声明脚本名称、基目录与入口文件（默认仓库 URL 使用 `https://raw.githubusercontent.com/QimingTian/Pixinsight-Nebular-Ionization-Structure-Analyzer-Script/main`）。

## 路线图
1. 定义通道输入与输出契约（`lib/io.js` 已提供基础实现）。
2. 完成预处理与比值模块，实现噪声掩膜、可选归一化（假设用户已完成 DBE）。
3. 实现像素分类与分区统计（可配置阈值）。
4. 完成多尺度分析，输出电离前沿 FITS。
5. 构建 YAML/JSON 配置或 UI 设置持久化机制。
6. 添加自动化测试与示例数据。

## 后续步骤
1. 确认所支持的 PixInsight 版本与所需模块（PJSR、ImageCalibration、MultiscaleLinearTransform 等）。
2. 在 `scripts/gui` 下实现 NISA 主脚本，并通过 `#include` 加载 `scripts/lib` 中的模块。
3. 设计测试方案（可使用 PixInsight 命令行 `pjsr` 运行单元测试）。
4. 在脚本原型完成后进一步完善中文/英文文档与示例。

后续可根据科研需求的变化对上述计划进行调整。
