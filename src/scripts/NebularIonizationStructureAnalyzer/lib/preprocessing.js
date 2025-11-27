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
      rangeSel.executeOn(tempWin.mainView);
      
      // Find the newly created mask window
      var maskWindows = ImageWindow.windows;
      var maskWin = null;
      for (var i = 0; i < maskWindows.length; i++) {
         if (maskWindows[i].mainView.id !== tempWin.mainView.id && 
             maskWindows[i].mainView.id.indexOf("RangeSelection") >= 0) {
            maskWin = maskWindows[i];
            break;
         }
      }
      
      if (!maskWin) {
         // Fallback: create mask manually using a different approach
         console.writeln("[DEBUG] RangeSelection failed, using manual method...");
         tempWin.forceClose();
         maskWin = new ImageWindow(width, height, 1, 32, true, false, "nisa_mask");
         maskWin.mainView.beginProcess(UndoFlag_NoSwapFile);
         maskWin.mainView.image.assign(view.image);
         // Subtract threshold and clamp to create binary mask
         maskWin.mainView.image.sub(threshold);
         maskWin.mainView.image.truncate(0, 1);
         maskWin.mainView.endProcess();
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

