# 2D Transformations
This library uses native CSS3 transformations in supported browsers and relies on teh matrix filter in Internet Explorer 8 and below.

NOTE: In Internet Explorer 8 and below, the transform-origin and the translate functions are simulated using relative positioning. Because of this, in Internet Explorer 8 and below, the top and left position of an element will be incorrect after it has been transformed. The [solution](https://github.com/heygrady/transform/issues#issue/6) is to wrap the element that is to be transformed and position that wrapper instead.

* Since 0.9.0, proper units are required
* Since 0.9.0, jQuery 1.4.3 or above is required

## Supported Browsers
* Native CSS3 Support
	* FireFox 3.5+
	* Safari 3.1+
	* Chrome
	* Opera 10.5+
	* Internet Explorer 9+
* Matrix Filter Support
	* Internet Explorer 5.5 - 8

## Usage
	// Rotate 30 Degrees
	$('#example').transform({rotate: '30deg'});
	
	// Use CSS Hooks to Rotate
	$('#example').css({rotate: '30deg'});
	
	// Animate the rotation
	$('#example').animate({rotate: '30deg'});
	
	// Go Crazy
	$('#example').transform({
		matrix: [1, 0, 0, 1, 0, 0], //applies a matrix
		reflect: true, //same as rotate(180deg)
		reflectX: true, //mirrored upside down
		reflectXY: true, //same as reflectX + rotate(-90deg)
		reflectY: true, //mirrored
		rotate: '45deg', //rotates 45 degrees
		skew: ['10deg', '10deg'], //skews 10 degrees on the x and y axis
		skewX: '10deg', //skews 10 degrees on the x axis
		skewY: '10deg', //skews 10 degrees on the y axis
		scale: [1.5, 1.5], //scales by 1.5 on the x and y axis
		scaleX: 1.5, //scales by 1.5 on the x axis
		scaleY: 1.5, //scales by 1.5 on the y axis
		translate: ['20px', '20px'], //moves the transformation 20px on the x and y axis
		translateX: 20px', //moves the transformation 20px on the x axis
		translateY: '20px', //moves the transformation 20px on the y axis
		origin: ['20%', '20%']  //changes the transformation origin
	});
	
	// Properties can be strings or arrays
	$('#example').css({skew: ['10deg', '10deg']});
	$('#example').css({skew: '10deg, 10deg'});
	
	// For animation, arrays should be nested because of jQuery's per-property easing support
	$('#example').animate({skew: ['10deg', '10deg']}); // technically this defines nonsense easing of 10deg
	$('#example').animate({skew: [['10deg', '10deg']]}); // this is a friendlier way of supporting this
	
	
	