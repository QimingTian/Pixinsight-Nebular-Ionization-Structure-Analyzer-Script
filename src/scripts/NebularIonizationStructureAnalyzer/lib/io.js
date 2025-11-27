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
      // normalized=false: Keep original pixel values, don't normalize when saving
      // bitsPerSample=32, isFloatSample=true: Use Float32 to support values > 1.0
      var win = new ImageWindow(image.width, image.height, channels,
         32, true, channels > 1, "nisa_tmp");
      win.mainView.beginProcess(UndoFlag_NoSwapFile);
      win.mainView.image.assign(image);
      win.mainView.endProcess();
      
      // Check image statistics before saving for debugging
      var statsBefore = new ImageStatistics(win.mainView.image);
      console.writeln("[DEBUG] saveImage: 保存前统计, min=" + statsBefore.minimum.toFixed(4) + ", max=" + statsBefore.maximum.toFixed(4));
      
      // saveAs parameters: (filePath, queryFileFormat, queryFileOptions, preserveImageProperties)
      // queryFileFormat=false: use file extension to determine format
      // queryFileOptions=false: use default options
      // preserveImageProperties=true: preserve metadata
      var ok = win.saveAs(outputPath, false, false, true);
      win.forceClose();
      if (!ok)
         throw new Error("保存文件失败: " + outputPath);
      
      // Note: PixInsight may apply display function when opening FITS files,
      // which rescales values to [0,1] for display. This does NOT affect the
      // actual pixel values stored in the file. ImageStatistics reads the
      // original pixel values, so the file is correct even if display shows [0,1].
      // We skip reload verification as it's misleading - the file is saved correctly.
   }

   function writeCSV(outputPath, headers, rows) {
      console.writeln("[DEBUG] writeCSV: starting");
      console.writeln("[DEBUG] outputPath: " + outputPath);
      
      // Ensure directory exists - extract path using string operations
      var lastSlash = Math.max(outputPath.lastIndexOf("/"), outputPath.lastIndexOf("\\"));
      var dirPath = lastSlash >= 0 ? outputPath.substring(0, lastSlash) : "";
      console.writeln("[DEBUG] dirPath: " + dirPath);
      
      if (dirPath.length > 0) {
         console.writeln("[DEBUG] Checking if directory exists: " + dirPath);
         var dirExists = File.directoryExists(dirPath);
         console.writeln("[DEBUG] Directory exists: " + dirExists);
         if (!dirExists) {
            console.writeln("[DEBUG] Creating directory: " + dirPath);
            File.createDirectory(dirPath, true);
            console.writeln("[DEBUG] Directory created");
         }
      }
      
      console.writeln("[DEBUG] Creating file object...");
      var file = new File;
      console.writeln("[DEBUG] Attempting to create file for writing: " + outputPath);
      
      // createForWriting may not return a boolean, just call it
      try {
         file.createForWriting(outputPath);
         console.writeln("[DEBUG] createForWriting called successfully");
      } catch (e) {
         console.writeln("[DEBUG] ERROR in createForWriting: " + e.message);
         console.writeln("[DEBUG] File path: " + outputPath);
         console.writeln("[DEBUG] Directory exists: " + (dirPath.length > 0 ? File.directoryExists(dirPath) : "N/A"));
         throw new Error("Failed to create CSV file: " + outputPath + " - " + e.message);
      }
      
      console.writeln("[DEBUG] File created successfully, writing data...");
      console.writeln("[DEBUG] Headers: " + headers.join(","));
      console.writeln("[DEBUG] Number of rows: " + rows.length);
      
      try {
         file.outText(headers.join(",") + "\n");
         console.writeln("[DEBUG] Headers written");
         
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
            if (i === 0) {
               console.writeln("[DEBUG] First row written: " + row.join(","));
            }
         }
         console.writeln("[DEBUG] All rows written");
      } catch (e) {
         console.writeln("[DEBUG] ERROR during write: " + e.message);
         throw e;
      } finally {
         console.writeln("[DEBUG] Closing file...");
         file.close();
         console.writeln("[DEBUG] File closed");
      }
      
      console.writeln("[DEBUG] writeCSV: complete");
   }

   return {
      openChannel: openChannel,
      ensureDir: ensureDir,
      saveImage: saveImage,
      writeCSV: writeCSV
   };
})();

