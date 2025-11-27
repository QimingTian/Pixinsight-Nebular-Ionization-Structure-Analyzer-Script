/*
 * Ratio map utilities.
 */

var NISARatios = (function () {

   function computeRatio(numeratorView, denominatorView, options) {
      var eps = (options && options.epsilon) || 1e-6;
      var mask = options && options.mask;
      var width = numeratorView.image.width;
      var height = numeratorView.image.height;
      // Create ratio image using ImageWindow
      var ratioWin = new ImageWindow(width, height, 1, 32, true, false, "nisa_ratio");
      ratioWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      ratioWin.mainView.image.fill(0); // Initialize to zero
      ratioWin.mainView.endProcess();
      ratioWin.mainView.beginProcess(); // Start another process to modify
      for (var y = 0; y < height; y++) {
         for (var x = 0; x < width; x++) {
            if (mask && mask.sample(x, y) <= 0) {
               ratioWin.mainView.image.setSample(0, x, y);
               continue;
            }
            var num = numeratorView.image.sample(x, y);
            var den = denominatorView.image.sample(x, y);
            ratioWin.mainView.image.setSample(num / (den + eps), x, y);
         }
      }
      ratioWin.mainView.endProcess();
      var result = ratioWin.mainView.image.clone();
      ratioWin.forceClose();
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

