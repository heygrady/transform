/*!
 * jQuery 2d Transform
 * http://wiki.github.com/heygrady/transform/
 *
 * Copyright 2010, Grady Kuhnline
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */
///////////////////////////////////////////////////////
// Angle
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * Converting a radian to a degree
	 * @const
	 */
	var RAD_DEG = 180/Math.PI;
	
	/**
	 * Converting a radian to a grad
	 * @const
	 */
	var RAD_GRAD = 200/Math.PI;
	
	/**
	 * Converting a degree to a radian
	 * @const
	 */
	var DEG_RAD = Math.PI/180;
	
	/**
	 * Converting a degree to a grad
	 * @const
	 */
	var DEG_GRAD = 2/1.8;
	
	/**
	 * Converting a grad to a degree
	 * @const
	 */
	var GRAD_DEG = 0.9;
	
	/**
	 * Converting a grad to a radian
	 * @const
	 */
	var GRAD_RAD = Math.PI/200;
	
	/**
	 * Functions for converting angles
	 * @var Object
	 */
	$.extend({
		angle: {
			/**
			 * available units for an angle
			 * @var Regex
			 */
			runit: /(deg|g?rad)/,
			
			/**
			 * Convert a radian into a degree
			 * @param Number rad
			 * @returm Number
			 */
			radianToDegree: function(rad) {
				return rad * RAD_DEG;
			},
			
			/**
			 * Convert a radian into a degree
			 * @param Number rad
			 * @returm Number
			 */
			radianToGrad: function(rad) {
				return rad * RAD_GRAD;
			},
			
			/**
			 * Convert a degree into a radian
			 * @param Number deg
			 * @returm Number
			 */
			degreeToRadian: function(deg) {
				return deg * DEG_RAD;
			},
			
			/**
			 * Convert a degree into a radian
			 * @param Number deg
			 * @returm Number
			 */
			degreeToGrad: function(deg) {
				return deg * DEG_GRAD;
			},
			
			/**
			 * Convert a grad into a degree
			 * @param Number grad
			 * @returm Number
			 */
			gradToDegree: function(grad) {
				return grad * GRAD_DEG;
			},
			
			/**
			 * Convert a grad into a radian
			 * @param Number grad
			 * @returm Number
			 */
			gradToRadian: function(grad) {
				return grad * GRAD_RAD;
			}
		}
	});
})(jQuery, this, this.document);

