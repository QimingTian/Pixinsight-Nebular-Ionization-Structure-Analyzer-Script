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
      var progressCallback = options.progressCallback;

      var width = ratioSIIHa.width;
      var height = ratioSIIHa.height;
      // Create segmentation image using ImageWindow
      var segWin = new ImageWindow(width, height, 1, 32, true, false, "nisa_seg");
      // First process: initialize to zero
      segWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      segWin.mainView.image.fill(0);
      segWin.mainView.endProcess();
      // Second process: set sample values
      segWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      var counts = {
         shock: 0,
         highIon: 0,
         photoIon: 0
      };

      var totalPixels = width * height;
      var processedPixels = 0;
      var updateInterval = Math.floor(totalPixels / 20); // Update every 5%

      for (var y = 0; y < height; y++) {
         for (var x = 0; x < width; x++) {
            var valid = mask ? mask.sample(x, y) > 0 : true;
            if (!valid) {
               segWin.mainView.image.setSample(0, x, y);
               processedPixels++;
            } else {
               var siiha = ratioSIIHa.sample(x, y);
               var oiiha = ratioOIIIHa.sample(x, y);
               if (siiha > shockThreshold) {
                  segWin.mainView.image.setSample(LABELS.SHOCK, x, y);
                  counts.shock++;
               } else if (oiiha > highIonThreshold) {
                  segWin.mainView.image.setSample(LABELS.HIGH_ION, x, y);
                  counts.highIon++;
               } else {
                  segWin.mainView.image.setSample(LABELS.PHOTOION, x, y);
                  counts.photoIon++;
               }
               processedPixels++;
            }
            if (processedPixels % updateInterval === 0) {
               if (progressCallback) {
                  progressCallback("像素分类: " + Math.floor(processedPixels * 100 / totalPixels) + "%");
               }
               processEvents(); // Update UI
            }
         }
      }
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

