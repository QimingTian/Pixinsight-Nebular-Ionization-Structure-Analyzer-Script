/*
 * Reporting utilities: statistics aggregation + CSV rows.
 */

var NISAReport = (function () {

   function computeRegionStats(segmentation, ratioImages, pixelScale) {
      console.writeln("[DEBUG] computeRegionStats: starting");
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
      console.writeln("[DEBUG] Segmentation size: " + width + "x" + height);
      
      var siiHa = ratioImages.siiHa;
      var oiiiHa = ratioImages.oiiiHa;
      var oiiiSii = ratioImages.oiiiSii;
      
      console.writeln("[DEBUG] Checking image objects...");
      console.writeln("[DEBUG] siiHa: " + (siiHa ? "exists" : "null") + ", width=" + (siiHa ? siiHa.width : "N/A"));
      console.writeln("[DEBUG] oiiiHa: " + (oiiiHa ? "exists" : "null") + ", width=" + (oiiiHa ? oiiiHa.width : "N/A"));
      console.writeln("[DEBUG] segmentation: " + (segmentation ? "exists" : "null") + ", width=" + (segmentation ? segmentation.width : "N/A"));

      console.writeln("[DEBUG] Starting pixel loop...");
      var totalPixels = width * height;
      var processedPixels = 0;
      var sampleInterval = Math.floor(totalPixels / 100); // Sample every 1% for speed
      
      for (var y = 0; y < height; y += 10) { // Sample every 10th pixel for speed
         for (var x = 0; x < width; x += 10) {
            try {
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

               counts[key] += 100; // Scale up since we're sampling
               var value = (key === "shock") ? siiHa.sample(x, y) : oiiiHa.sample(x, y);
               sums[key] += value * 100; // Scale up
               if (value > maxes[key])
                  maxes[key] = value;
               
               processedPixels += 100;
            } catch (e) {
               console.writeln("[DEBUG] ERROR at pixel (" + x + "," + y + "): " + e.message);
               throw e;
            }
         }
      }
      
      console.writeln("[DEBUG] Pixel loop complete");
      console.writeln("[DEBUG] Counts: shock=" + counts.shock + ", highIon=" + counts.highIon + ", photoIon=" + counts.photoIon);

      function buildRow(key, display) {
         var pixels = counts[key];
         console.writeln("[DEBUG] buildRow for " + key + ": pixels=" + pixels);
         if (pixels === 0)
            return [display, 0, 0, 0];
         var area = pixels * pixelScale * pixelScale;
         var mean = sums[key] / pixels;
         var row = [display, area.toFixed(3), mean.toFixed(4), maxes[key].toFixed(4)];
         console.writeln("[DEBUG] Row: " + row.join(","));
         return row;
      }

      console.writeln("[DEBUG] Building rows...");
      var result = [
         buildRow("shock", "Shock-dominated"),
         buildRow("highIon", "High-ionization"),
         buildRow("photoIon", "Photoionized")
      ];
      console.writeln("[DEBUG] computeRegionStats: complete, returning " + result.length + " rows");
      return result;
   }

   return {
      computeRegionStats: computeRegionStats
   };
})();

