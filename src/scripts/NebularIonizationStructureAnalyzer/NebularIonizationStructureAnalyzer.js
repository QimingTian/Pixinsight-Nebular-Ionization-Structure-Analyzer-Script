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
      NISAIO.saveImage(ratioSIIHa, params.outputDir + "/ratio_SII_Ha.fits");
      NISAIO.saveImage(ratioOIIIHa, params.outputDir + "/ratio_OIII_Ha.fits");
      NISAIO.saveImage(ratioOIIISII, params.outputDir + "/ratio_OIII_SII.fits");

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

