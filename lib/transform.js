(function($) {
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
	 * @var Regex identifies functions that require an angle unit
	 */
	var unitAngle = /rotate|skew[X|Y]?/;
	
	/**
	 * @var Regex identifies functions that require a length unit
	 */
	var unitLength = /translate[X|Y]?/;
	
	/**
	 * @var Regex identifies functions that require a length unit
	 */
	var unitless = /scale[X|Y]?/;

	/**
	 * @var Regex looks for units on a string
	 */
	var rfxnum = /^([+\-]=)?([\d+.\-]+)(.*)$/;
	
	/**
	 * @var Regex identify if additional values are hidden in the unit 
	 */
	var rfxmultinum = /^(.*?)\s+([+\-]=)?([\d+.\-]+)(.*)$/;
	
	/**
	 * @var Array list of all valid transform functions
	 */
	var transformFuncs = ['rotate', 'scale', 'scaleX', 'scaleY', 'skew', 'skewX', 'skewY', 'translate', 'translateX', 'translateY'];
	
	/**
	 * @param DOMElement | jQueryElement element
	 * @construct
	 */
	var o = window['Transform'] = function(element) {
		/**
		 * The element we're working with
		 * @var jQueryCollection
		 */
		this.element = $(element);
		
		/**
		 * Remember the transform property so we don't have to keep looking it up
		 * @var string
		 */
		this.transformProperty = this._getTransformProperty();
		
		// fix the attributes for the thingy
		//TODO: this should be done before an animation is run
		//TODO: this should be part of the set attributes thing
		//this.setAttributes({});
	},
	p = o.prototype;
	
	/**
	 * Create Transform as a jQuery plugin
	 * @param Object funcs
	 * @param Object options
	 */
	jQuery.fn.transform = function(funcs, options) {
		return this.each(function() {
			var t = new o(this);
			if (funcs) {
				t.transform(funcs, options);
			}
		});
	};

	// Extend the jQuery animation to handle transform function
	var _animate = $.fn.animate;
	$.fn.animate = function( prop, speed, easing, callback ) {
		var style = this[0].style;
		jQuery.each( prop, function( name, val ) {
			// clean up the numbers for multivalue properties we care about
			if ($.inArray(transformFuncs, name)) {
				console.log(style[name] === undefined);
			}
		});
		return _animate.apply(this, arguments);
	}
	
	/**
	 * Detects the existence of a space separated value
	 * @param Boolean force
	 * @return null
	 */
	var _cur = $.fx.prototype.cur;
	$.fx.prototype.cur = function(force) {
		if ($.inArray(transformFuncs, this.prop)) {
			var value = this.elem[this.prop];
			if (rfxmultinum.test(value)) {
				value = value.split(/\s/)[0];
			}
			if (!value && value !== 0) {
				value = unitless.test(this.prop) ? 1 : 0;
			}
			return parseFloat(value);
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
			i = 0,
			values = fx.transform.getAttribute(fx.prop, true);
		
		// Save the known value
		fx.values = [];
		fx.values.push({
			start: fx.start,
			end: fx.end,
			unit: fx.unit
		});
		
		// Detect additional values hidden in the unit
		while (parts = rfxmultinum.exec(unit)) {
			// fix the previous unit
			fx.values[fx.values.length - 1].unit = parts[1];
			var start = values[i];
			if (unitless.test(fx.prop) && !start && start !== 0) {
				start = 1;
			} else if (!start && start !== 0) {
				start = 0;
			}
			fx.values.push({
				start: parseFloat(start),
				end: parseFloat(parts[3]),
				unit: parts[4]
			});
			if (parts[2]) {
				var value = fx.values[fx.values.length - 1];
				value.end = ((parts[2] === "-=" ? -1 : 1) * value.end) + value.start;
			}
			unit = parts[4];
		}
	}

	/**
	 * Animates a multi value attribute
	 * @param Object fx
	 * @return null
	 */
	$.fx.multivalueStep = {
		_default: function(fx) {
			$.each(fx.values, function(i, value) {
				fx.values[i].now = value.start + ((value.end - value.start) * fx.pos);
			});
		}
	};
	
	$.each(transformFuncs, function(i, attr) {
		$.fx.step[attr] = function(fx) {
			// Initialize the transformation
			if (!fx.transformInit) {
				console.log(fx.options.curAnim);
				fx.transform = new Transform(fx.elem);
				
				// Correct for start being NaN
				if (isNaN(fx.start)) {
					fx.start = fx.transform.getAttribute(fx.prop, true);
					if ($.isArray(fx.start)) {
						fx.start = fx.start[0];
					}
					//var end = fx.end;
					//if (/\s/.test(fx.end)) {
					//	end = fx.end.split(/\s/)[0];
					//}
					fx.now = fx.start + ((fx.end - fx.start) * fx.pos);
				}
				
				// Handle multiple values
				$.fx.multivalueInit(fx);
				if (fx.values.length > 1) {
					fx.multiple = true;
				}
				
				// Force degrees for angles, Remove units for unitless
				if (unitAngle.test(fx.prop)) {
					fx.unit = 'deg';
				} else if (unitless.test(fx.prop)) {
					fx.unit = '';
				}
				
				// Force all units on multiple values to be the same
				$.each(fx.values, function(i) {fx.values[i].unit = fx.unit});
				
				fx.transformInit = true;
				if (fx.start == fx.end) {
					fx.step(true);
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
				
				//Pretty up the final value (use the double parseFloat to correct super small decimals)
				values.push(parseFloat(parseFloat(value.now).toFixed(8)) + value.unit);
			});
			
			// Apply the transformation
			var funcs = {};
			funcs[fx.prop] = fx.multiple ? values : values[0];
			fx.transform.transform(funcs, {preserve: true});
		}
	});
	
	
	/**
	 * Applies all of the transformations
	 * @param Object funcs
	 * @param Object options
	 * 		forceMatrix: uses the matrix in all browsers
	 * 		preserve: tries to preserve the values from previous runs
	 */
	p.transform = function(funcs, options) {
		// determine if the CSS property is known 
		var property = this.transformProperty;

		// extend options
		options = $.extend(true, {
			forceMatrix: false,
			preserve: false
		}, options);

		// preserve the funcs from the previous run
		var prevFuncs = this.getAttributes(true, true);
		if (options.preserve && prevFuncs) {
			funcs = $.extend(true, prevFuncs, funcs);
		} else {
			funcs = $.extend(true, {}, funcs); // copy the object to prevent weirdness
		}
		
		// remember the funcs
		
		// Record the custom attributes on the element itself (helps out the animator)
		this.setAttributes(funcs);
		
		// apply the funcs
		if (property && !options.forceMatrix) {
			// CSS3 is supported
			return this.applyFunctions(funcs);
		} else if ($.browser.msie || (property && options.forceMatrix)) {
			// Internet Explorer or Forced matrix
			return this.applyMatrix(funcs);
		}
		return false;
	}
	
	/**
	 * @param Object funcs a list of transform functions to store on this element
	 * @return void
	 */
	p.setAttributes = function(funcs) {
		//TODO: this doesn't seem right
		$.each(transformFuncs, $.proxy(function (i, func) {
			var value = funcs[func] || null;
			this.setAttribute(func, value);
		}, this));
	}
	
	/**
	 * @param string func name of a transform function
	 * @param mixed value with proper units
	 * @return void
	 */
	p.setAttribute = function(func, value) {
		if ($.isArray(value)) {
			$.each(value, function(i){value[i] = parseFloat(value[i]);});
			value = value.join(' ');
		} else if (value !== null && value != undefined) {
			value = parseFloat(value);
		}
		this.element[0][func] = value; //should be unitless
	}
	
	/**
	 * @param Bool split splits space separated values into an array
	 * @param Bool withUnits
	 * @return Object values with proper units
	 */
	p.getAttributes = function(split, withUnits) {
		var attrs = {}, value;
		$.each(transformFuncs, $.proxy(function (i, func, split) {
			value = this.getAttribute(func, split, withUnits, true);
			if (value !== null && value !== undefined) {
				attrs[func] = value;
			}
		}, this));
		return attrs; //TODO: should it really return proper units?
	}
	
	/**
	 * @param String func 
	 * @param Bool split splits space separated values into an array
	 * @param Bool withUnits
	 * @return value with proper units
	 */
	p.getAttribute = function(func, split, withUnits, preserveNull) {
		var value = this.element[0][func];
		if (preserveNull && !value && value !== 0){
			return value;
		} else if (unitless.test(func) && !value && value !== 0) {
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
	
	/**
	 * returns the CSS needed to recreate this transformation
	 * TODO: remove this function.
	 */
	p.generateCSS = function(options) {
		var opts = $.extend(true, {}, options); // default options
		var funcs = this.applyFunctions(opts, true);
		var matrix = this.applyMatrix(opts, true);
		
		var css =
			".transform {\r\n" +
				"\ttransform: " + funcs + ";\r\n" +
				"\t-moz-transform: " + funcs + ";\r\n" +
				"\t-webkit-transform: " + funcs + ";\r\n" +
				"\t-o-transform: " + funcs + ";\r\n" +
				"\tposition: " + matrix.position + "\\9;\r\n" +
				"\ttop: " + matrix.top + "\\9;\r\n" +
				"\tleft: " + matrix.left + "\\9;\r\n" +
				"\tfilter: " + matrix.filter + ";\r\n" +
				"\t-ms-filter: " + matrix['-ms-filter'] + ";\r\n" +
			"}";
		return css;
	};
	
	/**
	 * Applies all of the transformations as functions
	 * var Object options
	 */
	p.applyFunctions = function(options, generate) {
		var value = '';
		var property = this.transformProperty;
		
		// construct a CSS string
		for (var option in options) {
			if (this[option] && option == 'origin') {
				this[option].apply(this, $.isArray(options[option]) ? options[option] : [options[option]]);
				continue;
			}
			if (this[option]) {
				value += ' ' + _createTransformFunction(option, options[option]);
			}
		}
		
		// add the CSS
		if (generate) {
			return value;
		}
		this.element.css(property, value);
		this.element.data('transformed', true);
		return true;
	}
	
	/**
	 * Applies all of the transformations as a matrix
	 * var Object options
	 */
	p.applyMatrix = function(options, generate) {
		var matrices = [];
		var property = this.transformProperty;
		
		// collect all the matrices
		var args;
		for (var option in options) {
			if (this[option]) {
				args = $.isArray(options[option]) ? options[option] : [options[option]];
				$.each(args, function(i, arg) {
					args[i] = parseFloat(arg);
				});
				if (option == 'origin') {
					this[option].apply(this, args);
					continue;
				}
				matrices.push(this[option].apply(this, args));
			}
		}
		
		// calculate the final matrix
		var matrix = this.matrix(matrices);
		// pull out the relevant values
		var a = parseFloat(parseFloat(matrix.e(1,1)).toFixed(8)),
			b = parseFloat(parseFloat(matrix.e(2,1)).toFixed(8)),
			c = parseFloat(parseFloat(matrix.e(1,2)).toFixed(8)),
			d = parseFloat(parseFloat(matrix.e(2,2)).toFixed(8)),
			tx = parseFloat(parseFloat(matrix.e(1,3)).toFixed(8)),
			ty = parseFloat(parseFloat(matrix.e(2,3)).toFixed(8));
		
		//apply the transform to the element
		if (property && property.substr(0, 4) == '-moz' && !generate) { // -moz
			// @see https://developer.mozilla.org/En/CSS/-moz-transform#matrix
			// matrix(a, c, b, d, tx, ty)
			this.element.css(property, 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', ' + tx + 'px, ' + ty + 'px)');
		} else if (property && !generate) { // -webkit, -o, w3c
			// @see http://www.w3.org/TR/SVG/coords.html#TransformMatrixDefined
			// matrix(m11, m12, m21, m22, tX, tY)
			// NOTE: WebKit and Opera don't allow units on the translate variables
			this.element.css(property, 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', ' + tx + ', ' + ty + ')');
		} else if (jQuery.browser.msie || generate) { // IE
			// IE does not allow the transform origin to be set directly
			var origin = { // all browsers default to 50%/50%
				x: parseFloat(_convertWidthToPx(this.element[0], '50%', true)),
				y: parseFloat(_convertHeightToPx(this.element[0], '50%', true))
			}
			var transformOrigin = this.element.data('transformOrigin');
			if (transformOrigin && typeof(transformOrigin.x) !== 'undefined') {
				origin.x = parseFloat(transformOrigin.x);
			}
			if (transformOrigin && typeof(transformOrigin.y) !== 'undefined') {
				origin.y = parseFloat(transformOrigin.y);
			}
			var offset = _calculateOriginOffset(matrix, origin);
			
			// IE glues the top and left of the transformed object to top/left of the original object
			var dims = _calculateDims(this.element, matrix, true);

			// IE requires the special transform Filter
			var filter = 'progid:DXImageTransform.Microsoft.Matrix(M11=' + a + ', M12=' + c + ', M21=' + b + ', M22=' + d + ', sizingMethod=\'auto expand\')';
			
			// Protect against an item that is already positioned
			var cssPosition = this.element.css('position');
			var pos = {top: 0, left: 0};
			if (cssPosition != 'static') {
//				if (!this.element.data('transformed')) {
//					pos = this.element.position();
//				} else {
//					pos = this.element.data('transformOriginalPosition');
//				}
			} else {
				cssPosition = 'relative';
			}
//			if (!this.element.data('transformed')) {
//				this.element.data('transformOriginalPosition', $.extend({}, pos));
//			}

			var css = {
				'position': cssPosition,
				'top': (offset.top + ty + dims.top + pos.top) + 'px',
				'left': (offset.left + tx + dims.left + pos.left) + 'px',
				'filter': filter, // IE6, IE7
				'-ms-filter': filter // IE8+
			};
			// Apply the CSS
			if (generate) {
				return css;
			}
			this.element.css(css);
		}
		this.element.data('transformed', true);
		return true;
	}
	
	/**
	 * 
	 * @param Number x
	 * @param Number y
	 */
	p.origin = function(x, y) {
		var property = this.transformProperty;
		
		// correct for word lengths
		switch (x) {
			case 'left': x = '0'; break;
			case 'right': x = '100%'; break;
			case 'center': x = '50%'; break;
		}
		switch (y) {
			case 'top': y = '0'; break;
			case 'bottom': y = '100%'; break;
			case 'center': y = '50%'; break;
		}

		// convert all length units to px
		x = _convertWidthToPx(this.element[0], x);
		if (typeof(y) !== 'undefined') {
			y = _convertHeightToPx(this.element[0], y);
		}
		
		// Apply the property
		if (property) { //Moz, WebKit, Opera
			if (!y) {
				this.element.css(property + '-origin', x);
			} else {
				this.element.css(property + '-origin', x + ' ' + y);
			}
		}
		
		// remember the transform origin in an easy place (IE needs this)
		if (!y) {
			this.element.data('transformOrigin', {x: x});
		} else {
			this.element.data('transformOrigin', {x: x, y: y});
		}
		return true;
	}
	
	/**
	 * Combine all of the matrices to a final matrix
	 * @param Array matrices
	 * return Matrix
	 */
	 p.matrix = function (matrices) {
		// combine all of the matrices
		var matrix;
		for (var i = 0, len = matrices.length; i < len; i++) {
			if (!matrix) {
				matrix = matrices[i];
			} else {
				matrix = matrix.x(matrices[i]);
			}
		}
		
		return matrix;
	}
	
	/**
	 * Offset for the transformation
	 * @param Number tx
	 * @param Number ty
	 * @returm Matrix
	 */
	p.translate = function (tx, ty) {
		tx = tx ? tx : 0;
		ty = ty ? ty : 0;
		return $M([
		  [1, 0, tx],
		  [0, 1, ty],
		  [0, 0, 1]
		]);
	}
	
	/**
	 * Offset on the X-axis
	 * @param Number sx
	 * @returm Matrix
	 */
	p.translateX = function (tx) {
		return this.translate(tx);
	}
	
	/**
	 * Offset on the Y-axis
	 * @param Number sy
	 * @returm Matrix
	 */
	p.translateY = function (ty) {
		return this.translate(0, ty);
	}
	
	/**
	 * Scale
	 * @param Number sx
	 * @param Number sy
	 * @returm Matrix
	 */
	p.scale = function (sx, sy) {
		sx = sx || sx === 0 ? sx : 1;
		sy = sy || sy === 0 ? sy : 1;
		return $M([
		  [sx, 0,  0],
		  [0,  sy, 0],
		  [0,  0,  1]
		]);
	}
	
	/**
	 * Scale on the X-axis
	 * @param Number sx
	 * @returm Matrix
	 */
	p.scaleX = function (sx) {
		return this.scale(sx);
	}
	
	/**
	 * Scale on the Y-axis
	 * @param Number sy
	 * @returm Matrix
	 */
	p.scaleY = function (sy) {
		return this.scale(1, sy);
	}
	
	/**
	 * Rotates around the origin
	 * @param Number deg
	 * @returm Matrix
	 */
	p.rotate = function (deg) {
		var rad = _degreeToRadian(deg);
		var costheta = parseFloat(Math.cos(rad)).toFixed(8);
		var sintheta = parseFloat(Math.sin(rad)).toFixed(8);
		
		var a = costheta,
			b = sintheta,
			c = -sintheta,
			d = costheta;
			
		return $M([
		  [a, c, 0],
		  [b, d, 0],
		  [0, 0, 1]
		]);
	}
	
	/**
	 * Skews on the X-axis and Y-axis
	 * @param Number degX
	 * @param Number degY
	 * @returm Matrix
	 */
	p.skew = function (degX, degY) {
		var radX = _degreeToRadian(degX);
		var radY = _degreeToRadian(degY);
		
		var x = parseFloat(Math.tan(radX)).toFixed(8),
			y = parseFloat(Math.tan(radY)).toFixed(8);
		
		return $M([
		  [1, x, 0],
		  [y, 1, 0],
		  [0, 0, 1]
		]);
	}
	
	/**
	 * Skews on the X-axis
	 * @param Number deg
	 * @returm Matrix
	 */
	p.skewX = function (deg) {
		var rad = _degreeToRadian(deg);
		
		var x = parseFloat(Math.tan(rad)).toFixed(8);
		
		return $M([
		  [1, x, 0],
		  [0, 1, 0],
		  [0, 0, 1]
		]);
		
	}
	
	/**
	 * Skews on the Y-axis
	 * @param Number deg
	 * @returm Matrix
	 */
	p.skewY = function (deg) {
		var rad = _degreeToRadian(deg);
		
		var y = parseFloat(Math.tan(rad)).toFixed(8);
		
		return $M([
		  [1, 0, 0],
		  [y, 1, 0],
		  [0, 0, 1]
		]);
		
	}
	

	/**
	 * try to determine which browser we're in by the existence of a custom transform property
	 * @param DOMElement el
	 * @return String
	 */
	p._getTransformProperty = function() {
		if (this.transformProperty) {
			return this.transformProperty;
		}
		var el = this.element[0];
		var transformProperty;
		var property = {
			transform : 'transform',
			MozTransform : '-moz-transform',
			WebkitTransform : '-webkit-transform',
			OTransform : '-o-transform'
		}
		for (var p in property) {
			if (typeof el.style[p] != 'undefined') {
				transformProperty = property[p];
				return transformProperty;
			}
		}
		// Default to transform also
		return null;
	}
	
	/**
	 * Create a function suitable for a CSS value
	 * @param string funcName
	 * @param Mixed value
	 */
	function _createTransformFunction(funcName, value) {
		value = _correctUnits(funcName, value);
		if  (!$.isArray(value)) {
			return funcName + '(' + value + ')';
		} else {
			return funcName + '(' + value[0] + ', ' + value[1] + ')';
		}
	}
	
	/**
	 * Ensure that the appropriate values have units on them
	 * @param string funcName
	 * @param Mixed value
	 */
	function _correctUnits(funcName, value) {
		var result = !$.isArray(value)? [value] : [value[0], value[1]];
		
		//TODO: what does jQuery do for units? I may be complicating this.
		for (var i = 0, len = result.length; i < len; i++) {
			var parts = rfxnum.exec(result[i]);
			
			//TODO: we also need to know what units are being used, not just if they're missing
			if (unitAngle.test(funcName) && (!parts || !parts[3])) {
				result[i] += "deg";
			} else if (unitLength.test(funcName) && (!parts || !parts[3])) {
				result[i] += "px";
			}
		}
		return len == 1 ? result[0] : result;
	}
	
	/**
	 * Convert a radian into a degree
	 * @param Number rad
	 * @returm Number
	 */
	function _radianToDegree(rad) {
		return rad * RAD_DEG;
	}
	
	/**
	 * Convert a degree into a radian
	 * @param Number deg
	 * @returm Number
	 */
	function _degreeToRadian(deg) {
		return deg * DEG_RAD;
	}
	
	/**
	 * Calculate the corners of the new object
	 * @param jQuery Collection el
	 * @param Matrix matrix
	 * @param boolean outer
	 * @return Object
	 */
	function _calculateCorners(el, matrix, outer) {
		// get the original coords
		if (outer) {
			var y = el.outerHeight(),
				x = el.outerWidth();
		} else {
			var y = el.height(),
				x = el.width();
		}
		
		// create corners for the original element
		var matrices = {
			tl: matrix.x($M([[0], [0], [1]])),
			bl: matrix.x($M([[0], [y], [1]])),
			tr: matrix.x($M([[x], [0], [1]])),
			br: matrix.x($M([[x], [y], [1]]))
		};
				
		return {
			tl: {
				x: parseFloat(parseFloat(matrices.tl.e(1, 1)).toFixed(8)),
				y: parseFloat(parseFloat(matrices.tl.e(2, 1)).toFixed(8))
			},
			bl: {
				x: parseFloat(parseFloat(matrices.bl.e(1, 1)).toFixed(8)),
				y: parseFloat(parseFloat(matrices.bl.e(2, 1)).toFixed(8))
			},
			tr: {
				x: parseFloat(parseFloat(matrices.tr.e(1, 1)).toFixed(8)),
				y: parseFloat(parseFloat(matrices.tr.e(2, 1)).toFixed(8))
			},
			br: {
				x: parseFloat(parseFloat(matrices.br.e(1, 1)).toFixed(8)),
				y: parseFloat(parseFloat(matrices.br.e(2, 1)).toFixed(8))
			}
		};
	}
	
	/**
	 * Calculate the dimensions of the new object
	 * @param jQuery Collection el
	 * @param Matrix matrix
	 * @param boolean outer
	 * @return Object
	 */
	function _calculateDims(el, matrix, outer) {
		//TODO: This actually calculates the offsets from the original positions
		//NOTE: Are these called sides? This should probably be calculateSides
		// the corners of the box
		var corners = _calculateCorners(el, matrix, outer);
		
		// create empty dimensions
		var dims = {
			top: 0,
			bottom: 0,
			left: 0,
			right: 0
		};
		
		//find the extreme corners
		for (var pos in corners) {
			// transform the coords
			var corner = corners[pos];
			var x = corner.x,
				y = corner.y;
				
			// record the extreme corners
			if (y < dims.top) {
				dims.top = y;
			}
			if (y > dims.bottom) {
				dims.bottom = y;
			}
			if (x < dims.left) {
				dims.left = x;
			}
			if (x > dims.right) {
				dims.right = x;
			}
		}
		
		return dims;
	}
	
	/**
	 * Calculate the size of the new object
	 * @param jQuery Collection el
	 * @param Matrix matrix
	 * @return Object
	 */
	function _calculateSize(el, matrix){
		var dims = _calculateDims(el, matrix);
		
		// return size
		return {
			height: Math.abs(dims.bottom - dims.top), 
			width: Math.abs(dims.right - dims.left)
		};
	}
	
	/**
	 * Calculate a proper top and left for IE
	 * @param Matrix matrix
	 * @param Object toOrigin
	 * @param Object fromOrigin
	 * @return Object
	 */
	function _calculateOriginOffset(matrix, toOrigin, fromOrigin) {
		// the origin to translate to
		//TODO: This default is 50px when it should be 50%
		//NOTE: The other calc functions require the element as the first arg, we could easily do a percentage with that info
		toOrigin = toOrigin ? toOrigin : {
			x: 50,
			y: 50
		};
		
		// the origin to translate from
		fromOrigin = fromOrigin ? fromOrigin : {
			x: 0,
			y: 0
		};
		
		// transform the origins
		var toCenter = matrix.x($M([
			[toOrigin.x],
			[toOrigin.y],
			[1]
		]));
		var fromCenter = matrix.x($M([
			[fromOrigin.x],
			[fromOrigin.y],
			[1]
		]));
		
		// return the offset
		return {
			top: parseFloat(parseFloat((fromCenter.e(2, 1) - fromOrigin.y) - (toCenter.e(2, 1) - toOrigin.y)).toFixed(8)),
			left: parseFloat(parseFloat((fromCenter.e(1, 1) - fromOrigin.x) - (toCenter.e(1, 1) - toOrigin.x)).toFixed(8))
		}
	}
	
	//-----------------------------------
	// Convert units to PX
	//-----------------------------------
	/**
	 * @var regex
	 */
	var rnumpx = /^-?\d+(?:px)?$/i,
		rnum = /^-?\d/,
		rnumUnitless = /^-?\d+$/,
		rnumPercent = /^-?\d+%$/;

	/**
	 * @param DOMElement el
	 * @param string length with attached units
	 * @param boolean inside measure inside the element instead of outside
	 */
	function _convertWidthToPx(el, length, inside) {
		return _convertLengthToPx(el, length, inside, 'x');
	}

	/**
	 * @param DOMElement el
	 * @param string length with attached units
	 * @param boolean inside measure inside the element instead of outside
	 */
	function _convertHeightToPx(el, length, inside) {
		return _convertLengthToPx(el, length, inside, 'y');
	}

	/**
	 * Convert a length unit into pixels
	 * Currently this is only being used for transformOrigin
	 * @param DOMElement el
	 * @param string length with attached units
	 * @param boolean inside measure inside the element instead of outside
	 * @param string axis
	 */
	function _convertLengthToPx(el, length, inside, axis) {
		// make sure we've provided a unit
		if (rnumUnitless.test(length)) {
			return length + 'px';
		}
		
		// percentages are easy
		if (rnumPercent.test(length)) {
			switch (axis) {
				case 'y' : break;
					var height = inside ? $(el).innerHeight(): $(el).outerHeight();
					return height * (parseFloat(length)/100) + 'px';
				case 'x' : //no break
				default:
					var width = inside ? $(el).innerWidth(): $(el).outerWidth();
					return width * (parseFloat(length)/100) + 'px';
			}
		}
		
		// convert all other units into pixels.
		if ( !rnumpx.test( length ) && rnum.test( length ) ) {
			// some lengths are relative to the item itself.
			if (inside) {
				var div = $(el).append('<div>temporary</div>').find(':last');
				el = div[0];
			}

			//decide which side to alter (this really only applies to percentages which we handle above)
			var side = axis == 'y' ? 'top' : 'left';
			
			// TODO: there's some duplicated code going on here.
			if (!el.runtimeStyle && document.defaultView && document.defaultView.getComputedStyle) { // FF, WebKit, Opera
				// remember the originals
				var style = el.style[side];
				var position = el.style.position;
				
				// set some new styles
				el.style[side] = length || 0;
				el.style.position = 'relative'; // we need to be positioned for Moz to work
				
				// pull out the pixel values
				length = document.defaultView.getComputedStyle(el, null)[side];
				
				// undo our mess
				el.style[side] = style;
				el.style.position = position;
			} else { //IE
				// remember the originals
				var style = el.style[side];
				var runtimeStyle = el.runtimeStyle[side];
				
				// set some new styles
				el.runtimeStyle[side] = el.currentStyle[side];
				el.style[side] = length || 0;
				
				// pull out the pixel values
				length = axis == 'y' ? el.style.pixelTop : el.style.pixelLeft + 'px';
				
				// undo our mess
				el.style[side] = style;
				el.runtimeStyle[side] = runtimeStyle;
			}
			
			// remove the dive we created
			if (inside) {
				div.remove();
			}
		}
		return length;
	}
})(jQuery);
