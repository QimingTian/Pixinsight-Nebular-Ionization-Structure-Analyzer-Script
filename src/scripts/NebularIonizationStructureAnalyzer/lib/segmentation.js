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
      
      if (progressCallback) {
         progressCallback("像素分类: 使用 PixelMath...");
      }
      
      // Create segmentation image using ImageWindow
      var segWin = new ImageWindow(width, height, 1, 32, true, false, "nisa_seg");
      segWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      segWin.mainView.image.fill(0);
      segWin.mainView.endProcess();
      
      // Get image IDs for PixelMath
      var siiHaId = ratioSIIHa._window ? ratioSIIHa._window.mainView.id : "";
      var oiiiHaId = ratioOIIIHa._window ? ratioOIIIHa._window.mainView.id : "";
      var maskId = mask && mask._window ? mask._window.mainView.id : "";
      
      // Use PixelMath to classify pixels
      // Logic: if mask > 0 then
      //   if siiha > shockThreshold then 1 (SHOCK)
      //   else if oiiha > highIonThreshold then 2 (HIGH_ION)
      //   else 3 (PHOTOION)
      // else 0 (NONE)
      var pixelMath = new PixelMath;
      if (maskId) {
         pixelMath.expression = "iif(" + maskId + " > 0, " +
            "iif(" + siiHaId + " > " + shockThreshold + ", " + LABELS.SHOCK + ", " +
            "iif(" + oiiiHaId + " > " + highIonThreshold + ", " + LABELS.HIGH_ION + ", " + LABELS.PHOTOION + ")), " +
            LABELS.NONE + ")";
      } else {
         pixelMath.expression = "iif(" + siiHaId + " > " + shockThreshold + ", " + LABELS.SHOCK + ", " +
            "iif(" + oiiiHaId + " > " + highIonThreshold + ", " + LABELS.HIGH_ION + ", " + LABELS.PHOTOION + "))";
      }
      pixelMath.useSingleExpression = true;
      pixelMath.executeOn(segWin.mainView);
      
      // Calculate statistics by sampling the result
      var counts = {
         shock: 0,
         highIon: 0,
         photoIon: 0
      };
      
      if (progressCallback) {
         progressCallback("像素分类: 计算统计信息...");
      }
      
      var totalPixels = width * height;
      var processedPixels = 0;
      var updateInterval = Math.floor(totalPixels / 20); // Update every 5%
      
      for (var y = 0; y < height; y += 10) { // Sample every 10th pixel for speed
         for (var x = 0; x < width; x += 10) {
            var label = segWin.mainView.image.sample(x, y);
            if (label === LABELS.SHOCK) {
               counts.shock += 100; // Scale up since we're sampling
            } else if (label === LABELS.HIGH_ION) {
               counts.highIon += 100;
            } else if (label === LABELS.PHOTOION) {
               counts.photoIon += 100;
            }
         }
      }
      
      segWin.hide();
      var result = segWin.mainView.image;
      result._window = segWin;

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

