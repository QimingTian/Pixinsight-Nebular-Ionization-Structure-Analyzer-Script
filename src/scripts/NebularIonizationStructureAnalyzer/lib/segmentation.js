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
      // Create segmentation image using ImageWindow
      var segWin = new ImageWindow(width, height, 1, 32, true, false, "nisa_seg");
      // Create temporary image from existing image to get proper structure
      var tempImage = ratioSIIHa.clone();
      tempImage.fill(0); // Initialize to zero

      var counts = {
         shock: 0,
         highIon: 0,
         photoIon: 0
      };

      for (var y = 0; y < height; y++) {
         for (var x = 0; x < width; x++) {
            var valid = mask ? mask.sample(x, y) > 0 : true;
            if (!valid) {
               tempImage.setSample(0, x, y);
               continue;
            }

            var siiha = ratioSIIHa.sample(x, y);
            var oiiha = ratioOIIIHa.sample(x, y);
            if (siiha > shockThreshold) {
               tempImage.setSample(LABELS.SHOCK, x, y);
               counts.shock++;
            } else if (oiiha > highIonThreshold) {
               tempImage.setSample(LABELS.HIGH_ION, x, y);
               counts.highIon++;
            } else {
               tempImage.setSample(LABELS.PHOTOION, x, y);
               counts.photoIon++;
            }
         }
      }
      // Assign to window
      segWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      segWin.mainView.image.assign(tempImage);
      segWin.mainView.endProcess();
      var result = segWin.mainView.image.clone();
      segWin.forceClose();

      return {
         image: result,
         stats: counts
      };
   }

   return {
      LABELS: LABELS,
      classifyPixels: classifyPixels
   };
})();