///////////////////////////////////////////////////////
// Transform
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * @var Regex identify the matrix filter in IE
	 */
	var rmatrix = /progid:DXImageTransform\.Microsoft\.Matrix\(.*?\)/;
	
	/**
	 * Class for creating cross-browser transformations
	 * @class
	 */
	$.extend({
		transform: function(elem) {
			/**
			 * The element we're working with
			 * @var jQueryCollection
			 */
			this.$elem = $(elem);
			
			/**
			 * Remember the transform property so we don't have to keep
			 * looking it up
			 * @var string
			 */
			this.transformProperty = this.getTransformProperty();
		}
	});
	
	$.extend($.transform, {
		/**
		 * @var Array list of all valid transform functions
		 */
		funcs: ['origin', 'reflect', 'reflectX', 'reflectXY', 'reflectY', 'rotate', 'scale', 'scaleX', 'scaleY', 'skew', 'skewX', 'skewY', 'translate', 'translateX', 'translateY'],
		
		rfunc: {
			/**
			 * @var Regex identifies functions that require an angle unit
			 */
			angle: /^rotate|skew[X|Y]?$/,
			
			/**
			 * @var Regex identifies functions that require a length unit
			 */
			length: /^origin|translate[X|Y]?$/,
			
			/**
			 * @var Regex identifies functions that do not require a unit
			 */
			scale: /^scale[X|Y]?$/,
			
			/**
			 * @var Regex reflection functions
			 */
			reflect: /^reflect(XY|X|Y)?$/
		}
	});
	
	/**
	 * Create Transform as a jQuery plugin
	 * @param Object funcs
	 * @param Object options
	 */
	$.fn.transform = function(funcs, options) {
		return this.each(function() {
			var t = new $.transform(this);
			if (funcs) {
				t.transform(funcs, options);
			}
		});
	};	
	
	$.transform.prototype = {
		/**
		 * Applies all of the transformations
		 * @param Object funcs
		 * @param Object options
		 * 		forceMatrix: uses the matrix in all browsers
		 * 		preserve: tries to preserve the values from previous runs
		 */
		transform: function(funcs, options) {
			// determine if the CSS property is known 
			var property = this.transformProperty;
			
			// extend options
			options = $.extend(true, {
				forceMatrix: false,
				preserve: false
			}, options);
	
			// preserve the funcs from the previous run
			if (options.preserve) {
				funcs = $.extend(true, this.getAttrs(true, true), funcs);
			} else {
				funcs = $.extend(true, {}, funcs); // copy the object to prevent weirdness
			}
			
			// Record the custom attributes on the element itself (helps out
			//	the animator)
			this.clearAttrs();
			this.setAttrs(funcs);
			
			// apply the funcs
			if (property && !options.forceMatrix) {
				// CSS3 is supported
				return this.applyFuncs(funcs);
			} else if ($.browser.msie || (property && options.forceMatrix)) {
				// Internet Explorer or Forced matrix
				return this.applyMatrix(funcs);
			}
			return false;
		},
		
		/**
		 * Applies all of the transformations as functions
		 * var Object funcs
		 */
		applyFuncs: function(funcs, generate) {
			var values = [];
			var property = this.transformProperty;
			
			// construct a CSS string
			for (var func in funcs) {
				// handle origin separately
				if (func == 'origin') {
					this[func].apply(this, $.isArray(funcs[func]) ? funcs[func] : [funcs[func]]);
				} else if ($.inArray($.transform.funcs, func)) {
					values.push(this.createTransformFunc(func, funcs[func]));
				}
			}
			
			this.$elem.css(property, values.join(' '));
			this.$elem.data('transformed', true);
			return true;
		},
		
		/**
		 * Applies all of the transformations as a matrix
		 * var Object options
		 */
		applyMatrix: function(funcs) {
			var matrix,
				property = this.transformProperty,
				args;
			
			// collect all the matrices
			var strip = function(i, arg) {
				args[i] = parseFloat(arg);
			};
			for (var func in funcs) {
				if ($.matrix[func]) {
					args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					
					// strip the units
					// TODO: should probably convert the units properly instead of just stripping them
					$.each(args, strip);
					
					if (!matrix) {
						matrix = $.matrix[func].apply(this, args);
					} else {
						matrix = matrix.x($.matrix[func].apply(this, args));
					}
				} else if (func == 'origin') {
					args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					this[func].apply(this, args);
				}
			}
			
			// calculate the final matrix
			if (!matrix) {
				return;
			}
			
			// pull out the relevant values
			var a = parseFloat(parseFloat(matrix.e(1,1)).toFixed(8)),
				b = parseFloat(parseFloat(matrix.e(2,1)).toFixed(8)),
				c = parseFloat(parseFloat(matrix.e(1,2)).toFixed(8)),
				d = parseFloat(parseFloat(matrix.e(2,2)).toFixed(8)),
				tx = parseFloat(parseFloat(matrix.e(1,3)).toFixed(8)),
				ty = parseFloat(parseFloat(matrix.e(2,3)).toFixed(8));
			
			//apply the transform to the element
			if (property && property.substr(0, 4) == '-moz') { // -moz
				this.$elem.css(property, 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', ' + tx + 'px, ' + ty + 'px)');
			} else if (property) { // -webkit, -o, w3c
				// NOTE: WebKit and Opera don't allow units on the translate variables
				this.$elem.css(property, 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', ' + tx + ', ' + ty + ')');
			} else if (jQuery.browser.msie) { // IE
				// IE requires the special transform Filter
				var style = this.$elem[0].style;
				var matrixFilter = 'progid:DXImageTransform.Microsoft.Matrix(M11=' + a + ', M12=' + c + ', M21=' + b + ', M22=' + d + ', sizingMethod=\'auto expand\')';
				var filter = style.filter || jQuery.curCSS( this.$elem[0], "filter" ) || "";
				style.filter = rmatrix.test(filter) ? filter.replace(rmatrix, matrixFilter) : filter ? filter + ' ' + matrixFilter : matrixFilter;
				this.$elem.css({zoom: 1});
				
				// IE can't set the origin or translate directly
				this.fixPosition(matrix, tx, ty);
			}
			this.$elem.data('transformed', true);
			return true;
		},
		
		/**
		 * Sets the transform-origin
		 * Only gets called in Moz, WebKit and O
		 * @param Number x
		 * @param Number y
		 */
		origin: function(x, y) {
			var property = this.transformProperty,
				height = this.safeOuterHeight(),
				width = this.safeOuterWidth();
				
			// correct for word lengths
			switch (x) {
				case 'left': x = '0'; break;
				case 'right': x = width; break;
				case 'center': x = width * 0.5; break;
			}
			switch (y) {
				case 'top': y = '0'; break;
				case 'bottom': y = height; break;
				case 'center': // no break
				case undefined: y = height * 0.5; break;
			}
	
			// assume all length units are px
			//TODO: handle unit conversion better
			x = /%/.test(x) ? width * parseFloat(x) /100 : parseFloat(x);
			if (typeof(y) !== 'undefined') {
				y = /%/.test(y) ? height * parseFloat(y) /100 : parseFloat(y);
			}
			
			// Apply the property
			if (property) { //Moz, WebKit, Opera
				if (!y && y !== 0) {
					this.$elem.css(property + '-origin', x + 'px');
				} else {
					this.$elem.css(property + '-origin', x + 'px ' + y + 'px');
				}
			}
			
			// remember the transform origin
			if (!y && y !== 0) {
				this.setAttr('origin', x);
			} else {
				this.setAttr('origin', [x, y]);
			}
			return true;
		},
		
		/**
		 * Try to determine which browser we're in by the existence of a
		 * 	custom transform property
		 * @param void
		 * @return String
		 */
		getTransformProperty: function() {
			if (this.transformProperty) {
				return this.transformProperty;
			}
			var elem = this.$elem[0];
			var transformProperty;
			var property = {
				transform : 'transform',
				MozTransform : '-moz-transform',
				WebkitTransform : '-webkit-transform',
				OTransform : '-o-transform'
			};
			for (var p in property) {
				if (typeof elem.style[p] != 'undefined') {
					transformProperty = property[p];
					return transformProperty;
				}
			}
			// Default to transform also
			return null;
		},
		
		/**
		 * Create a function suitable for a CSS value
		 * @param string func
		 * @param Mixed value
		 */
		createTransformFunc: function(func, value) {
			//Let's fake reflection
			if ($.transform.rfunc.reflect.test(func) && value) {
				var matrix = $.matrix[func](),
					a = matrix.e(1,1),
					b = matrix.e(2,1),
					c = matrix.e(1,2),
					d = matrix.e(2,2);
				return 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', 0, 0)';
			}
			
			value = _correctUnits(func, value);
			
			if  (!$.isArray(value)) {
				return func + '(' + value + ')';
			} else {
				return func + '(' + value[0] + ', ' + value[1] + ')';
			}
		},
		
		/**
		 * @param Matrix matrix
		 * @param Number tx
		 * @param Number ty
		 */
		fixPosition: function(matrix, tx, ty) {
			// now we need to fix it!
			var height = this.safeOuterHeight(),
				width = this.safeOuterWidth(),
				calc = new $.matrix.calc(matrix, height, width),
				origin = this.getAttr('origin', true);
			
			// translate a 0, 0 origin to the current origin
			var offset = calc.originOffset({
				x: parseFloat(origin[0]),
				y: parseFloat(origin[1])
			});
			
			// IE glues the top-most and left-most pixels of the transformed object to top/left of the original object
			var sides = calc.sides();

			// Protect against an item that is already positioned
			var cssPosition = this.$elem.css('position');
			if (cssPosition == 'static') {
				cssPosition = 'relative';
			}
			
			//TODO: if the element is already positioned, we should attempt to respect it (somehow)
			var pos = {top: 0, left: 0};
			
			// Approximates transform-origin, tx, and ty
			var css = {
				'position': cssPosition,
				'top': (offset.top + ty + sides.top + pos.top) + 'px',
				'left': (offset.left + tx + sides.left + pos.left) + 'px'
			};
			this.$elem.css(css);
		},
		
		/**
		 * @param void
		 * @return Number
		 */
		safeOuterHeight: function() {
			return this.safeOuterLength('Height');
		},
		
		/**
		 * @param void
		 * @return Number
		 */
		safeOuterWidth: function() {
			return this.safeOuterLength('Width');
		},
		
		/**
		 * Returns
		 * @param String dim Height or Width
		 * @return Number
		 */
		safeOuterLength: function(dim) {
			var func = 'outer' + (dim.toLowerCase() == 'width' ? 'Width' : 'Height');
			if ($.browser.msie) {
				// TODO: it'd be nice if there were a reliable way to remember this and not have it get stale
				var elem = this.$elem[0];
				// remember the originals
				var style = elem.style.filter;
					
				// clear the filter
				elem.style.filter = '';
				
				// pull out the pixel values
				var length = this.$elem[func]();
				
				// undo our mess
				elem.style.filter = style;
				
				// Tell the world
				return length;
			}
			return this.$elem[func]();
		},
		
		/**
		 * Clears out all of the custom attributed
		 * @param void
		 */
		clearAttrs: function() {
			$.each($.transform.funcs, $.proxy(function (i, func) {
				if (this.$elem[0][func] !== undefined) {
					this.$elem[0][func] = undefined;
				}
			}, this));
		},
		
		/**
		 * @param Object funcs a list of transform functions to store on this element
		 * @return void
		 */
		setAttrs: function(funcs) {
			$.each(funcs, $.proxy(this.setAttr, this));
		},
		
		/**
		 * @param string func name of a transform function
		 * @param mixed value with proper units
		 * @return void
		 */
		setAttr: function(func, value) {
			//TODO: since we're stripping units, we need to normalize on deg and px
			//TODO: I'm pretty sure there's no longer a need to strip units
			if ($.isArray(value)) {
				$.each(value, function(i){value[i] = parseFloat(value[i]);});
				value = value.join(' ');
			} else if (value || value === 0) {
				value = parseFloat(value);
			}
			
			//TODO: does this still need to be unitless since we've
			//	hacked animate to pieces?
			this.$elem[0][func] = value; //should be unitless
		},
		
		/**
		 * @param Bool split splits space separated values into an array
		 * @param Bool withUnits
		 * @return Object values with proper units
		 */
		getAttrs: function(split, withUnits) {
			var attrs = {}, value;
			$.each($.transform.funcs, $.proxy(function (i, func) {
				value = this.getAttr(func, split, withUnits, true);
				if (value || value === 0) {
					attrs[func] = value;
				}
			}, this));
			return attrs; //TODO: should it really return proper units?
		},
		
		/**
		 * @param String func 
		 * @param Bool split splits space separated values into an array
		 * @param Bool withUnits
		 * @return value with proper units
		 */
		getAttr: function(func, split, withUnits, preserveNull) {
			//TODO: This function is kind of complicated. PreserveNull
			//	is no longer needed. It should be simplified to always
			//	return the string with the units and damn the
			//	consequences. It's easy enough to split on your own later.
			
			//NOTE: Moz and WebKit always return the value of transform
			//	as a matrix and obscures the individual functions. So
			//	it's impossible to know what was set in the CSS.
			var value = this.$elem[0][func];
			var rspace = /\s/;
			var rperc = /%/;
			
			if (preserveNull && !value && value !== 0){
				return value;
			} else if (!value && value !== 0) {
				if (func == 'origin') {
					value = this.transformProperty ? this.$elem.css(this.transformProperty + '-origin') : (this.safeOuterWidth() * 0.5) + ' ' + (this.safeOuterHeight() * 0.5);
					
					//Moz reports the value in % if there hasn't been a transformation yet
					if (rperc.test(value)) {
						value = value.split(rspace);
						if (rperc.test(value[0])) {
							value[0] = this.safeOuterWidth() * (parseFloat(value[0])/100);
						}
						if (rperc.test(value[1])) {
							value[1] = this.safeOuterHeight() * (parseFloat(value[1])/100);
						}
						value = value.join(' ');
					}
					
					value = value.replace(/px/g, ''); // strip units, because
				} else {
					value = $.transform.rfunc.scale.test(func) ? 1 : 0;
				}
			}
			if (withUnits) {
				// we have to split to correct units
				if (rspace.test(value)) {
					value = value.split(rspace);
				}
				
				// Correct the units
				value = _correctUnits(func, value);
				if ($.isArray() && !split) {
					value = value.join(' ');
				}
			} else if (split && rspace.test(value)) {
				value = value.split(rspace);
			}
			return value;
		}
	};
	
	/**
	 * Ensure that values have the appropriate units on them
	 * @param string func
	 * @param Mixed value
	 */
	var rfxnum = /^([+\-]=)?([\d+.\-]+)(.*)$/;
	function _correctUnits(func, value) {
		var result = !$.isArray(value)? [value] : [value[0], value[1]],
			rangle = $.transform.rfunc.angle,
			rlength = $.transform.rfunc.length;
		
		for (var i = 0, len = result.length; i < len; i++) {
			var parts = rfxnum.exec(result[i]),
				unit = '';
			
			// Use an appropriate unit
			if (rangle.test(func)) {
				unit = 'deg';
				
				// remove nonsense units
				if (parts[3] && !$.angle.runit.test(parts[3])) {
					parts[3] = null;
				}
			} else if (rlength.test(func)) {
				unit = 'px';
			}
			
			// ensure a value and appropriate unit
			if (!parts) {
				result[i] = 0 + unit;
			} else if(!parts[3]) {
				result[i] += unit;
			}
			
		}
		return len == 1 ? result[0] : result;
	}
})(jQuery, this, this.document);


