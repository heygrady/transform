
///////////////////////////////////////////////////////
// Matrix Calculations
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * Matrix object for creating matrices relevant for 2d Transformations
	 * @var Object
	 */
	if (typeof($.matrix) == 'undefined') {
		$.extend({
			matrix: {}
		});
	}
	
	$.extend( $.matrix, {
		/**
		 * Class for calculating coordinates on a matrix
		 * @param Matrix matrix
		 * @param Number outerHeight
		 * @param Number outerWidth
		 * @constructor
		 */
		calc: function(matrix, outerHeight, outerWidth) {
			/**
			 * @var Matrix
			 */
			this.matrix = matrix;
			
			/**
			 * @var Number
			 */
			this.outerHeight = outerHeight;
			
			/**
			 * @var Number
			 */
			this.outerWidth = outerWidth;
		}
	});
	
	$.matrix.calc.prototype = {
		/**
		 * Calculate a coord on the new object
		 * @return Object
		 */
		coord: function(x, y, z) {
			//default z and w
			z = typeof(z) !== 'undefined' ? z : 0;
			
			var matrix = this.matrix,
				vector;
				
			switch (matrix.rows) {
				case 2:
					vector = matrix.x(new $.matrix.V2(x, y));
					break;
				case 3:
					vector = matrix.x(new $.matrix.V3(x, y, z));
					break;
			}
			
			return vector;
		},
		
		/**
		 * Calculate the corners of the new object
		 * @return Object
		 */
		corners: function(x, y) {
			// Try to save the corners if this is called a lot
			var save = !(typeof(x) !=='undefined' || typeof(y) !=='undefined'),
				c;
			if (!this.c || !save) {
				y = y || this.outerHeight;
				x = x || this.outerWidth;
				
				c = {
					tl: this.coord(0, 0),
					bl: this.coord(0, y),
					tr: this.coord(x, 0),
					br: this.coord(x, y)
				};
			} else {
				c = this.c;
			}
			
			if (save) {
				this.c = c;
			}
			return c;
		},
		
		/**
		 * Calculate the sides of the new object
		 * @return Object
		 */
		sides: function(corners) {
			// The corners of the box
			var c = corners || this.corners();
			
			return {
				top: Math.min(c.tl.e(2), c.tr.e(2), c.br.e(2), c.bl.e(2)),
				bottom: Math.max(c.tl.e(2), c.tr.e(2), c.br.e(2), c.bl.e(2)),
				left: Math.min(c.tl.e(1), c.tr.e(1), c.br.e(1), c.bl.e(1)),
				right: Math.max(c.tl.e(1), c.tr.e(1), c.br.e(1), c.bl.e(1))
			};
		},
		
		/**
		 * Calculate the offset of the new object
		 * @return Object
		 */
		offset: function(corners) {
			// The corners of the box
			var s = this.sides(corners);
			
			// return size
			return {
				height: Math.abs(s.bottom - s.top), 
				width: Math.abs(s.right - s.left)
			};
		},
		
		/**
		 * Calculate the area of the new object
		 * @return Number
		 * @link http://en.wikipedia.org/wiki/Quadrilateral#Area_of_a_convex_quadrilateral
		 */
		area: function(corners) {
			// The corners of the box
			var c = corners || this.corners();
			
			// calculate the two diagonal vectors
			var v1 = {
					x: c.tr.e(1) - c.tl.e(1) + c.br.e(1) - c.bl.e(1),
					y: c.tr.e(2) - c.tl.e(2) + c.br.e(2) - c.bl.e(2)
				},
				v2 = {
					x: c.bl.e(1) - c.tl.e(1) + c.br.e(1) - c.tr.e(1),
					y: c.bl.e(2) - c.tl.e(2) + c.br.e(2) - c.tr.e(2)
				};
				
			return 0.25 * Math.abs(v1.e(1) * v2.e(2) - v1.e(2) * v2.e(1));
		},
		
		/**
		 * Calculate the non-affinity of the new object
		 * @return Number
		 */
		nonAffinity: function() {
			// The corners of the box
			var sides = this.sides(),
				xDiff = sides.top - sides.bottom,
				yDiff = sides.left - sides.right;
			
			return parseFloat(parseFloat(Math.abs(
				(Math.pow(xDiff, 2) + Math.pow(yDiff, 2)) /
				(sides.top * sides.bottom + sides.left * sides.right)
			)).toFixed(8));
		},
		
		/**
		 * Calculate a proper top and left for IE
		 * @param Object toOrigin
		 * @param Object fromOrigin
		 * @return Object
		 */
		originOffset: function(toOrigin, fromOrigin) {
			// the origin to translate to
			toOrigin = toOrigin ? toOrigin : new $.matrix.V2(
				this.outerWidth * 0.5,
				this.outerHeight * 0.5
			);
			
			// the origin to translate from (IE has a fixed origin of 0, 0)
			fromOrigin = fromOrigin ? fromOrigin : new $.matrix.V2(
				0,
				0
			);
			
			// transform the origins
			var toCenter = this.coord(toOrigin.e(1), toOrigin.e(2));
			var fromCenter = this.coord(fromOrigin.e(1), fromOrigin.e(2));
			
			// return the offset
			return {
				top: (fromCenter.e(2) - fromOrigin.e(2)) - (toCenter.e(2) - toOrigin.e(2)),
				left: (fromCenter.e(1) - fromOrigin.e(1)) - (toCenter.e(1) - toOrigin.e(1))
			};
		}
	};
})(jQuery, this, this.document);