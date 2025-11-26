/*
 * Multiscale edge/ionization front detection.
 */

var NISAMultiscale = (function () {

   function detectFronts(ratioImage, options) {
      var layers = options.layers || 4;
      var threshold = options.threshold || 0.01;
      var tmpWin = new ImageWindow(ratioImage.width, ratioImage.height, 1, 32, true, false, "nisa_ratio");
      tmpWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      tmpWin.mainView.image.assign(ratioImage);
      tmpWin.mainView.endProcess();

      var mlt = new MultiscaleLinearTransform;
      mlt.layers = layers;
      mlt.scalingFunctionData = MultiscaleLinearTransform.prototype.Starlet5;
      mlt.linearMask = false;
      mlt.executeOn(tmpWin.mainView);

      var gradient = tmpWin.mainView.image.clone();
      tmpWin.forceClose();

      var width = gradient.width;
      var height = gradient.height;
      for (var y = 0; y < height; y++) {
         for (var x = 0; x < width; x++) {
            var value = Math.abs(gradient.sample(x, y));
            gradient.setSample(value > threshold ? value : 0, x, y);
         }
      }

      return gradient;
   }

   return {
      detectFronts: detectFronts
   };
})();