///////////////////////////////////////////////////////
// Matrix
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * Matrix object for creating matrices relevant for 2d Transformations
	 * @var Object
	 */
	$.extend({
		matrix: {}
	});
	
	$.extend( $.matrix, {
		/**
		 * Class for calculating coordinates on a matrix
		 * @param Matrix matrix
		 * @param Number outerHeight
		 * @param Number outerWidth
		 * @class
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
		},
		
		/**
		 * Reflect (same as rotate(180))
		 * @returm Matrix
		 */
		reflect: function() {
			return $M([
			  [-1,  0, 0],
			  [ 0, -1, 0],
			  [ 0,  0, 1]
			]);
		},
		
		/**
		 * Reflect across the x-axis (mirrored upside down)
		 * @returm Matrix
		 */
		reflectX: function() {	
			return $M([
			  [1,  0, 0],
			  [0, -1, 0],
			  [0,  0, 1]
			]);
		},
		
		/**
		 * Reflect by swapping x an y (same as reflectX + rotate(-90))
		 * @returm Matrix
		 */
		reflectXY: function() {
			return $M([
			  [0, 1, 0],
			  [1, 0, 0],
			  [0, 0, 1]
			]);
		},
		
		/**
		 * Reflect across the y-axis (mirrored)
		 * @returm Matrix
		 */
		reflectY: function() {
			return $M([
			  [-1, 0, 0],
			  [ 0, 1, 0],
			  [ 0, 0, 1]
			]);
		},
		
		/**
		 * Rotates around the origin
		 * @param Number deg
		 * @returm Matrix
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
				
			return $M([
			  [a, c, 0],
			  [b, d, 0],
			  [0, 0, 1]
			]);
		
		},
		
		/**
		 * Scale
		 * @param Number sx
		 * @param Number sy
		 * @returm Matrix
		 */
		scale: function (sx, sy) {
			sx = sx || sx === 0 ? sx : 1;
			sy = sy || sy === 0 ? sy : 1;
			return $M([
			  [sx, 0,  0],
			  [0,  sy, 0],
			  [0,  0,  1]
			]);
		},
		
		/**
		 * Scale on the X-axis
		 * @param Number sx
		 * @returm Matrix
		 */
		scaleX: function (sx) {
			return $.matrix.scale(sx);
		},
		
		/**
		 * Scale on the Y-axis
		 * @param Number sy
		 * @returm Matrix
		 */
		scaleY: function (sy) {
			return $.matrix.scale(1, sy);
		},
		
		/**
		 * Skews on the X-axis and Y-axis
		 * @param Number degX
		 * @param Number degY
		 * @returm Matrix
		 */
		skew: function (degX, degY) {
			//TODO: detect units
			var radX = $.angle.degreeToRadian(degX),
				radY = $.angle.degreeToRadian(degY),
				x = Math.tan(radX),
				y = Math.tan(radY);
			
			return $M([
			  [1, x, 0],
			  [y, 1, 0],
			  [0, 0, 1]
			]);
		},
		
		/**
		 * Skews on the X-axis
		 * @param Number deg
		 * @returm Matrix
		 */
		skewX: function (deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				x = Math.tan(rad);
			
			return $M([
			  [1, x, 0],
			  [0, 1, 0],
			  [0, 0, 1]
			]);
			
		},
		
		/**
		 * Skews on the Y-axis
		 * @param Number deg
		 * @returm Matrix
		 */
		skewY: function (deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				y = Math.tan(rad);
			
			return $M([
			  [1, 0, 0],
			  [y, 1, 0],
			  [0, 0, 1]
			]);
			
		},
		
		/**
		 * Offset for the transformation
		 * @param Number tx in pixels
		 * @param Number ty in pixels
		 * @returm Matrix
		 */
		translate: function (tx, ty) {
			tx = tx ? tx : 0;
			ty = ty ? ty : 0;
			
			return $M([
			  [1, 0, tx],
			  [0, 1, ty],
			  [0, 0, 1]
			]);
		},
		
		/**
		 * Offset on the X-axis
		 * @param Number tx in pixels
		 * @returm Matrix
		 */
		translateX: function (tx) {
			return $.matrix.translate(tx);
		},
		
		/**
		 * Offset on the Y-axis
		 * @param Number ty in pixels
		 * @returm Matrix
		 */
		translateY: function (ty) {
			return $.matrix.translate(0, ty);
		}
	});
	
	$.matrix.calc.prototype = {
		/**
		 * Calculate a coord on the new object
		 * @return Object
		 */
		coord: function(x, y) {
			var matrix = this.matrix,
				coord = matrix.x($M([[x], [y], [1]]));
				
			return {
				x: parseFloat(parseFloat(coord.e(1, 1)).toFixed(8)),
				y: parseFloat(parseFloat(coord.e(2, 1)).toFixed(8))
			};
		},
		
		/**
		 * Calculate the corners of the new object
		 * @return Object
		 */
		corners: function() {
			var y = this.outerHeight,
				x = this.outerWidth;
					
			return {
				tl: this.coord(0, 0),
				bl: this.coord(0, y),
				tr: this.coord(x, 0),
				br: this.coord(x, y)
			};
		},
		
		/**
		 * Calculate the dimensions of the new object
		 * @return Object
		 */
		sides: function() {
			// The corners of the box
			var corners = this.corners();
			
			// create empty dimensions
			var sides = {
				top: 0,
				bottom: 0,
				left: 0,
				right: 0
			}, x, y;
			
			// Find the extreme corners
			for (var pos in corners) {
				// Transform the coords
				x = corners[pos].x;
				y = corners[pos].y;
				
				// Record the extreme corners
				if (y < sides.top) {
					sides.top = y;
				}
				if (y > sides.bottom) {
					sides.bottom = y;
				}
				if (x < sides.left) {
					sides.left = x;
				}
				if (x > sides.right) {
					sides.right = x;
				}
			}
			
			return sides;
		},
		
		/**
		 * Calculate the size of the new object
		 * @return Object
		 */
		size: function() {
			var sides = this.sides();
			
			// return size
			return {
				height: Math.abs(sides.bottom - sides.top), 
				width: Math.abs(sides.right - sides.left)
			};
		},
		
		/**
		 * Calculate a proper top and left for IE
		 * @param Object toOrigin
		 * @param Object fromOrigin
		 * @return Object
		 */
		originOffset: function(toOrigin, fromOrigin) {
			// the origin to translate to
			toOrigin = toOrigin ? toOrigin : {
				x: this.outerWidth * 0.5,
				y: this.outerHeight * 0.5
			};
			
			// the origin to translate from (IE has a fixed origin of 0, 0)
			fromOrigin = fromOrigin ? fromOrigin : {
				x: 0,
				y: 0
			};
			
			// transform the origins
			var toCenter = this.coord(toOrigin.x, toOrigin.y);
			var fromCenter = this.coord(fromOrigin.x, fromOrigin.y);
			
			// return the offset
			return {
				top: (fromCenter.y - fromOrigin.y) - (toCenter.y - toOrigin.y),
				left: (fromCenter.x - fromOrigin.x) - (toCenter.x - toOrigin.x)
			};
		}
	};
})(jQuery, this, this.document);

