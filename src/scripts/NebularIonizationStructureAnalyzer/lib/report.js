/*
 * Reporting utilities: statistics aggregation + CSV rows.
 */

var NISAReport = (function () {

   function computeRegionStats(segmentation, ratioImages, pixelScale) {
      pixelScale = pixelScale || 1; // arcsec per pixel or custom units

      var counts = {
         shock: 0,
         highIon: 0,
         photoIon: 0
      };

      var sums = {
         shock: 0,
         highIon: 0,
         photoIon: 0
      };

      var maxes = {
         shock: 0,
         highIon: 0,
         photoIon: 0
      };

      var width = segmentation.width;
      var height = segmentation.height;
      var siiHa = ratioImages.siiHa;
      var oiiiHa = ratioImages.oiiiHa;
      var oiiiSii = ratioImages.oiiiSii;

      for (var y = 0; y < height; y++) {
         for (var x = 0; x < width; x++) {
            var label = segmentation.sample(x, y);
            var key;
            if (label === NISASegmentation.LABELS.SHOCK)
               key = "shock";
            else if (label === NISASegmentation.LABELS.HIGH_ION)
               key = "highIon";
            else if (label === NISASegmentation.LABELS.PHOTOION)
               key = "photoIon";
            else
               continue;

            counts[key]++;
            var value = (key === "shock") ? siiHa.sample(x, y) : oiiiHa.sample(x, y);
            sums[key] += value;
            if (value > maxes[key])
               maxes[key] = value;
         }
      }

      function buildRow(key, display) {
         var pixels = counts[key];
         if (pixels === 0)
            return [display, 0, 0, 0];
         var area = pixels * pixelScale * pixelScale;
         var mean = sums[key] / pixels;
         return [display, area.toFixed(3), mean.toFixed(4), maxes[key].toFixed(4)];
      }

      return [
         buildRow("shock", "Shock-dominated"),
         buildRow("highIon", "High-ionization"),
         buildRow("photoIon", "Photoionized")
      ];
   }

   return {
      computeRegionStats: computeRegionStats
   };
})();

