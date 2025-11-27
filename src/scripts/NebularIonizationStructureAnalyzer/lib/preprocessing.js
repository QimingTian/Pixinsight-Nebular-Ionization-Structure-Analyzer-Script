/*
 * Preprocessing utilities: noise mask helpers.
 * Assumes upstream calibration + DBE have been completed.
 */

var NISAPreprocessing = (function () {

   function estimateNoiseSigma(view) {
      // Use MAD (Median Absolute Deviation) as robust noise estimator
      var median = view.image.median();
      var width = view.image.width;
      var height = view.image.height;
      var deviations = [];
      for (var y = 0; y < height; y += 10) { // Sample every 10th pixel for speed
         for (var x = 0; x < width; x += 10) {
            var value = view.image.sample(x, y);
            deviations.push(Math.abs(value - median));
         }
      }
      // Sort and get median of deviations
      deviations.sort(function(a, b) { return a - b; });
      var mad = deviations[Math.floor(deviations.length / 2)];
      // Convert MAD to sigma approximation: sigma ≈ 1.4826 * MAD
      return 1.4826 * mad;
   }

   function buildNoiseMask(view, sigma, k, progressCallback) {
      console.writeln("[DEBUG] buildNoiseMask: starting, width=" + view.image.width + ", height=" + view.image.height);
      var threshold = k * sigma;
      var width = view.image.width;
      var height = view.image.height;
      
      // Use RangeSelection to create mask - this avoids setSample() issues
      console.writeln("[DEBUG] Using RangeSelection to create mask...");
      if (progressCallback) {
         progressCallback("生成噪声掩膜: 使用 RangeSelection...");
      }
      
      // Create a temporary window with the source image
      var tempWin = new ImageWindow(width, height, 1, 32, true, false, "nisa_mask_temp");
      tempWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      tempWin.mainView.image.assign(view.image);
      tempWin.mainView.endProcess();
      
      // Use RangeSelection to create mask above threshold
      var rangeSel = new RangeSelection;
      rangeSel.lowRange = threshold;
      rangeSel.highRange = 1.0;
      rangeSel.fuzziness = 0.0;
      rangeSel.smoothness = 0;
      rangeSel.screening = false;
      rangeSel.toLightness = false;
      rangeSel.invert = false;
      rangeSel.createNewImage = true;
      rangeSel.showNewImage = false;
      
      // Store current active window before RangeSelection
      var oldActiveWindow = ImageWindow.activeWindow;
      rangeSel.executeOn(tempWin.mainView);
      
      // RangeSelection creates a new window which becomes active
      var maskWin = ImageWindow.activeWindow;
      
      // Check if we got a new window (not the temp window)
      if (!maskWin || maskWin.mainView.id === tempWin.mainView.id) {
         // Fallback: use PixelMath to create binary mask
         console.writeln("[DEBUG] RangeSelection failed, using PixelMath...");
         tempWin.forceClose();
         maskWin = new ImageWindow(width, height, 1, 32, true, false, "nisa_mask");
         maskWin.mainView.beginProcess(UndoFlag_NoSwapFile);
         maskWin.mainView.image.assign(view.image);
         maskWin.mainView.endProcess();
         
         // Use PixelMath to create binary mask: if value > threshold then 1 else 0
         var pixelMath = new PixelMath;
         pixelMath.expression = "iif($T > " + threshold + ", 1, 0)";
         pixelMath.useSingleExpression = true;
         pixelMath.symbols = "";
         pixelMath.executeOn(maskWin.mainView);
      } else {
         tempWin.forceClose();
      }
      
      console.writeln("[DEBUG] Cloning mask image...");
      var result = maskWin.mainView.image.clone();
      maskWin.forceClose();
      console.writeln("[DEBUG] buildNoiseMask: complete");
      return result;
   }

   function normalizeChannel(view, scaleFactor) {
      if (scaleFactor === undefined || scaleFactor <= 0)
         return;
      view.image.mul(1.0 / scaleFactor);
   }

   return {
      estimateNoiseSigma: estimateNoiseSigma,
      buildNoiseMask: buildNoiseMask,
      normalizeChannel: normalizeChannel
   };
})();

