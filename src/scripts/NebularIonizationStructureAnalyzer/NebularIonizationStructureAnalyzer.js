#feature-id    NebularIonizationStructureAnalyzer:main
#feature-info  Generates line ratio maps, segmentation, ionization fronts and reports.

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
   var row = new Sizer;
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

   var layout = new Sizer;
   layout.margin = 8;
   layout.spacing = 8;

   var title = createLabel("Nebular Ionization Structure Analyzer");
   title.font = new Font(title.font.family, title.font.pointSize + 2);
   layout.add(title);

   // 直接垂直排列所有控件，每个占据整行
   var haRow = createFileRow("Hα", this.haEdit, this.haButton);
   haRow.minWidth = 500;
   layout.add(haRow);
   var oiiiRow = createFileRow("OIII", this.oiiiEdit, this.oiiiButton);
   oiiiRow.minWidth = 500;
   layout.add(oiiiRow);
   var siiRow = createFileRow("SII", this.siiEdit, this.siiButton);
   siiRow.minWidth = 500;
   layout.add(siiRow);
   var outputRow = createFileRow("输出目录", this.outputEdit, this.outputButton);
   outputRow.minWidth = 500;
   layout.add(outputRow);

   // 参数行，每个占据整行
   var shockRow = new Sizer;
   shockRow.spacing = 4;
   shockRow.minWidth = 500;
   this.shockSpinLabel.setFixedWidth(100);
   this.shockSpin.setFixedWidth(70);
   shockRow.add(this.shockSpinLabel);
   shockRow.add(this.shockSpin);
   layout.add(shockRow);

   var highIonRow = new Sizer;
   highIonRow.spacing = 4;
   highIonRow.minWidth = 500;
   this.highIonSpinLabel.setFixedWidth(100);
   this.highIonSpin.setFixedWidth(70);
   highIonRow.add(this.highIonSpinLabel);
   highIonRow.add(this.highIonSpin);
   layout.add(highIonRow);

   var snRow = new Sizer;
   snRow.spacing = 4;
   snRow.minWidth = 500;
   this.snSpinLabel.setFixedWidth(100);
   this.snSpin.setFixedWidth(70);
   snRow.add(this.snSpinLabel);
   snRow.add(this.snSpin);
   layout.add(snRow);

   // 底部：按钮和进度条
   var buttonRow = new Sizer;
   buttonRow.spacing = 6;
   buttonRow.minWidth = 500;
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

function buildOverlayImage(ratioImage, segmentationImage) {
   var width = ratioImage.width;
   var height = ratioImage.height;
   var overlay = new Image(width, height, 3, FloatSample, 1);
   for (var y = 0; y < height; y++) {
     for (var x = 0; x < width; x++) {
        var label = segmentationImage.sample(x, y);
        var ratioVal = ratioImage.sample(x, y);
        var r = 0, g = 0, b = 0;
        if (label === NISASegmentation.LABELS.SHOCK)
           r = ratioVal;
        else if (label === NISASegmentation.LABELS.HIGH_ION)
           g = ratioVal;
        else if (label === NISASegmentation.LABELS.PHOTOION)
           b = ratioVal;
        overlay.setSample(r, x, y, 0);
        overlay.setSample(g, x, y, 1);
        overlay.setSample(b, x, y, 2);
     }
   }
   return overlay;
}

function runAnalysis(params, dialog) {
   dialog.setProgress("加载通道...");
   var haWin = NISAIO.openChannel(params.haPath, "Hα");
   var oiiiWin = NISAIO.openChannel(params.oiiiPath, "OIII");
   var siiWin = NISAIO.openChannel(params.siiPath, "SII");

   NISAIO.ensureDir(params.outputDir);

   try {
      dialog.setProgress("预处理...");
      var haSigma = NISAPreprocessing.estimateNoiseSigma(haWin.mainView);
      var noiseMask = NISAPreprocessing.buildNoiseMask(
         haWin.mainView, haSigma, params.snThreshold);

      dialog.setProgress("比值图...");
      var ratioSIIHa = NISARatios.computeRatio(siiWin.mainView, haWin.mainView, {
         epsilon: NISAConfig.epsilon,
         mask: noiseMask
      });
      var ratioOIIIHa = NISARatios.computeRatio(oiiiWin.mainView, haWin.mainView, {
         epsilon: NISAConfig.epsilon,
         mask: noiseMask
      });
      var ratioOIIISII = NISARatios.computeRatio(oiiiWin.mainView, siiWin.mainView, {
         epsilon: NISAConfig.epsilon,
         mask: noiseMask
      });

      dialog.setProgress("保存比值 FITS...");
      NISAIO.saveImage(ratioSIIHa, params.outputDir + "/ratio_SII_Ha.fits");
      NISAIO.saveImage(ratioOIIIHa, params.outputDir + "/ratio_OIII_Ha.fits");
      NISAIO.saveImage(ratioOIIISII, params.outputDir + "/ratio_OIII_SII.fits");

      dialog.setProgress("像素分类...");
      var segmentationResult = NISASegmentation.classifyPixels(
         ratioSIIHa, ratioOIIIHa, {
            shockThreshold: params.shockThreshold,
            highIonThreshold: params.highIonThreshold,
            mask: noiseMask
         });

      NISAIO.saveImage(segmentationResult.image, params.outputDir + "/segmentation.fits");

      dialog.setProgress("多尺度分析...");
      var fronts = NISAMultiscale.detectFronts(ratioOIIIHa, { layers: 4, threshold: 0.02 });
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
      var overlay = buildOverlayImage(ratioOIIIHa, segmentationResult.image);
      NISAIO.saveImage(overlay, params.outputDir + "/overlay.png");

      dialog.setProgress("完成");
   } finally {
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

