(function($, window, document, undefined) {
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
	 * @var Regex identify the matrix filter in IE
	 */
	var rmatrix = /progid:DXImageTransform\.Microsoft\.Matrix\(.*?\)/;
	
	/**
	 * @var Array list of all valid transform functions
	 */
	var transformFuncs = ['rotate', 'scale', 'scaleX', 'scaleY', 'skew', 'skewX', 'skewY', 'translate', 'translateX', 'translateY'];
	
	/**
	 * @param DOMElement elem
	 * @construct
	 */
	var o = window['Transform'] = function(elem) {
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
		
		
		//IE mangles the height and width, let's try to preserve them
		//NOTE: if someone was rude enough to transform it in IE with
		//		CSS then we're kind of screwed
		//NOTE: if someone is rude enough to alter the height or width
		//		then we're also screwed
		if (!this.transformProperty && !this.$elem.data('dims')) {
			this.$elem.data('dims', {
				height: this.$elem.height(),
				width: this.$elem.width(),
				outerHeight: this.$elem.outerHeight(),
				outerWidth: this.$elem.outerWidth(),
				innerHeight: this.$elem.innerHeight(),
				innerWidth: this.$elem.innerWidth()
			});
		}
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

	// Extend the jQuery animation to handle transform functions
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
				if ($.inArray(transformFuncs, name)) {
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
		if ($.inArray(transformFuncs, this.prop)) {
			// Transform saves the previous values on the element itself
			//	space-seperated and without units
			var value = this.elem[this.prop]; 
			if (rfxmultinum.test(value)) {
				value = value.split(/\s/)[0];
			}
			
			// Scale needs to have 1 as the default, all others take 0;
			if (!value && value !== 0) {
				value = unitless.test(this.prop) ? 1 : 0;
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
					start = unitless.test(fx.prop) ? 1 : 0;
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
	$.each(transformFuncs, function(i, func) {
		$.fx.step[func] = function(fx) {
			// Initialize the transformation
			if (!fx.transformInit) {
				fx.transform = new Transform(fx.elem);
				
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
				if (unitAngle.test(fx.prop)) {
					fx.unit = 'deg';
				} else if (unitless.test(fx.prop)) {
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
	}
	
	p.clearAttrs = function() {
		$.each(transformFuncs, $.proxy(function (i, func) {
			if (this.$elem[0][func] !== undefined) {
				this.$elem[0][func] = undefined;
			}
		}, this));
	}
	
	/**
	 * @param Object funcs a list of transform functions to store on this element
	 * @return void
	 */
	p.setAttrs = function(funcs) {
		$.each(funcs, $.proxy(this.setAttr, this));
	}
	
	/**
	 * @param string func name of a transform function
	 * @param mixed value with proper units
	 * @return void
	 */
	p.setAttr = function(func, value) {
		if ($.isArray(value)) {
			$.each(value, function(i){value[i] = parseFloat(value[i]);});
			value = value.join(' ');
		} else if (value || value === 0) {
			value = parseFloat(value);
		}
		this.$elem[0][func] = value; //should be unitless
	}
	
	/**
	 * @param Bool split splits space separated values into an array
	 * @param Bool withUnits
	 * @return Object values with proper units
	 */
	p.getAttrs = function(split, withUnits) {
		var attrs = {}, value;
		$.each(transformFuncs, $.proxy(function (i, func) {
			value = this.getAttr(func, split, withUnits, true);
			if (value || value === 0) {
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
	p.getAttr = function(func, split, withUnits, preserveNull) {
		var value = this.$elem[0][func];
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
	 * Applies all of the transformations as functions
	 * var Object funcs
	 */
	p.applyFuncs = function(funcs, generate) {
		var value = '';
		var property = this.transformProperty;
		
		// construct a CSS string
		for (var func in funcs) {
			// handle origin separately
			if (func == 'origin') {
				this[func].apply(this, $.isArray(funcs[func]) ? funcs[func] : [funcs[func]]);
			} else 	if (this[func]) {
				value += ' ' + this.createTransformFunction(func, funcs[func]);
			}
		}
		
		this.$elem.css(property, value);
		this.$elem.data('transformed', true);
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
				
				// strip the units
				$.each(args, function(i, arg) {
					args[i] = parseFloat(arg);
				});
				if (option == 'origin') {
					this[option].apply(this, args);
				} else {
					matrices.push(this[option].apply(this, args));
				}
			}
		}
		
		// calculate the final matrix
		if (!matrices.length) {
			return;
		}
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
			_calculateCorners(this.$elem, matrix);
			this.$elem.css(property, 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', ' + tx + 'px, ' + ty + 'px)');
		} else if (property && !generate) { // -webkit, -o, w3c
			// @see http://www.w3.org/TR/SVG/coords.html#TransformMatrixDefined
			// matrix(m11, m12, m21, m22, tX, tY)
			// NOTE: WebKit and Opera don't allow units on the translate variables
			this.$elem.css(property, 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', ' + tx + ', ' + ty + ')');
		} else if (jQuery.browser.msie || generate) { // IE
			// IE does not allow the transform origin to be set directly
			var origin = { // all browsers default to 50%/50%
				x: parseFloat(_convertWidthToPx(this.$elem[0], '50%')),
				y: parseFloat(_convertHeightToPx(this.$elem[0], '50%'))
			}
			
			var transformOrigin = this.$elem.data('transformOrigin');
			if (transformOrigin && typeof(transformOrigin.x) !== 'undefined') {
				origin.x = parseFloat(transformOrigin.x);
			}
			if (transformOrigin && typeof(transformOrigin.y) !== 'undefined') {
				origin.y = parseFloat(transformOrigin.y);
			}
			var offset = _calculateOriginOffset(this.$elem, matrix, origin);
			
			// IE glues the top-most and left-most pixels of the transformed object to top/left of the original object
			var dims = _calculateDims(this.$elem, matrix, true);

			// Protect against an item that is already positioned
			var cssPosition = this.$elem.css('position');
			if (cssPosition == 'static') {
				cssPosition = 'relative';
			}
			//TODO: if the element is already positioned, we should attempt to respect it
			var pos = {top: 0, left: 0};
			
			// IE requires the special transform Filter
			var style = this.$elem[0].style;
			var matrixFilter = 'progid:DXImageTransform.Microsoft.Matrix(M11=' + a + ', M12=' + c + ', M21=' + b + ', M22=' + d + ', sizingMethod=\'auto expand\')';
			var filter = style.filter || jQuery.curCSS( this.$elem[0], "filter" ) || "";
			style.filter = rmatrix.test(filter) ? filter.replace(rmatrix, matrixFilter) : filter ? filter + ' ' + matrixFilter : matrixFilter;
			
			// Approximates transform-origin, tx, and ty
			var css = {
				'position': cssPosition,
				'top': (offset.top + ty + dims.top + pos.top) + 'px',
				'left': (offset.left + tx + dims.left + pos.left) + 'px'
			};
			this.$elem.css(css);
		}
		this.$elem.data('transformed', true);
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
		x = _convertWidthToPx(this.$elem[0], x);
		if (typeof(y) !== 'undefined') {
			y = _convertHeightToPx(this.$elem[0], y);
		}
		
		// Apply the property
		if (property) { //Moz, WebKit, Opera
			if (!y) {
				this.$elem.css(property + '-origin', x);
			} else {
				this.$elem.css(property + '-origin', x + ' ' + y);
			}
		}
		
		// remember the transform origin in an easy place (IE needs this)
		if (!y) {
			this.$elem.data('transformOrigin', {x: x});
		} else {
			this.$elem.data('transformOrigin', {x: x, y: y});
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
	 * Try to determine which browser we're in by the existence of a
	 * 	custom transform property
	 * @param void
	 * @return String
	 */
	p.getTransformProperty = function() {
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
	}
	
	/**
	 * Create a function suitable for a CSS value
	 * @param string funcName
	 * @param Mixed value
	 */
	p.createTransformFunction = function(funcName, value) {
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
	 * @param jQuery Collection $elem
	 * @param Matrix matrix
	 * @param boolean outer
	 * @return Object
	 */
	function _calculateCorners($elem, matrix, outer) {
		// get the original coords
		if (outer) {
			var y = $elem.data('dims').outerHeight || $elem.outerHeight(),
				x = $elem.data('dims').outerWidth || $elem.outerWidth();
		} else {
			var y = $elem.data('dims').height || $elem.height(),
				x = $elem.data('dims').width || $elem.width();
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
	 * @param jQuery Collection $elem
	 * @param Matrix matrix
	 * @param boolean outer
	 * @return Object
	 */
	function _calculateDims($elem, matrix, outer) {
		//NOTE: Are these called sides? This should probably be calculateSides
		// The corners of the box
		var corners = _calculateCorners($elem, matrix, outer);
		
		// create empty dimensions
		var dims = {
			top: 0,
			bottom: 0,
			left: 0,
			right: 0
		};
		
		// Find the extreme corners
		for (var pos in corners) {
			// Transform the coords
			var corner = corners[pos];
			var x = corner.x,
				y = corner.y;
			
			// Record the extreme corners
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
	 * @param jQuery Collection $elem
	 * @param Matrix matrix
	 * @return Object
	 */
	function _calculateSize($elem, matrix){
		var dims = _calculateDims($elem, matrix);
		
		// return size
		return {
			height: Math.abs(dims.bottom - dims.top), 
			width: Math.abs(dims.right - dims.left)
		};
	}
	
	/**
	 * Calculate a proper top and left for IE
	 * @param jQuery Collection $elem
	 * @param Matrix matrix
	 * @param Object toOrigin
	 * @param Object fromOrigin
	 * @return Object
	 */
	function _calculateOriginOffset($elem, matrix, toOrigin, fromOrigin) {
		// the origin to translate to
		toOrigin = toOrigin ? toOrigin : {
			x: parseFloat(_convertWidthToPx($elem[0], '50%')),
			y: parseFloat(_convertHeightToPx($elem[0], '50%'))
		};
		
		// the origin to translate from (IE has a fixed origin of 0, 0)
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
	function _convertWidthToPx(elem, length, inside) {
		return _convertLengthToPx(elem, length, inside, 'x');
	}

	/**
	 * @param DOMElement el
	 * @param string length with attached units
	 * @param boolean inside measure inside the element instead of outside
	 */
	function _convertHeightToPx(elem, length, inside) {
		return _convertLengthToPx(elem, length, inside, 'y');
	}

	/**
	 * Convert a length unit into pixels
	 * @param DOMElement el
	 * @param string length with attached units
	 * @param boolean inside measure inside the element instead of outside
	 * @param string axis
	 */
	function _convertLengthToPx(elem, length, inside, axis) {
		var $elem = $(elem);
		// make sure we've provided a unit
		if (rnumUnitless.test(length)) {
			return length + 'px';
		}
		
		// percentages are easy
		if (rnumPercent.test(length)) {
			var dims = $elem.data('dims');
			switch (axis) {
				case 'y' :
					if (dims) {
						var len = inside ? dims.height : dims.outerHeight;
					} else {
						var len = inside ? $elem.height() : $elem.outerHeight();
					}
					break;
				case 'x' : //no break
				default:
					if (dims) {
						var len = inside ? dims.width : dims.outerWidth;
					} else {
						var len = inside ? $elem.width(): $elem.outerWidth();
					}
					
			}
			return len * (parseFloat(length)/100) + 'px';
		}
		
		// convert all other units into pixels.
		if ( !rnumpx.test( length ) && rnum.test( length ) ) {
			// some lengths are relative to the item itself.
			// I think this is for percentages which is handled above
			if (inside) {
				var div = $elem.append('<div>temporary</div>').find(':last');
				elem = div[0];
			}

			//decide which side to alter (this really only applies to percentages which we handle above)
			var side = axis == 'y' ? 'top' : 'left';
			
			// TODO: there's some duplicated code going on here.
			if (!elem.runtimeStyle && document.defaultView && document.defaultView.getComputedStyle) { // FF, WebKit, Opera
				// remember the originals
				var style = elem.style[side];
				var position = elem.style.position;
				
				// set some new styles
				elem.style[side] = length || 0;
				elem.style.position = 'relative'; // we need to be positioned for Moz to work
				
				// pull out the pixel values
				length = document.defaultView.getComputedStyle(elem, null)[side];
				
				// undo our mess
				elem.style[side] = style;
				elem.style.position = position;
			} else { //IE
				// remember the originals
				var style = elem.style[side];
				var runtimeStyle = elem.runtimeStyle[side];
				
				// set some new styles
				elem.runtimeStyle[side] = elem.currentStyle[side];
				elem.style[side] = length || 0;
				
				// pull out the pixel values
				length = (axis == 'y' ? elem.style.pixelTop : elem.style.pixelLeft) + 'px';
				
				// undo our mess
				elem.style[side] = style;
				elem.runtimeStyle[side] = runtimeStyle;
			}
			
			// remove the div we created
			if (inside) {
				div.remove();
			}
		}
		return length;
	}
})(jQuery, this, this.document);
