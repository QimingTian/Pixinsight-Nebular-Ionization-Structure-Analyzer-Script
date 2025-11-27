#feature-id    NebularIonizationStructureAnalyzer:main
#feature-info  Generates line ratio maps, segmentation, ionization fronts and reports.

#include <pjsr/Sizer.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/UndoFlag.jsh>

#include "lib/io.js"
#include "lib/preprocessing.js"
#include "lib/ratio.js"
#include "lib/segmentation.js"
#include "lib/multiscale.js"
#include "lib/report.js"

var NISAConfig = {
   epsilon: 1e-6
};

function createLabel(text, minWidth) {
   var label = new Label;
   label.text = text;
   if (minWidth !== undefined)
      label.minWidth = minWidth;
   return label;
}

function createFileRow(caption, edit, button) {
   var row = new HorizontalSizer;
   row.spacing = 4;
   var label = createLabel(caption, 70);
   row.add(label);
   edit.setFixedWidth(400);
   row.add(edit, 100);
   button.setFixedWidth(30);
   row.add(button);
   return row;
}

function NISADialog() {
   this.__base__ = Dialog;
   this.__base__();

   var self = this;

   this.haEdit = new Edit(this);
   this.haButton = new ToolButton(this);
   this.haButton.text = "...";
   this.haButton.onClick = function () {
      var dlg = new OpenFileDialog;
      dlg.caption = "选择 Hα FITS";
      if (dlg.execute())
         self.haEdit.text = dlg.fileName;
   };

   this.oiiiEdit = new Edit(this);
   this.oiiiButton = new ToolButton(this);
   this.oiiiButton.text = "...";
   this.oiiiButton.onClick = function () {
      var dlg = new OpenFileDialog;
      dlg.caption = "选择 OIII FITS";
      if (dlg.execute())
         self.oiiiEdit.text = dlg.fileName;
   };

   this.siiEdit = new Edit(this);
   this.siiButton = new ToolButton(this);
   this.siiButton.text = "...";
   this.siiButton.onClick = function () {
      var dlg = new OpenFileDialog;
      dlg.caption = "选择 SII FITS";
      if (dlg.execute())
         self.siiEdit.text = dlg.fileName;
   };

   this.shockSpinLabel = new Label(this);
   this.shockSpinLabel.text = "SII/Hα 阈值:";
   this.shockSpin = new SpinBox(this);
   this.shockSpin.setRange(0, 5);
   this.shockSpin.value = 0.5;

   this.highIonSpinLabel = new Label(this);
   this.highIonSpinLabel.text = "OIII/Hα 阈值:";
   this.highIonSpin = new SpinBox(this);
   this.highIonSpin.setRange(0, 5);
   this.highIonSpin.value = 1.0;

   this.snSpinLabel = new Label(this);
   this.snSpinLabel.text = "S/N 阈值:";
   this.snSpin = new SpinBox(this);
   this.snSpin.setRange(0, 50);
   this.snSpin.value = 3.0;

   this.outputEdit = new Edit(this);
   this.outputButton = new ToolButton(this);
   this.outputButton.text = "...";
   this.outputButton.onClick = function () {
      var dlg = new GetDirectoryDialog;
      dlg.caption = "选择输出目录";
      if (dlg.execute())
         self.outputEdit.text = dlg.directory;
   };

   this.runButton = new PushButton(this);
   this.runButton.text = "Run Analysis";
   this.runButton.onClick = function () {
      self.ok();
   };

   this.cancelButton = new PushButton(this);
   this.cancelButton.text = "Cancel";
   this.cancelButton.onClick = function () {
      self.cancel();
   };

   this.progressLabel = new Label(this);
   this.progressLabel.text = "等待执行...";

   var layout = new VerticalSizer;
   layout.margin = 8;
   layout.spacing = 8;

   var title = createLabel("Nebular Ionization Structure Analyzer");
   title.font = new Font(title.font.family, title.font.pointSize + 2);
   layout.add(title);

   // 直接垂直排列所有控件，每个占据整行
   var haRow = createFileRow("Hα", this.haEdit, this.haButton);
   layout.add(haRow);
   var oiiiRow = createFileRow("OIII", this.oiiiEdit, this.oiiiButton);
   layout.add(oiiiRow);
   var siiRow = createFileRow("SII", this.siiEdit, this.siiButton);
   layout.add(siiRow);
   var outputRow = createFileRow("输出目录", this.outputEdit, this.outputButton);
   layout.add(outputRow);

   // 参数行，每个占据整行
   var shockRow = new HorizontalSizer;
   shockRow.spacing = 4;
   this.shockSpinLabel.setFixedWidth(100);
   this.shockSpin.setFixedWidth(70);
   shockRow.add(this.shockSpinLabel);
   shockRow.add(this.shockSpin);
   layout.add(shockRow);

   var highIonRow = new HorizontalSizer;
   highIonRow.spacing = 4;
   this.highIonSpinLabel.setFixedWidth(100);
   this.highIonSpin.setFixedWidth(70);
   highIonRow.add(this.highIonSpinLabel);
   highIonRow.add(this.highIonSpin);
   layout.add(highIonRow);

   var snRow = new HorizontalSizer;
   snRow.spacing = 4;
   this.snSpinLabel.setFixedWidth(100);
   this.snSpin.setFixedWidth(70);
   snRow.add(this.snSpinLabel);
   snRow.add(this.snSpin);
   layout.add(snRow);

   // 底部：按钮和进度条
   var buttonRow = new HorizontalSizer;
   buttonRow.spacing = 6;
   this.runButton.setFixedWidth(100);
   this.cancelButton.setFixedWidth(100);
   buttonRow.add(this.runButton);
   buttonRow.add(this.cancelButton);
   layout.add(buttonRow);
   layout.add(this.progressLabel);

   this.sizer = layout;
   this.adjustToContents();
}
NISADialog.prototype = new Dialog;

