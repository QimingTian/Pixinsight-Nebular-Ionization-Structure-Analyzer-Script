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
      // Ensure directory exists
      var dirPath = File.extractPath(outputPath);
      if (dirPath.length > 0 && !File.directoryExists(dirPath)) {
         File.createDirectory(dirPath, true);
      }
      
      var file = new File;
      if (!file.createForWriting(outputPath)) {
         throw new Error("无法创建 CSV 文件: " + outputPath + " (可能没有写入权限)");
      }
      
      try {
         file.outText(headers.join(",") + "\n");
         for (var i = 0; i < rows.length; i++) {
            // Convert all values to strings and escape commas if needed
            var row = rows[i].map(function(val) {
               var str = String(val);
               if (str.indexOf(",") >= 0 || str.indexOf('"') >= 0 || str.indexOf("\n") >= 0) {
                  return '"' + str.replace(/"/g, '""') + '"';
               }
               return str;
            });
            file.outText(row.join(",") + "\n");
         }
      } finally {
         file.close();
      }
   }

   return {
      openChannel: openChannel,
      ensureDir: ensureDir,
      saveImage: saveImage,
      writeCSV: writeCSV
   };
})();

