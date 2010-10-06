var rfunc = /(matrix|reflect(XY|X|Y)?|rotate|scale[X|Y]?|skew[X|Y]?|translate[X|Y]?)\((*?)\)/g,
	rspace = /\s+/,
	rcspace = /,\s+/;

$.extend($.transform.prototype, {
	/**
	 * @param String func with associated value rotate(13deg)
	 */
	addTransform: function( func ) {
		// split the function into component parts
		var parts = rfunc.exec(func);
		if (parts) {
			var $elem = this.$elem,
				transform = $elem.attr('data-transform');
			
			if (!transform) {
				// it's empty, just save
				$elem.attr('data-transform', func);
			} else if (transform.indexOf(parts[1]) > -1) {
				// if we've already got it, replace it
				var result = null,
					string = '';
					
				// loop the funcs to replace
				while ((result = rfunc.exec(transform)) != null) {
					if (parts[1] == result[1]) {
						string += ' ' +  func;
					} else {
						string += ' ' +  result[0];
					}
				}
				$elem.attr('data-transform', jQuery.trim(string));
			} else {
				// this is a new one, just save
				$elem.attr('data-transform', transform + ' ' + func);
			}
		}
	},
	
	/**
	 * @param String func
	 */
	removeTransform: function( func ) {
		if (func) {
			var $elem = this.$elem,
				transform = $elem.attr('data-transform'),
				result = null,
				string = '';
			
			if (transform && transform.indexOf(func) > -1) {
				// loop the funcs to remove
				while ((result = rfunc.exec(transform)) != null) {
					if (func != result[1]) {
						string += ' ' +  result[0];
					}
				}
				
				string = jQuery.trim(string);
				if (!string) {
					$elem.removeAttr('data-transform');
				} else {
					$elem.attr('data-transform', jQuery.trim(string));
				}
			}
		} else {
			this.$elem.removeAttr('data-transform');
		}
		
	},
	
	/**
	 * @param String func
	 * @return bool
	 */
	hasTransform: function( func ) {
		var transform = this.$elem.attr('data-transform');
		
		if (!transform) {
			return false;
		} else if (func && transform.indexOf(func) > -1) {
			return true;
		}
		return false;
	},
	
	/**
	 * @param String func
	 * @param Array
	 */
	getTransform: function( func ) {
		var transform = this.$elem.attr('data-transform');
		
		if (!transform) {
		//	console.log('getTransform(' + func + ') =>', 'nothing');
			return null;
		}
		
		var result = null;
		if (func && transform.indexOf(func) > -1) {
			// return a specific value
			var value;
			while ((result = rfunc.exec(transform)) != null) {
				if (func == result[1]) {
					value = result[4].split(rcspace);
					//console.log(func, value);
					return value.length == 1 ? value[0] : value;
				}
			}
		} else if (!func) {
			// return all values
			var values = {}, value;
			while ((result = rfunc.exec(transform)) != null) {
				value = result[4].split(rcspace);
				values[result[2]] = value.length == 1 ? value[0] : value;
			}
			return values;
		}
		console.log(transform);
		return null;
	},
	
	/**
	 * Clears out all of the custom attributed
	 * @param void
	 */
	clearAttrs: function() {
		this.$elem.attr('data-transform', '');
	},
	
	/**
	 * @param Object funcs a list of transform functions to store on this element
	 * @return void
	 */
	setAttrs: function(funcs) {
		var string = '',
			value;
		for (var func in funcs) {
			value = funcs[func];
			
			// TODO: normalize values on px, deg, etc
			if ($.isArray(value)) {
				value = value.join(', ');
			}
			
			string += ' ' + func + '(' + value + ')';
		}
		this.$elem.attr('data-transform', jQuery.trim(string));
	},
	
	/**
	 * @param string func name of a transform function
	 * @param mixed value with proper units
	 * @return void
	 */
	setAttr: function(func, value) {
		// TODO: normalize values on px, deg, etc
		if ($.isArray(value)) {
			value = value.join(', ');
		}
		
		this.addTransform(func + '(' + value + ')'); //should be unitless
	},
	
	/**
	 * @return Object values with proper units
	 */
	getAttrs: function() {
		return this.getTransform();
	},
	
	/**
	 * @param String func
	 * @return Array of values
	 */
	getAttr: function(func) {
		//NOTE: Moz and WebKit always return the value of transform
		//	as a matrix and obscures the individual functions. So
		//	it's impossible to know what was set in the CSS.
		var value = this.getTransform(func);
		var rspace = /\s/;
		var rperc = /%/;
		
		if (func == 'origin' && !value && value !== 0) {
			// we can look up the origin in CSS
			value = this.$elem.css(this.transformProperty + '-origin');
			
			//Moz reports the value in % if there hasn't been a transformation yet
			if (rperc.test(value)) {
				value = value.split(rspace);
				if (rperc.test(value[0])) {
					value[0] = this.safeOuterWidth() * (parseFloat(value[0])/100);
				}
				if (rperc.test(value[1])) {
					value[1] = this.safeOuterHeight() * (parseFloat(value[1])/100);
				}
			} else if (!$.isArray(value)) {
				value = value.split(rspace);
			}
		} else if (!value && value !== 0 && $.transform.rfunc.scale.test(func)) {
			//scale functions return 1 by default
			//value = 1;
		}
		//console.log('getAttr(' + func + ') =>',  value);
		return value;
	}
});