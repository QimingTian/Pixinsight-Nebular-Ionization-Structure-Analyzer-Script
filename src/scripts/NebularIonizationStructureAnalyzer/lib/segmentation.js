/*
 * Pixel classification utilities.
 */

var NISASegmentation = (function () {

   var LABELS = {
      NONE: 0,
      SHOCK: 1,
      HIGH_ION: 2,
      PHOTOION: 3
   };

   function classifyPixels(ratioSIIHa, ratioOIIIHa, options) {
      var shockThreshold = options.shockThreshold || 0.5;
      var highIonThreshold = options.highIonThreshold || 1.0;
      var mask = options.mask;

      var width = ratioSIIHa.width;
      var height = ratioSIIHa.height;
      var segmentation = new Image(width, height, 1, SampleType_Real, 1);

      var counts = {
         shock: 0,
         highIon: 0,
         photoIon: 0
      };

      for (var y = 0; y < height; y++) {
         for (var x = 0; x < width; x++) {
            var valid = mask ? mask.sample(x, y) > 0 : true;
            if (!valid) {
               segmentation.setSample(0, x, y);
               continue;
            }

            var siiha = ratioSIIHa.sample(x, y);
            var oiiha = ratioOIIIHa.sample(x, y);
            if (siiha > shockThreshold) {
               segmentation.setSample(LABELS.SHOCK, x, y);
               counts.shock++;
            } else if (oiiha > highIonThreshold) {
               segmentation.setSample(LABELS.HIGH_ION, x, y);
               counts.highIon++;
            } else {
               segmentation.setSample(LABELS.PHOTOION, x, y);
               counts.photoIon++;
            }
         }
      }

      return {
         image: segmentation,
         stats: counts
      };
   }

   return {
      LABELS: LABELS,
      classifyPixels: classifyPixels
   };
})();