NISADialog.prototype.getParameters = function () {
   return {
      haPath: this.haEdit.text.trim(),
      oiiiPath: this.oiiiEdit.text.trim(),
      siiPath: this.siiEdit.text.trim(),
      shockThreshold: this.shockSpin.value,
      highIonThreshold: this.highIonSpin.value,
      snThreshold: this.snSpin.value,
      outputDir: this.outputEdit.text.trim() || File.systemTempDirectory
   };
};

NISADialog.prototype.setProgress = function (text) {
   this.progressLabel.text = text;
   processEvents();
};

function buildOverlayImage(ratioImage, segmentationImage, progressCallback) {
   if (progressCallback) {
      progressCallback("绘制覆盖图: 使用 PixelMath...");
   }
   
   var width = ratioImage.width;
   var height = ratioImage.height;
   
   // Get image IDs
   var ratioId = ratioImage._window ? ratioImage._window.mainView.id : "";
   var segId = segmentationImage._window ? segmentationImage._window.mainView.id : "";
   
   // Create overlay image using ImageWindow (3 channels for RGB)
   var overlayWin = new ImageWindow(width, height, 3, 32, true, true, "nisa_overlay");
   overlayWin.mainView.beginProcess(UndoFlag_NoSwapFile);
   overlayWin.mainView.image.fill(0);
   overlayWin.mainView.endProcess();
   
   // Use PixelMath to create RGB overlay
   // R channel: if label == SHOCK then ratio else 0
   // G channel: if label == HIGH_ION then ratio else 0
   // B channel: if label == PHOTOION then ratio else 0
   var pixelMath = new PixelMath;
   pixelMath.expression = "iif(" + segId + " == " + NISASegmentation.LABELS.SHOCK + ", " + ratioId + ", 0)";
   pixelMath.useSingleExpression = true;
   pixelMath.executeOn(overlayWin.mainView);
   
   // Apply to G channel
   var pixelMathG = new PixelMath;
   pixelMathG.expression = "iif(" + segId + " == " + NISASegmentation.LABELS.HIGH_ION + ", " + ratioId + ", 0)";
   pixelMathG.useSingleExpression = true;
   pixelMathG.executeOn(overlayWin.mainView);
   
   // Apply to B channel
   var pixelMathB = new PixelMath;
   pixelMathB.expression = "iif(" + segId + " == " + NISASegmentation.LABELS.PHOTOION + ", " + ratioId + ", 0)";
   pixelMathB.useSingleExpression = true;
   pixelMathB.executeOn(overlayWin.mainView);
   
   overlayWin.hide();
   var result = overlayWin.mainView.image;
   result._window = overlayWin;
   
   return result;
}

