/*
 * Nebular Ionization Structure Analyzer (NISA)
 * I/O helpers for PixInsight PJSR scripts.
 */

var NISAIO = (function () {
   function openChannel(path, channelName) {
      if (!File.exists(path))
         throw new Error(channelName + " 文件不存在: " + path);

      var windows = ImageWindow.open(path);
      if (windows.length === 0)
         throw new Error("无法打开 " + channelName + " FITS: " + path);

      return windows[0]; // Caller should manage window lifecycle.
   }

   function ensureDir(dirPath) {
      if (!File.directoryExists(dirPath))
         File.createDirectory(dirPath, true /* createIntermediate */);
   }

   function saveImage(image, outputPath) {
      var channels = image.numberOfChannels || image.channelCount || 1;
      var win = new ImageWindow(image.width, image.height, channels,
         32, true, channels > 1, "nisa_tmp");
      win.mainView.beginProcess(UndoFlag_NoSwapFile);
      win.mainView.image.assign(image);
      win.mainView.endProcess();
      var ok = win.saveAs(outputPath, false, false, true);
      win.forceClose();
      if (!ok)
         throw new Error("保存文件失败: " + outputPath);
   }

   function writeCSV(outputPath, headers, rows) {
      var file = new File;
      if (!file.createForWriting(outputPath))
         throw new Error("无法创建 CSV: " + outputPath);
      file.outText(headers.join(",") + "\n");
      for (var i = 0; i < rows.length; i++)
         file.outText(rows[i].join(",") + "\n");
      file.close();
   }

   return {
      openChannel: openChannel,
      ensureDir: ensureDir,
      saveImage: saveImage,
      writeCSV: writeCSV
   };
})();

