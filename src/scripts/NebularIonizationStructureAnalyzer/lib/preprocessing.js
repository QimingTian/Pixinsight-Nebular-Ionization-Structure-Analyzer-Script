/*
 * Preprocessing utilities: noise mask helpers.
 * Assumes upstream calibration + DBE have been completed.
 */

var NISAPreprocessing = (function () {

   function estimateNoiseSigma(view) {
      var stats = new ImageStatistics;
      stats.apply(view.image);
      return stats.sigma[0];
   }

   function buildNoiseMask(view, sigma, k) {
      var threshold = k * sigma;
      var width = view.image.width;
      var height = view.image.height;
      var mask = new Image(width, height, 1, FloatSample, 1);
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

