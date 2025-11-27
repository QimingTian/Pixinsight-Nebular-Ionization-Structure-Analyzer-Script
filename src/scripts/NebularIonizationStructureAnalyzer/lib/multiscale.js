/*
 * Multiscale edge/ionization front detection.
 */

var NISAMultiscale = (function () {

   function detectFronts(ratioImage, options) {
      var numLayers = options.layers || 4;
      var threshold = options.threshold || 0.01;
      
      // Create temporary window with ratio image
      var tmpWin = new ImageWindow(ratioImage.width, ratioImage.height, 1, 32, true, false, "nisa_fronts");
      tmpWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      tmpWin.mainView.image.assign(ratioImage);
      tmpWin.mainView.endProcess();

      // Configure MultiscaleLinearTransform layers
      var mlt = new MultiscaleLinearTransform;
      var layers = new Array(numLayers);
      for (var n = 0; n < numLayers - 1; n++) {
         layers[n] = [false, true, 0.000, false, 3.000, 1.00, 1];
      }
      layers[numLayers - 1] = [true, true, 0.000, false, 3.000, 1.00, 1]; // Last layer enabled
      mlt.layers = layers;
      
      mlt.transform = MultiscaleLinearTransform.prototype.StarletTransform;
      // Don't set scalingFunctionData - let PixInsight use default Starlet settings
      mlt.linearMask = false;
      mlt.executeOn(tmpWin.mainView);

      // Apply threshold using PixelMath
      var pixelMath = new PixelMath;
      pixelMath.expression = "iif(abs($T) > " + threshold + ", abs($T), 0)";
      pixelMath.useSingleExpression = true;
      pixelMath.executeOn(tmpWin.mainView);

      tmpWin.hide();
      var result = tmpWin.mainView.image;
      result._window = tmpWin;

      return result;
   }

   return {
      detectFronts: detectFronts
   };
})();

