/*
 * Ratio map utilities.
 */

var NISARatios = (function () {

   function computeRatio(numeratorView, denominatorView, options) {
      var eps = (options && options.epsilon) || 1e-6;
      var mask = options && options.mask;
      var progressCallback = options && options.progressCallback;
      var width = numeratorView.image.width;
      var height = numeratorView.image.height;
      
      if (progressCallback) {
         progressCallback("计算比值: 使用 PixelMath...");
      }
      
      // Create result window with numerator image
      // normalized=false: Keep original pixel values, don't normalize to [0,1]
      // isFloatSample=true: Use Float32 to support values > 1.0
      var ratioWin = new ImageWindow(width, height, 1, 32, true, false, "nisa_ratio");
      ratioWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      ratioWin.mainView.image.assign(numeratorView.image);
      ratioWin.mainView.endProcess();
      
      // Compute ratio directly using pixel loop to avoid PixelMath truncation
      // PixelMath always truncates to [0,1] regardless of settings
      if (progressCallback) {
         progressCallback("计算比值: 直接像素计算（避免截断）...");
      }
      
      ratioWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      var ratioImage = ratioWin.mainView.image;
      var numImage = numeratorView.image;
      var denImage = denominatorView.image;
      var maskImage = mask && mask._window ? mask._window.mainView.image : null;
      
      var totalPixels = width * height;
      var updateInterval = Math.floor(totalPixels / 20); // Update every 5%
      var processedPixels = 0;
      
      var maxRatio = 0;
      var minRatio = Number.MAX_VALUE;
      var sampleCount = 0;
      
      for (var y = 0; y < height; y++) {
         if (y % updateInterval === 0 && progressCallback) {
            progressCallback("计算比值: " + Math.floor((y * width / totalPixels) * 100) + "%");
            processEvents();
         }
         for (var x = 0; x < width; x++) {
            var numVal = numImage.sample(x, y);
            var denVal = denImage.sample(x, y);
            var ratio = numVal / (denVal + eps);
            
            // Apply mask if provided
            if (maskImage) {
               var maskVal = maskImage.sample(x, y);
               if (maskVal <= 0) {
                  ratio = 0;
               }
            }
            
            // Track min/max for debugging (sample all pixels, not just first 1000)
            if (ratio > 0) {
               if (ratio > maxRatio) maxRatio = ratio;
               if (ratio < minRatio) minRatio = ratio;
            }
            
            ratioImage.setSample(ratio, x, y);
            processedPixels++;
         }
      }
      
      // Print statistics BEFORE endProcess (while still in beginProcess block)
      console.writeln("[DEBUG] 比值计算完成: 内存中的比值范围, min=" + minRatio.toFixed(4) + ", max=" + maxRatio.toFixed(4));
      
      // Verify the image still has correct values BEFORE endProcess
      // Note: ImageStatistics may read display values, so we sample directly
      var verifyMax = 0;
      var verifyMin = Number.MAX_VALUE;
      for (var vy = 0; vy < height && vy < 100; vy += 10) { // Sample first 100 rows
         for (var vx = 0; vx < width && vx < 100; vx += 10) { // Sample first 100 cols
            var val = ratioImage.sample(vx, vy);
            if (val > verifyMax) verifyMax = val;
            if (val > 0 && val < verifyMin) verifyMin = val;
         }
      }
      console.writeln("[DEBUG] 比值图像采样（endProcess前）: min=" + verifyMin.toFixed(4) + ", max=" + verifyMax.toFixed(4));
      
      ratioWin.mainView.endProcess();
      
      // Check after endProcess
      var verifyMaxAfter = 0;
      var verifyMinAfter = Number.MAX_VALUE;
      var ratioImageAfter = ratioWin.mainView.image;
      for (var vy2 = 0; vy2 < height && vy2 < 100; vy2 += 10) {
         for (var vx2 = 0; vx2 < width && vx2 < 100; vx2 += 10) {
            var val2 = ratioImageAfter.sample(vx2, vy2);
            if (val2 > verifyMaxAfter) verifyMaxAfter = val2;
            if (val2 > 0 && val2 < verifyMinAfter) verifyMinAfter = val2;
         }
      }
      console.writeln("[DEBUG] 比值图像采样（endProcess后）: min=" + verifyMinAfter.toFixed(4) + ", max=" + verifyMaxAfter.toFixed(4));
      
      // Also check ImageStatistics
      var verifyStats = new ImageStatistics(ratioImageAfter);
      console.writeln("[DEBUG] 比值图像统计（endProcess后）: min=" + verifyStats.minimum.toFixed(4) + ", max=" + verifyStats.maximum.toFixed(4) + ", median=" + verifyStats.median.toFixed(4));
      
      ratioWin.hide();
      var result = ratioWin.mainView.image;
      result._window = ratioWin;
      
      return result;
   }

   function stretch(image, mode) {
      mode = mode || "arcsinh";
      var width = image.width;
      var height = image.height;

      if (mode === "minmax") {
         // Calculate min and max manually
         var min = Number.MAX_VALUE;
         var max = -Number.MAX_VALUE;
         for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
               var v = image.sample(x, y);
               if (v < min) min = v;
               if (v > max) max = v;
            }
         }
         for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
               var v = image.sample(x, y);
               var s = (v - min) / (max - min + 1e-9);
               if (s < 0) s = 0;
               if (s > 1) s = 1;
               image.setSample(s, x, y);
            }
         }
      } else {
         for (var y2 = 0; y2 < height; y2++) {
            for (var x2 = 0; x2 < width; x2++) {
               var value = image.sample(x2, y2);
               image.setSample(Math.asinh(value), x2, y2);
            }
         }
      }
   }

   return {
      computeRatio: computeRatio,
      stretch: stretch
   };
})();

