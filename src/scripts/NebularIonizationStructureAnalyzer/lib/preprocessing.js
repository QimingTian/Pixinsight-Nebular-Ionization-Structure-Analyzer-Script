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

   function buildNoiseMask(view, sigma, k) {
      var threshold = k * sigma;
      var width = view.image.width;
      var height = view.image.height;
      var mask = new Image(width, height, 1, SampleType_Real, 1);
      for (var y = 0; y < height; y++) {
         for (var x = 0; x < width; x++) {
            var value = view.image.sample(x, y);
            mask.setSample(value > threshold ? 1 : 0, x, y);
         }
      }
      return mask;
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