function runAnalysis(params, dialog) {
   dialog.setProgress("加载通道...");
   var haWin = NISAIO.openChannel(params.haPath, "Hα");
   var oiiiWin = NISAIO.openChannel(params.oiiiPath, "OIII");
   var siiWin = NISAIO.openChannel(params.siiPath, "SII");

   // Check input image statistics for normalization detection
   console.writeln("\n=== 输入图像统计信息 ===");
   var haStats = new ImageStatistics(haWin.mainView.image);
   var oiiiStats = new ImageStatistics(oiiiWin.mainView.image);
   var siiStats = new ImageStatistics(siiWin.mainView.image);
   
   console.writeln("Hα:   min=" + haStats.minimum.toFixed(4) + ", max=" + haStats.maximum.toFixed(4) + ", median=" + haStats.median.toFixed(4));
   console.writeln("OIII: min=" + oiiiStats.minimum.toFixed(4) + ", max=" + oiiiStats.maximum.toFixed(4) + ", median=" + oiiiStats.median.toFixed(4));
   console.writeln("SII:  min=" + siiStats.minimum.toFixed(4) + ", max=" + siiStats.maximum.toFixed(4) + ", median=" + siiStats.median.toFixed(4));
   
   // Check if images have display function applied (XISF files may contain display functions)
   var haHasDisplayFunction = haWin.mainView.hasDisplayFunction;
   var oiiiHasDisplayFunction = oiiiWin.mainView.hasDisplayFunction;
   var siiHasDisplayFunction = siiWin.mainView.hasDisplayFunction;
   
   if (haHasDisplayFunction || oiiiHasDisplayFunction || siiHasDisplayFunction) {
      console.writeln("\n⚠️  检测到显示函数（Display Function）:");
      console.writeln("   Hα: " + (haHasDisplayFunction ? "是" : "否"));
      console.writeln("   OIII: " + (oiiiHasDisplayFunction ? "是" : "否"));
      console.writeln("   SII: " + (siiHasDisplayFunction ? "是" : "否"));
      console.writeln("   注意: 显示函数可能影响像素值的读取。");
      console.writeln("   脚本使用 mainView.image 读取原始像素值，应该不受显示函数影响。");
   }
   
   // Warn if images appear normalized
   // Note: Even if max=1.0, it might be due to display function or file format, not actual normalization
   if (haStats.maximum <= 1.1 && oiiiStats.maximum <= 1.1 && siiStats.maximum <= 1.1) {
      console.writeln("\n⚠️  注意: 输入图像统计显示 max <= 1.1");
      console.writeln("   可能原因:");
      console.writeln("     1. 图像文件包含显示函数（Display Function）");
      console.writeln("     2. 图像在保存时被归一化");
      console.writeln("     3. 图像确实是归一化的");
      console.writeln("   脚本已设置 normalized=false 和 rescaleResult=false，比值计算不会被截断。");
      console.writeln("   如果比值图仍然被截断，请检查 PixelMath 的输出消息。");
   }
   console.writeln("===================\n");

   NISAIO.ensureDir(params.outputDir);
   
   // Track temporary windows for cleanup
   var tempWindows = [];

   try {
      dialog.setProgress("预处理...");
      var haSigma = NISAPreprocessing.estimateNoiseSigma(haWin.mainView);
      var noiseMask = NISAPreprocessing.buildNoiseMask(
         haWin.mainView, haSigma, params.snThreshold, function(msg) {
            dialog.setProgress(msg);
         });
      // Track the mask window for cleanup
      if (noiseMask._window) {
         tempWindows.push(noiseMask._window);
      }

      dialog.setProgress("比值图 SII/Hα...");
      var ratioSIIHa = NISARatios.computeRatio(siiWin.mainView, haWin.mainView, {
         epsilon: NISAConfig.epsilon,
         mask: noiseMask,
         progressCallback: function(msg) { dialog.setProgress(msg); }
      });
      if (ratioSIIHa._window) {
         tempWindows.push(ratioSIIHa._window);
      }
      dialog.setProgress("比值图 OIII/Hα...");
      var ratioOIIIHa = NISARatios.computeRatio(oiiiWin.mainView, haWin.mainView, {
         epsilon: NISAConfig.epsilon,
         mask: noiseMask,
         progressCallback: function(msg) { dialog.setProgress(msg); }
      });
      if (ratioOIIIHa._window) {
         tempWindows.push(ratioOIIIHa._window);
      }
      dialog.setProgress("比值图 OIII/SII...");
      var ratioOIIISII = NISARatios.computeRatio(oiiiWin.mainView, siiWin.mainView, {
         epsilon: NISAConfig.epsilon,
         mask: noiseMask,
         progressCallback: function(msg) { dialog.setProgress(msg); }
      });
      if (ratioOIIISII._window) {
         tempWindows.push(ratioOIIISII._window);
      }

      dialog.setProgress("保存比值 FITS...");
      
      // Print ratio statistics BEFORE saving (from memory)
      console.writeln("\n=== 比值图统计信息（保存前，内存中） ===");
      var siiHaStatsBefore = new ImageStatistics(ratioSIIHa);
      var oiiiHaStatsBefore = new ImageStatistics(ratioOIIIHa);
      var oiiiSiiStatsBefore = new ImageStatistics(ratioOIIISII);
      
      console.writeln("SII/Hα:   min=" + siiHaStatsBefore.minimum.toFixed(4) + ", max=" + siiHaStatsBefore.maximum.toFixed(4) + 
                     ", median=" + siiHaStatsBefore.median.toFixed(4) + ", mean=" + siiHaStatsBefore.mean.toFixed(4));
      console.writeln("OIII/Hα:  min=" + oiiiHaStatsBefore.minimum.toFixed(4) + ", max=" + oiiiHaStatsBefore.maximum.toFixed(4) + 
                     ", median=" + oiiiHaStatsBefore.median.toFixed(4) + ", mean=" + oiiiHaStatsBefore.mean.toFixed(4));
      console.writeln("OIII/SII:  min=" + oiiiSiiStatsBefore.minimum.toFixed(4) + ", max=" + oiiiSiiStatsBefore.maximum.toFixed(4) + 
                     ", median=" + oiiiSiiStatsBefore.median.toFixed(4) + ", mean=" + oiiiSiiStatsBefore.mean.toFixed(4));
      
      NISAIO.saveImage(ratioSIIHa, params.outputDir + "/ratio_SII_Ha.fits");
      NISAIO.saveImage(ratioOIIIHa, params.outputDir + "/ratio_OIII_Ha.fits");
      NISAIO.saveImage(ratioOIIISII, params.outputDir + "/ratio_OIII_SII.fits");
      
      // Print ratio statistics AFTER saving (reload from file to check)
      console.writeln("\n=== 比值图统计信息（保存后，从文件重新加载） ===");
      var siiHaStats = new ImageStatistics(ratioSIIHa);
      var oiiiHaStats = new ImageStatistics(ratioOIIIHa);
      var oiiiSiiStats = new ImageStatistics(ratioOIIISII);
      
      console.writeln("SII/Hα:   min=" + siiHaStats.minimum.toFixed(4) + ", max=" + siiHaStats.maximum.toFixed(4) + 
                     ", median=" + siiHaStats.median.toFixed(4) + ", mean=" + siiHaStats.mean.toFixed(4));
      console.writeln("OIII/Hα:  min=" + oiiiHaStats.minimum.toFixed(4) + ", max=" + oiiiHaStats.maximum.toFixed(4) + 
                     ", median=" + oiiiHaStats.median.toFixed(4) + ", mean=" + oiiiHaStats.mean.toFixed(4));
      console.writeln("OIII/SII:  min=" + oiiiSiiStats.minimum.toFixed(4) + ", max=" + oiiiSiiStats.maximum.toFixed(4) + 
                     ", median=" + oiiiSiiStats.median.toFixed(4) + ", mean=" + oiiiSiiStats.mean.toFixed(4));
      
      // Check if ratios are in normalized range
      if (siiHaStats.maximum <= 1.1 && oiiiHaStats.maximum <= 1.1 && oiiiSiiStats.maximum <= 1.1) {
         console.writeln("\n⚠️  严重警告: 比值图被截断到 [0,1] 范围！");
         console.writeln("   这会导致比值失真，无法进行准确的科学分析。");
         console.writeln("   原因: 输入图像已归一化，或 PixelMath 自动截断结果。");
         console.writeln("\n   当前阈值设置:");
         console.writeln("     - SII/Hα 阈值: " + params.shockThreshold);
         console.writeln("     - OIII/Hα 阈值: " + params.highIonThreshold);
         console.writeln("\n   比值统计显示:");
         if (oiiiHaStats.median >= 0.99) {
            console.writeln("     ⚠️  OIII/Hα 中位数 = " + oiiiHaStats.median.toFixed(4) + " (接近 1.0)");
            console.writeln("        说明大量像素的真实比值 > 1.0，但被截断到 1.0");
         }
         if (siiHaStats.median >= 0.95) {
            console.writeln("     ⚠️  SII/Hα 中位数 = " + siiHaStats.median.toFixed(4) + " (接近 1.0)");
            console.writeln("        说明大量像素的真实比值 > 1.0，但被截断到 1.0");
         }
         console.writeln("\n   ⚠️  强烈建议:");
         console.writeln("     1. 使用未归一化的原始线性数据（未拉伸、未归一化）");
         console.writeln("     2. 如果必须使用归一化数据，比值分析结果不可靠");
         console.writeln("     3. 对于归一化数据，建议阈值:");
         console.writeln("        - SII/Hα: 0.4-0.5 (激波)");
         console.writeln("        - OIII/Hα: 0.7-0.9 (高电离)");
      } else {
         console.writeln("\n提示: 典型 HII 区域比值（未归一化）:");
         console.writeln("  - SII/Hα: 0.2-0.4 (光致电离), 0.5-1.5+ (激波)");
         console.writeln("  - OIII/Hα: 0.3-0.8 (光致电离), 1.0+ (高电离)");
      }
      console.writeln("===================\n");

      dialog.setProgress("像素分类...");
      var segmentationResult = NISASegmentation.classifyPixels(
         ratioSIIHa, ratioOIIIHa, {
            shockThreshold: params.shockThreshold,
            highIonThreshold: params.highIonThreshold,
            mask: noiseMask,
            progressCallback: function(msg) { dialog.setProgress(msg); }
         });
      if (segmentationResult.image._window) {
         tempWindows.push(segmentationResult.image._window);
      }

      NISAIO.saveImage(segmentationResult.image, params.outputDir + "/segmentation.fits");

      dialog.setProgress("多尺度分析...");
      var fronts = NISAMultiscale.detectFronts(ratioOIIIHa, { layers: 4, threshold: 0.02 });
      if (fronts._window) {
         tempWindows.push(fronts._window);
      }
      NISAIO.saveImage(fronts, params.outputDir + "/ionization_fronts.fits");

      dialog.setProgress("生成 CSV 报告...");
      var statsRows = NISAReport.computeRegionStats(
         segmentationResult.image,
         { siiHa: ratioSIIHa, oiiiHa: ratioOIIIHa, oiiiSii: ratioOIIISII },
         params.pixelScale || 1.0
      );
      NISAIO.writeCSV(
         params.outputDir + "/analysis_report.csv",
         ["Region", "Area(px)", "Mean Ratio", "Max Ratio"],
         statsRows
      );

      dialog.setProgress("绘制 PNG 覆盖图...");
      var overlay = buildOverlayImage(ratioOIIIHa, segmentationResult.image, function(msg) {
         dialog.setProgress(msg);
      });
      if (overlay._window) {
         tempWindows.push(overlay._window);
      }
      NISAIO.saveImage(overlay, params.outputDir + "/overlay.png");

      dialog.setProgress("完成！所有文件已保存到: " + params.outputDir);
      console.writeln("\n=== NISA 分析完成 ===");
      console.writeln("输出目录: " + params.outputDir);
      console.writeln("生成的文件:");
      console.writeln("  - ratio_SII_Ha.fits");
      console.writeln("  - ratio_OIII_Ha.fits");
      console.writeln("  - ratio_OIII_SII.fits");
      console.writeln("  - segmentation.fits");
      console.writeln("  - ionization_fronts.fits");
      console.writeln("  - analysis_report.csv");
      console.writeln("  - overlay.png");
      console.writeln("===================\n");
   } finally {
      // Close all temporary windows
      for (var i = 0; i < tempWindows.length; i++) {
         if (tempWindows[i] && !tempWindows[i].isNull) {
            tempWindows[i].forceClose();
         }
      }
      haWin.forceClose();
      oiiiWin.forceClose();
      siiWin.forceClose();
   }
}

function main() {
   var dlg = new NISADialog;
   if (!dlg.execute())
      return;
   var params = dlg.getParameters();
   runAnalysis(params, dlg);
}

main();