///////////////////////////////////////////////////////
// Animation
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	// Extend the jQuery animation to handle transform functions
	/**
	 * @var Regex looks for units on a string
	 */
	var rfxnum = /^([+\-]=)?([\d+.\-]+)(.*)$/;
	
	/**
	 * @var Regex identify if additional values are hidden in the unit 
	 */
	var rfxmultinum = /^(.*?)\s+([+\-]=)?([\d+.\-]+)(.*)$/;
	
	/**
	 * Doctors prop values in the event that they contain spaces
	 * @param Object prop
	 * @param String speed
	 * @param String easing
	 * @param Function callback
	 * @return bool
	 */
	var _animate = $.fn.animate;
	$.fn.animate = function( prop, speed, easing, callback ) {
		//NOTE: The $.fn.animate() function is a big jerk and requires
		//		you to attempt to convert the values passed into pixels.
		//		So we have to doctor the values passed in here to make
		//		sure $.fn.animate() won't think there's units an ruin
		//		our fun.
		if (prop && !jQuery.isEmptyObject(prop)) {
			var $elem = this;
			jQuery.each( prop, function( name, val ) {
				// Clean up the numbers for space-sperated prop values
				if ($.inArray($.transform.funcs, name)) {
					var parts = rfxnum.exec(val);
					if (parts) {
						var end = parseFloat( parts[2] ),
							unit = parts[3] || "px",
							values = [];
							
						// Remember the first value
						values.push({
							end: (parts[1] ? parts[1] : '') + end,
							unit: unit
						});
						
						// Detect additional values hidden in the unit
						var i = 0;
						while (parts = rfxmultinum.exec(unit)) {
							// Fix the previous unit
							values[i].unit = parts[1];
							
							// Remember this value
							values.push({
								end: (parts[2] ? parts[2] : '') + parseFloat(parts[3]),
								unit: parts[4]
							});
							unit = parts[4];
							i++;
						}
						
						// Save the values and truncate the value to make it safe to animate
						$elem.each(function(){this['data-animate-' + name] = values;});
						prop[name] = values[0].end;
					}
				}
			});
		}
		return _animate.apply(this, arguments);
	};
	
	/**
	 * Returns appropriate start value for transform props
	 * @param Boolean force
	 * @return Number
	 */
	var _cur = $.fx.prototype.cur;
	$.fx.prototype.cur = function(force) {
		//NOTE: The cur function tries to look things up on the element
		//		itself as a native property first instead of as a style
		//		property. However, the animate function is a big jerk
		//		and it's extremely easy to poison the element.style 
		//		with a random property and ruin all of the fun. So, it's
		//		easier to just look it up ourselves.
		if ($.inArray($.transform.funcs, this.prop)) {
			this.transform = this.transform || new $.transform(this.elem);
			
			// return a single unitless number and animation will play nice
			var parts = rfxnum.exec(this.transform.getAttr(this.prop));
			return parseFloat(parts[2]) || 0;
		}
		return _cur.apply(this, arguments);			
	};
	
	/**
	 * Detects the existence of a space separated value
	 * @param Object fx
	 * @return null
	 */
	$.fx.multivalueInit = function(fx) {
		var parts,
			values = fx.transform.getAttr(fx.prop, true),
			initValues = fx.elem['data-animate-' + fx.prop];
		
		fx.values = [];
		
		// Handle the additional values if they exist
		if (initValues) {
			var start;
			$.each(initValues, function(i, val) {
				start = values[i];
				if (!start && start !== 0) {
					start = $.transform.rfunc.scale.test(fx.prop) ? 1 : 0;
				}
				start = parseFloat(start);
				if (parts = rfxnum.exec(val.end)) {
					if (parts[1]) {
						val.end = ((parts[1] === "-=" ? -1 : 1) * parseFloat(parts[2])) + start;
					}
				}
				fx.values.push({
					start: start,
					end: val.end,
					unit: val.unit
				});
			});
		} else {
			// Save the known value
			fx.values.push({
				start: fx.start,
				end: fx.end,
				unit: fx.unit
			});
		}
	};

	/**
	 * Animates a multi value attribute
	 * @param Object fx
	 * @return null
	 */
	$.fx.multivalueStep = {
		_default: function(fx) {
			$.each(fx.values, function(i, val) {
				fx.values[i].now = val.start + ((val.end - val.start) * fx.pos);
			});
		}
	};
	
	/**
	 * Step for animating tranformations
	 */
	$.each($.transform.funcs, function(i, func) {
		$.fx.step[func] = function(fx) {
			// Initialize the transformation
			if (!fx.transformInit) {
				fx.transform = fx.transform || new $.transform(fx.elem);
				
				// Correct for start being NaN
				// TODO: this probaly isn't needed anymore
				if (isNaN(fx.start)) {
					fx.start = fx.transform.getAttr(fx.prop, true);
					if ($.isArray(fx.start)) {
						fx.start = fx.start[0];
					}
					fx.now = fx.start + ((fx.end - fx.start) * fx.pos);
				}
				
				// Handle multiple values
				$.fx.multivalueInit(fx);
				if (fx.values.length > 1) {
					fx.multiple = true;
				}
				
				// Force degrees for angles, Remove units for unitless
				var r = $.transform.rfunc;
				if (r.angle.test(fx.prop)) {
					fx.unit = 'deg';
				} else if (r.scale.test(fx.prop)) {
					fx.unit = '';
				} else if (r.reflect.test(fx.prop)) {
					fx.unit = ''; //this is a boolean func
				}
				
				// Force all units on multiple values to be the same
				$.each(fx.values, function(i) {fx.values[i].unit = fx.unit;});
				
				fx.transformInit = true;
				
				// if start and end are the same then skip this whole mess
				if (fx.start == fx.end) {
					return fx.step(true);
				}
			}
			
			// Increment all of the values
			if (fx.multiple) {
				($.fx.multivalueStep[fx.prop] || $.fx.multivalueStep._default)(fx);
			} else {
				fx.values[0].now = fx.now;
			}
			
			var values = [];
			
			// Do some value correction and join the values
			$.each(fx.values, function(i, value) {
				// Keep angles below 360 in either direction.
				if (value.unit == 'deg') {
					while (value.now >= 360 ) {
						value.now -= 360;
					}
					while (value.now <= -360 ) {
						value.now += 360;
					}
				}
				
				//Pretty up the final value (use the double parseFloat
				//	to correct super small decimals)
				values.push(parseFloat(parseFloat(value.now).toFixed(8)) + value.unit);
			});
			
			// Apply the transformation
			var funcs = {};
			funcs[fx.prop] = fx.multiple ? values : values[0];
			fx.transform.transform(funcs, {preserve: true});
		};
	});
})(jQuery, this, this.document);