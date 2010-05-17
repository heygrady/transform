(function($, window, document, undefined) {
	// capture form clicks
	$('#transform').submit(function(e) {
		e.preventDefault();
		processForm();
	});
	$('#go').click(function(e) {
		e.preventDefault();
		processForm();
		var $el = $(this);
		$el.animate({rotate: '+=360deg'});
	});
	
	/**
	 * cache the form fields
	 * @var Object
	 */
	var fields = {
		rotate: $('#rotate'),
		scale: {
			x: $('#scale-x'),
			y: $('#scale-y')
		},
		scaleX: $('#scaleX'),
		scaleY: $('#scaleY'),
		skew: {
			x: $('#skew-x'),
			y: $('#skew-y')
		},
		skewX: $('#skewX'),
		skewY: $('#skewY'),
		translate: {
			x: $('#translate-x'),
			y: $('#translate-y')
		},
		translateX: $('#translateX'),
		translateY: $('#translateY'),
		origin: {
			x: $('#origin-x'),
			y: $('#origin-y')
		}
	};	
	
	/**
	 * Process the form
	 */
	function processForm() {
		var funcs = {};
		
		for (var key in fields) {
			var field = fields[key];
			var val = null;
			if  (field.x) {
				var x = field.x.val();
				var y = field.y.val();
				if (x && y) {
					val = [x, y];
				} else if (x)  {
					val = x;
				}
			} else {
				var x = field.val();
				if (x) {
					val = x;
				}
			}
			if (val) {
				funcs[key] = val;
			}
		}
		if ($('#animate').is(':checked')) {
			$.each(funcs, function(func, val) {
				if ($.isArray(val)) {
					funcs[func] = val.join(' ');
				}
			});
			$('#target, #target2').transform({}).animate(funcs);
		} else {
			$('#target').transform(funcs);
			
			$('#target2').transform(funcs, true);
		}
	}
})(jQuery, this, this.document);