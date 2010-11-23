
///////////////////////////////////////////////////////
// Attr
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	var rfuncvalue = /([\w\-]*?)\((.*?)\)/g, // with values
		attr = 'data-transform',
		rspace = /\s/,
		rcspace = /,\s?/;
	
	$.extend($.transform.prototype, {		
		/**
		 * This overrides all of the attributes
		 * @param Object funcs a list of transform functions to store on this element
		 * @return void
		 */
		setAttrs: function(funcs) {
			var string = '',
				value;
			for (var func in funcs) {
				value = funcs[func];
				if ($.isArray(value)) {
					value = value.join(', ');
				}
				string += ' ' + func + '(' + value + ')'; 
			}
			this.attr = $.trim(string);
			this.$elem.attr(attr, this.attr);
		},
		
		/**
		 * This sets only a specific atribute
		 * @param string func name of a transform function
		 * @param mixed value with proper units
		 * @return void
		 */
		setAttr: function(func, value) {
			// stringify the value
			if ($.isArray(value)) {
				value = value.join(', ');
			}
			
			// pull from a local variable to look it up
			var transform = this.attr || this.$elem.attr(attr);
			if (!transform || transform.indexOf(func) == -1) {
				// we don't have any existing values, save it
				// we don't have this function yet, save it
				this.attr = $.trim(transform + ' ' + func + '(' + value + ')');
				this.$elem.attr(attr, this.attr);
			} else {
				// replace the existing value
				var funcs = [],	parts;
				
				// regex split
				rfuncvalue.lastIndex = 0; // reset the regex pointer
				while (parts = rfuncvalue.exec(transform)) {
					if (func == parts[1]) {
						funcs.push(func + '(' + value + ')');
					} else {
						funcs.push(parts[0]);
					}
				}
				this.attr = funcs.join(' ');
				this.$elem.attr(attr, this.attr);
			}
		},
		
		/**
		 * @return Object
		 */
		getAttrs: function() {
			var transform = this.attr || this.$elem.attr(attr);
			if (!transform) {
				// We don't have any existing values, return empty object
				return {};
			}
			
			// replace the existing value
			var attrs = {}, parts, value;
			
			rfuncvalue.lastIndex = 0; // reset the regex pointer
			while ((parts = rfuncvalue.exec(transform)) !== null) {
				if (parts) {
					value = parts[2].split(rcspace);
					attrs[parts[1]] = value.length == 1 ? value[0] : value;
				}
			}
			return attrs;
		},
		
		/**
		 * @param String func 
		 * @return mixed
		 */
		getAttr: function(func) {
			var attrs = this.getAttrs();
			if (typeof attrs[func] !== 'undefined') {
				return attrs[func];
			}
			
			//TODO: move the origin to a function
			if (func === 'origin' && $.support.csstransforms) {
				// supported browsers return percentages always
				return this.$elem.css(this.transformOriginProperty).split(rspace);
			} else if (func === 'origin') {
				// just force IE to also return a percentage
				return ['50%', '50%'];
			}
			
			return $.cssDefault[func] || 0;
		}
	});
	
	// Define 
	if (typeof($.cssAngle) == 'undefined') {
		$.cssAngle = {};
	}
	$.extend($.cssAngle, {
		rotate: true,
		skew: true,
		skewX: true,
		skewY: true
	});
	
	// Define default values
	if (typeof($.cssDefault) == 'undefined') {
		$.cssDefault = {};
	}
	
	$.extend($.cssDefault, {
		scale: [1, 1],
		scaleX: 1,
		scaleY: 1,
		matrix: [1, 0, 0, 1, 0, 0],
		origin: ['50%', '50%'], // TODO: allow this to be a function, like get
		reflect: [1, 0, 0, 1, 0, 0],
		reflectX: [1, 0, 0, 1, 0, 0],
		reflectXY: [1, 0, 0, 1, 0, 0],
		reflectY: [1, 0, 0, 1, 0, 0]
	});
	
	// Define functons with multiple values
	if (typeof($.cssMultipleValues) == 'undefined') {
		$.cssMultipleValues = {};
	}
	$.extend($.cssMultipleValues, {
		matrix: 6,
		origin: {
			length: 2,
			duplicate: true
		},
		reflect: 6,
		reflectX: 6,
		reflectXY: 6,
		reflectY: 6,
		scale: {
			length: 2,
			duplicate: true
		},
		skew: 2,
		translate: 2
	});
	
	// specify unitless funcs
	$.extend($.cssNumber, {
		matrix: true,
		reflect: true,
		reflectX: true,
		reflectXY: true,
		reflectY: true,
		scale: true,
		scaleX: true,
		scaleY: true
	});
	
	// override all of the css functions
	$.each($.transform.funcs, function(i, func) {
		$.cssHooks[func] = {
			set: function(elem, value) {
				var transform = elem.transform || new $.transform(elem),
					funcs = {};
				funcs[func] = value;
				transform.exec(funcs, {preserve: true});
			},
			get: function(elem, computed) {
				var transform = elem.transform || new $.transform(elem);
				return transform.getAttr(func);
			}
		};
	});
	
	// Support Reflection animation better by returning a matrix
	$.each(['reflect', 'reflectX', 'reflectXY', 'reflectY'], function(i, func) {
		$.cssHooks[func].get = function(elem, computed) {
			var transform = elem.transform || new $.transform(elem);
			return transform.getAttr('matrix') || $.cssDefault[func];
		};
	});
})(jQuery, this, this.document);