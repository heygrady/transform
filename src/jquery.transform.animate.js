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
				if ($.inArray(name, $.transform.funcs) != -1) {
					// allow for reflection animation
					if ($.transform.rfunc.reflect.test(name)) {
						var m = val ? $.matrix[name]() : $.matrix.identity(), 
							e = m.elements;
						val = [e[0], e[1], e[2], e[3]]; 
					}
				
					var parts = rfxnum.exec(val);
					
					if ((parts && parts[3]) || $.isArray(val)) {
						// Either a unit was found or an array was passed
						var end, unit, values = [];
						
						if ($.isArray(val)) {
							// An array was passed
							$.each(val, function(i) {
								parts = rfxnum.exec(this);
								end = parseFloat(parts[2]);
								unit = parts[3] || "px";
										
								// Remember value
								values.push({
									end: (parts[1] ? parts[1] : '') + end,
									unit: unit
								});
							});
						} else {
							// A unit was found
							end = parseFloat( parts[2] );
							unit = parts[3] || "px";
								
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
						}
					
						// Save the values and truncate the value to make it safe to animate
						$elem.data('data-animate-' + name, values);
						prop[name] = values[0].end; // NOTE: this propegates into the arguments object
					}
				}
			});
		}
		//NOTE: we edit prop above
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
		if ($.inArray(this.prop, $.transform.funcs) != -1) {
			this.transform = this.transform || this.elem.transform || new $.transform(this.elem);
			var r = $.transform.rfunc;
			
			// return a single unitless number and animation will play nice
			var value = this.transform.getAttr(this.prop),
				parts = rfxnum.exec($.isArray(value) ? value[0] : value);
			if (value === null || parts === null) {
				value = r.scale.test(this.prop) || r.reflect.test(this.prop)  ? 1 : 0;
				parts = [null, null, value];
			}
			return parseFloat(parts[2]);
		}
		return _cur.apply(this, arguments);
	};
	
	/**
	 * Detects the existence of a space separated value
	 * @param Object fx
	 * @return null
	 */
	$.fx.multivalueInit = function(fx) {
		var $elem = $(fx.elem),
			values = fx.transform.getAttr(fx.prop), // existing values
			initValues = $elem.data('data-animate-' + fx.prop); // new values passed into animate
		
		if (initValues) {
			$elem.removeData('data-animate-' + fx.prop); // unremember the saved property
		}
		
		if ($.transform.rfunc.reflect.test(fx.prop)) {
			values = fx.transform.getAttr('matrix');
		}
		
		fx.values = [];
		
		// If we found a previous array but we're only setting one value, we need to set both
		if ($.isArray(values) && !$.isArray(initValues)) {
			initValues = [
				{
					end: parseFloat(fx.end),
					unit: fx.unit
				},
				{
					end: $.transform.rfunc.scale.test(fx.prop) ? 1 : 0,
					unit: fx.unit
				}
			];
		}
		
		// If we altered the values before
		// This happens in the doctored animate function when we pass a unit or multiple values
		if (initValues) {
			var start,
				rscalefunc = $.transform.rfunc.scale,
				parts;
			$.each(initValues, function(i, val) {
				// pull out the start value
				if ($.isArray(values)) {
					start = values[i];
				} else if (i > 0) {
					// scale duplicates the values for x and y
					start = rscalefunc.test(fx.prop) ? values : null;
				} else {
					start = values;
				}
				
				// if we didn't find a start value
				if (!start && start !== 0) {
					start = rscalefunc.test(fx.prop) ? 1 : 0;
				}
				
				// ensure a number
				start = parseFloat(start);
				
				// handle the existence of += and -= prefixes
				parts = rfxnum.exec(val.end);
				if (parts && parts[1]) {
					val.end = ((parts[1] === "-=" ? -1 : 1) * parseFloat(parts[2])) + start;
				}
				
				// Save the values
				fx.values.push({
					start: parseFloat(start),
					end: parseFloat(val.end),
					unit: val.unit
				});
			});
		} else {
			// Save the known value
			fx.values.push({
				start: parseFloat(fx.start),
				end: parseFloat(fx.end), // force a Number
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
				fx.transform = fx.transform || fx.elem.transform || new $.transform(fx.elem);
								
				// Handle multiple values
				$.fx.multivalueInit(fx);
				if (fx.values.length > 1) {
					fx.multiple = true;
				}
				
				// Force degrees for angles, Remove units for unitless
				var r = $.transform.rfunc;
				if (r.angle.test(fx.prop)) {
					//TODO: we should convert from other rational units
					fx.unit = 'deg';
				} else if (r.scale.test(fx.prop)) {
					fx.unit = ''; 
				} else if (r.reflect.test(fx.prop)) {
					//TODO: for animation purposes, this is a matrix and can be animated (although it looks silly)
					fx.unit = ''; //this is a boolean func
				} else if (fx.prop == 'matrix') {
					fx.unit = '';
				}
				//TODO: I guess we already foced length units earlier
				
				// Force all units on multiple values to be the same
				//TODO: we should convert from other rational units
				$.each(fx.values, function(i) {fx.values[i].unit = fx.unit;});
				
				fx.transformInit = true;
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
				// TODO: handle reflection matrices here
				
				//Pretty up the final value (use the double parseFloat
				//	to correct super small decimals)
				values.push(parseFloat(parseFloat(value.now).toFixed(8)) + value.unit);
			});
			
			// Apply the transformation
			var funcs = {},
				prop = $.transform.rfunc.reflect.test(fx.prop) ? 'matrix' : fx.prop;
						
			funcs[prop] = fx.multiple ? values : values[0];
			fx.transform.exec(funcs, {preserve: true});
		};
	});
})(jQuery, this, this.document);