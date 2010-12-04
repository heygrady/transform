
///////////////////////////////////////////////////////
// 2d Matrix Functions
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
	var $m = $.matrix,
		$m2x2 = $m.M2x2,
		$m3x3 = $m.M3x3;
	
	$.extend( $m, {
		/**
		 * Identity matrix
		 * @param Number size
		 * @return Matrix
		 */
		identity: function(size) {
			size = size || 2;
			var length = size * size,
				elements = new Array(length),
				mod = size + 1;
			for (var i = 0; i < length; i++) {
				elements[i] = (i % mod) === 0 ? 1 : 0;
			}
			return new $m['M'+size+'x'+size](elements);
		},
		
		/**
		 * Matrix
		 * @return Matrix
		 */
		matrix: function() {
			var args = Array.prototype.slice.call(arguments);
			// arguments are in column-major order
			switch (arguments.length) {
				case 4:
					return new $m2x2(
						args[0], args[2],
						args[1], args[3]
					);
				case 6:
					return new $m3x3(
						args[0], args[2], args[4],
						args[1], args[3], args[5],
						0,       0,       1
					);
			}
		},
		
		/**
		 * Reflect (same as rotate(180))
		 * @return Matrix
		 */
		reflect: function() {
			return new $m2x2(
				-1,  0,
				 0, -1
			);
		},
		
		/**
		 * Reflect across the x-axis (mirrored upside down)
		 * @return Matrix
		 */
		reflectX: function() {	
			return new $m2x2(
				1,  0,
				0, -1
			);
		},
		
		/**
		 * Reflect by swapping x an y (same as reflectX + rotate(-90))
		 * @return Matrix
		 */
		reflectXY: function() {
			return new $m2x2(
				0, 1,
				1, 0
			);
		},
		
		/**
		 * Reflect across the y-axis (mirrored)
		 * @return Matrix
		 */
		reflectY: function() {
			return new $m2x2(
				-1, 0,
				 0, 1
			);
		},
		
		/**
		 * Rotates around the origin
		 * @param Number deg
		 * @return Matrix
		 * @link http://www.w3.org/TR/SVG/coords.html#RotationDefined
		 */
		rotate: function(deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			
			var a = costheta,
				b = sintheta,
				c = -sintheta,
				d = costheta;
				
			return new $m2x2(
				a, c,
				b, d
			);
		},
		
		/**
		 * Scale
		 * @param Number sx
		 * @param Number sy
		 * @return Matrix
		 * @link http://www.w3.org/TR/SVG/coords.html#ScalingDefined
		 */
		scale: function (sx, sy) {
			sx = sx || sx === 0 ? sx : 1;
			sy = sy || sy === 0 ? sy : sx;
			
			return new $m2x2(
				sx, 0,
				0, sy
			);
		},
		
		/**
		 * Scale on the X-axis
		 * @param Number sx
		 * @return Matrix
		 */
		scaleX: function (sx) {
			return $m.scale(sx, 1);
		},
		
		/**
		 * Scale on the Y-axis
		 * @param Number sy
		 * @return Matrix
		 */
		scaleY: function (sy) {
			return $m.scale(1, sy);
		},
		
		/**
		 * Skews on the X-axis and Y-axis
		 * @param Number degX
		 * @param Number degY
		 * @return Matrix
		 */
		skew: function (degX, degY) {
			degX = degX || 0;
			degY = degY || 0;
			
			//TODO: detect units
			var radX = $.angle.degreeToRadian(degX),
				radY = $.angle.degreeToRadian(degY),
				x = Math.tan(radX),
				y = Math.tan(radY);
			
			return new $m2x2(
				1, x,
				y, 1
			);
		},
		
		/**
		 * Skews on the X-axis
		 * @param Number degX
		 * @return Matrix
		 * @link http://www.w3.org/TR/SVG/coords.html#SkewXDefined
		 */
		skewX: function (degX) {
			return $m.skew(degX);
		},
		
		/**
		 * Skews on the Y-axis
		 * @param Number degY
		 * @return Matrix
		 * @link http://www.w3.org/TR/SVG/coords.html#SkewYDefined
		 */
		skewY: function (degY) {
			return $m.skew(0, degY);
		},
		
		/**
		 * Translate
		 * @param Number tx
		 * @param Number ty
		 * @return Matrix
		 * @link http://www.w3.org/TR/SVG/coords.html#TranslationDefined
		 */
		translate: function (tx, ty) {
			tx = tx || 0;
			ty = ty || 0;
			
			return new $m3x3(
				1, 0, tx,
				0, 1, ty,
				0, 0, 1
			);
		},
		
		/**
		 * Translate on the X-axis
		 * @param Number tx
		 * @return Matrix
		 * @link http://www.w3.org/TR/SVG/coords.html#TranslationDefined
		 */
		translateX: function (tx) {
			return $m.translate(tx);
		},
		
		/**
		 * Translate on the Y-axis
		 * @param Number ty
		 * @return Matrix
		 * @link http://www.w3.org/TR/SVG/coords.html#TranslationDefined
		 */
		translateY: function (ty) {
			return $m.translate(0, ty);
		}
	});
})(jQuery, this, this.document);