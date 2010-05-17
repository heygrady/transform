(function($, window, document, undefined) {
	/**
	 * @var Regex identify the matrix filter in IE
	 */
	var rmatrix = /progid:DXImageTransform\.Microsoft\.Matrix\(.*?\)/;
	
	/**
	 * Class for creating cross-browser transformations
	 * @var Object
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
			 * 	looking it up
			 * @var string
			 */
			this.transformProperty = this.getTransformProperty();
		}
	});
	
	$.extend($.transform, {
		/**
		 * @var Array list of all valid transform functions
		 */
		funcs: ['origin', 'rotate', 'scale', 'scaleX', 'scaleY', 'skew', 'skewX', 'skewY', 'translate', 'translateX', 'translateY'],
		
		rfunc: {
			/**
			 * @var Regex identifies functions that require an angle unit
			 */
			angle: /rotate|skew[X|Y]?/,
			
			/**
			 * @var Regex identifies functions that require a length unit
			 */
			length: /origin|translate[X|Y]?/,
			
			/**
			 * @var Regex identifies functions that do not require a unit
			 */
			scale: /scale[X|Y]?/
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
			
			this.getOrigin();//TODO: remove this line.
			
			// construct a CSS string
			for (var func in funcs) {
				// handle origin separately
				if (func == 'origin') {
					this[func].apply(this, $.isArray(funcs[func]) ? funcs[func] : [funcs[func]]);
				} else 	if ($.inArray($.transform.funcs, func)) {
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
			var matrices = [],
				matrix,
				property = this.transformProperty,
				args;
			
			// collect all the matrices
			for (var func in funcs) {
				if ($.matrix[func]) {
					args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					
					// strip the units
					$.each(args, function(i, arg) {
						args[i] = parseFloat(arg);
					});
					
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
		 * 
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
				case 'center': x = width * .5; break;
			}
			switch (y) {
				case 'top': y = '0'; break;
				case 'bottom': y = height; break;
				case 'center': y = height * .5; break;
			}
	
			// assume all length units are px
			//TODO: handle unit conversion better
			x = parseFloat(x);
			if (typeof(y) !== 'undefined') {
				y = parseFloat(y);
			}
			
			// Apply the property
			if (property) { //Moz, WebKit, Opera
				if (!y && y !== 0) {
					this.$elem.css(property + '-origin', x);
				} else {
					this.$elem.css(property + '-origin', x + ' ' + y);
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
		 * @param Number height
		 * @param Number width
		 * @return Object
		 */
		getOrigin: function(height, width) {
			height = height || this.safeOuterHeight();
			width = width || this.safeOuterWidth();
			
			// IE does not allow the transform origin to be set directly
			var origin = { // all browsers default to 50%/50%
				x: width * .5,
				y: height * .5
			};
			
			// pull the existing origin (if it was already set)
			var transformOrigin = this.getAttr('origin', true);
			if (transformOrigin = this.getAttr('origin', true)) {
				if ($.isArray(transformOrigin)) {
					origin.x = parseFloat(transformOrigin[0]);
					origin.y = parseFloat(transformOrigin[1]);
				} else {
					origin.x = parseFloat(transformOrigin);
				}
			}
			return origin;
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
			}
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
		 * @param string funcName
		 * @param Mixed value
		 */
		createTransformFunc: function(funcName, value) {
			value = _correctUnits(funcName, value);
			if  (!$.isArray(value)) {
				return funcName + '(' + value + ')';
			} else {
				return funcName + '(' + value[0] + ', ' + value[1] + ')';
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
				calc = new $.matrix.calc(matrix, height, width);
			
			var offset = calc.originOffset(this.getOrigin(height, width));
			
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
			if ($.isArray(value)) {
				$.each(value, function(i){value[i] = parseFloat(value[i]);});
				value = value.join(' ');
			} else if (value || value === 0) {
				value = parseFloat(value);
			}
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
			var value = this.$elem[0][func];
			if (preserveNull && !value && value !== 0){
				return value;
			} else if ($.transform.rfunc.scale.test(func) && !value && value !== 0) {
				value = 1; //scale use 1 as the default value
			} else if (!value && value !== 0) {
				value = 0;
			}
			var rspace = /\s/;
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
	 * Ensure that the appropriate values have units on them
	 * @param string funcName
	 * @param Mixed value
	 */
	var rfxnum = /^([+\-]=)?([\d+.\-]+)(.*)$/;
	function _correctUnits(funcName, value) {
		var result = !$.isArray(value)? [value] : [value[0], value[1]];
		
		//TODO: what does jQuery do for units? I may be complicating this.
		for (var i = 0, len = result.length; i < len; i++) {
			var parts = rfxnum.exec(result[i]);
			
			//TODO: we also need to know what units are being used, not just if they're missing
			if ($.transform.rfunc.angle.test(funcName) && (!parts || !parts[3])) {
				result[i] += "deg";
			} else if ($.transform.rfunc.length.test(funcName) && (!parts || !parts[3])) {
				result[i] += "px";
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
		 * Rotates around the origin
		 * @param Number deg
		 * @returm Matrix
		 */
		rotate: function(deg) {
			var rad = degreeToRadian(deg),
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
			return this.scale(sx);
		},
		
		/**
		 * Scale on the Y-axis
		 * @param Number sy
		 * @returm Matrix
		 */
		scaleY: function (sy) {
			return this.scale(1, sy);
		},
		
		/**
		 * Skews on the X-axis and Y-axis
		 * @param Number degX
		 * @param Number degY
		 * @returm Matrix
		 */
		skew: function (degX, degY) {
			var radX = degreeToRadian(degX),
				radY = degreeToRadian(degY),
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
			var rad = degreeToRadian(deg),
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
			var rad = degreeToRadian(deg),
				y = Math.tan(rad);
			
			return $M([
			  [1, 0, 0],
			  [y, 1, 0],
			  [0, 0, 1]
			]);
			
		},
		
		/**
		 * Offset for the transformation
		 * @param Number tx
		 * @param Number ty
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
		 * @param Number sx
		 * @returm Matrix
		 */
		translateX: function (tx) {
			return this.translate(tx);
		},
		
		/**
		 * Offset on the Y-axis
		 * @param Number sy
		 * @returm Matrix
		 */
		translateY: function (ty) {
			return this.translate(0, ty);
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
				x: this.outerWidth * .5,
				y: this.outerHeight * .5
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
			}
		}
	};
	
	/**
	 * Converting a radian to a degree
	 * @const
	 */
	var RAD_DEG = 180/Math.PI;
	
	/**
	 * Converting a degree to a radian
	 * @const
	 */
	var DEG_RAD = (Math.PI/180);
	
	/**
	 * Convert a radian into a degree
	 * @param Number rad
	 * @returm Number
	 */
	function radianToDegree(rad) {
		return rad * RAD_DEG;
	}
	
	/**
	 * Convert a degree into a radian
	 * @param Number deg
	 * @returm Number
	 */
	function degreeToRadian(deg) {
		return deg * DEG_RAD;
	}
	
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
	}
	
	/**
	 * Returns appropriate start value for transform props
	 * @param Boolean force
	 * @return Number
	 */
	var _cur = $.fx.prototype.cur;
	$.fx.prototype.cur = function(force) {
		//NOTE: The cur function tries to look things up on the element
		//		itself as a native property first instead of as a style
		//		property. However, the animate function is a big just
		//		and it's extremely easy to poison the element.style 
		//		with a random property and ruin all of the fun. So, it's
		//		easier to just look it up ourselves.
		if ($.inArray($.transform.funcs, this.prop)) {
			// Transform saves the previous values on the element itself
			//	space-seperated and without units
			var value = this.elem[this.prop]; 
			if (rfxmultinum.test(value)) {
				value = value.split(/\s/)[0];
			}
			
			// Scale needs to have 1 as the default, all others take 0;
			if (!value && value !== 0) {
				value = $.transform.rfunc.scale.test(this.prop) ? 1 : 0;
			}
			return parseFloat(value); // return only the first value
		}
		return _cur.apply(this, arguments);			
	}
	
	/**
	 * Detects the existence of a space separated value
	 * @param Object fx
	 * @return null
	 */
	$.fx.multivalueInit = function(fx) {
		var parts,
			unit = fx.unit,
			values = fx.transform.getAttr(fx.prop, true),
			initValues = fx.elem['data-animate-' + fx.prop];
		
		fx.values = [];
		
		// Handle the additional values if they exist
		if (initValues) {
			var start, parts;
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
	}

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
				fx.transform = new $.transform(fx.elem);
				
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
				if ($.transform.rfunc.angle.test(fx.prop)) {
					fx.unit = 'deg';
				} else if ($.transform.rfunc.scale.test(fx.prop)) {
					fx.unit = '';
				}
				
				// Force all units on multiple values to be the same
				$.each(fx.values, function(i) {fx.values[i].unit = fx.unit});
				
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
		}
	});
})(jQuery, this, this.document);