
///////////////////////////////////////////////////////
// Animation
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * @var Regex looks for units on a string
	 */
	var rfxnum = /^([+\-]=)?([\d+.\-]+)(.*)$/;
	
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
		var optall = jQuery.speed(speed, easing, callback);
		
		// Capture multiple values
		if (!jQuery.isEmptyObject(prop)) {
			jQuery.each( prop, function( name, val ) {
				if ($.cssMultipleValues[name]) {
					if (typeof optall.multiple === 'undefined') {
						optall.multiple = {};
					}
					
					// force the original values onto the optall
					optall.multiple[name] = val.toString();
					
					// reduce to a unitless number
					prop[name] = parseFloat(val);
				}
			} );
		}
		
		//NOTE: we edited prop above to trick animate
		return _animate.apply(this, [arguments[0], optall]);
	};
	
	var _custom = $.fx.prototype.custom;
	$.fx.prototype.custom = function() {
		var multiple = $.cssMultipleValues[this.prop];
		if (multiple) {
			this.values = [];
			
			// Pull out the known values
			var values = this.options.multiple[this.prop],
				currentValues = $(this.elem).css(this.prop),
				defaultValues = $.cssDefault[this.prop] || 0;
			
			// make sure the current css value is an array
			if (!$.isArray(currentValues)) {
				currentValues = [currentValues];
			}
			
			// make sure the new values are an array
			if (!$.isArray(values)) {
				if ($.type(values) === 'string') {
					values = values.split(',');
				} else {
					values = [values];
				}
			}
			
			// make sure we have enough new values
			var length = multiple.length || multiple, i = 0;
			while (values.length < length) {
				values.push(multiple.duplicate ? values[0] : defaultValues[i] || 0);
				i++;
			}
			
			// calculate a start, end and unit for each new value
			var start, parts, end, unit, fx = this;

			$.each(values, function(i, val) {
				// find a sensible start value
				if (currentValues[i]) {
					start = currentValues[i];
				} else if (defaultValues[i] && !multiple.duplicate) {
					start = defaultValues[i];
				} else if (multiple.duplicate) {
					start = currentValues[0];
				} else {
					start = 0;
				}
				start = parseFloat(start);
				
				// parse the value with a regex
				parts = rfxnum.exec(val);
				
				if (parts) {
					// we found a sensible value and unit
					end = parseFloat( parts[2] );
					unit = parts[3] || "px"; //TODO: change to an appropriate default unit
					
					// If a +=/-= token was provided, we're doing a relative animation
					if (parts[1]) {
						end = ((parts[1] === "-=" ? -1 : 1) * end) + start;
					}
				} else {
					// I don't know when this would happen
					end = val;
					unit = ''; 
				}
				
				// Save the values
				fx.values.push({
					start: start,
					end: end,
					unit: unit
				});				
			});
		}
		return _custom.apply(this, arguments);
	};
	
	/**
	 * Animates a multi value attribute
	 * @param Object fx
	 * @return null
	 */
	$.fx.multipleValueStep = {
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
			var transform = fx.elem.transform || new $.transform(fx.elem),
				funcs = {};
			
			if ($.cssMultipleValues[func]) {
				($.fx.multipleValueStep[fx.prop] || $.fx.multipleValueStep._default)(fx);
				funcs[fx.prop] = [];
				$.each(fx.values, function(i, val) {
					funcs[fx.prop].push(val.now);
				});
			} else {
				funcs[fx.prop] = fx.now;
			}
			
			transform.exec(funcs, {preserve: true});
		};
	});
	
	// Support Reflection animation
	$.each(['reflect', 'reflectX', 'reflectXY', 'reflectY'], function(i, func) {
		var _step = $.fx.step[func];
		$.fx.step[func] = function(fx) {
			var transform = fx.elem.transform || new $.transform(fx.elem),
				funcs = {};
				
			if (!fx.initialized) {
				fx.start = 
				fx.initialized = true;
				var values = $.matrix[func]().elements;
				
				$.each(fx.values, function(i) {
					var val;
					switch (i) {
						case 0: val = values[0]; break;
						case 1: val = values[2]; break;
						case 2: val = values[1]; break;
						case 3: val = values[3]; break;
						default: val = 0;
					}
					fx.values[i].end = val;
					fx.initialized = true;
				});
			}
			
			($.fx.multipleValueStep[fx.prop] || $.fx.multipleValueStep._default)(fx);
			funcs.matrix = [];
			$.each(fx.values, function(i, val) {
				funcs.matrix.push(val.now);
			});
			
			transform.exec(funcs, {preserve: true});
		};
	});
})(jQuery, this, this.document);