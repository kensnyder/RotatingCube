var RotatingCube = (function($) {
	
	"use strict";
	
	/**
	 * Temporary element for finding CSS vendor prefixes
	 */
	var elem = document.createElement('div');
	
	/**
	 * The list of vendor prefixes
	 */
	var prefixes = ['MS','O','Moz','Webkit'];
	
	/**
	 * Utility function to find the vendor prefix for a given CSS property
	 * 
	 * @param {String} prop    The property to find; use camelCasing (e.g. "transformStyle")
	 * @return {String|Boolean}  The property with the proper prefix or false if not supported
	 */
	function prefixProperty(prop) {
		// supported without a prefix
		if (prop in elem.style) {
			return prop;
		}
		// capitalize the property
		var upper = prop.charAt(0).toUpperCase() + prop.slice(1);
		// iterate through our prefixes from most common (Webkit) to least common (MS)
		var i = prefixes.length;
		while (i--) {
			if ((prefixes[i] + upper) in elem.style) {
				// supported with this prefix
				return prefixes[i] + upper;
			}
		}
		// not supported
		return false;
	}	
	
	/**
	 * The prefixed CSS property names to use
	 */
	var css = {};
	
	/**
	 * If true, the browser should be able to properly render the cube
	 */
	var isSupported = true;
	
	// load our prefixed CSS properties onto our css object
	$.each(['perspective','transform','transition','transformStyle'], function(i, prop) {
		css[prop] = prefixProperty(prop);
		if (!css[prop]) {
			isSupported = false;
		}
	});
	// we also need a dashed version of "transform" for our transition property value
	// e.g. convert "WebkitTransform" to '-webkit-transform';
	css['transform-dashed'] = css.transform.replace(/^(MS|O|Moz|Webkit)/, '-$1-').toLowerCase();
	
	// shorthand for array slice to be used on arguments
	var slice = Array.prototype.slice;
	
	/**
	 * Our constructor. Create a new Rotating cube and call this.initialize()
	 * 
	 * @constructor
	 * @param {String|HTMLElement|jQuery} container  The outer selector or element to be used for the outer box 
	 * @param {
	 *		transitionTimingFunction: string="ease-in-out",
	 *		perspectiveFactor: number=2,
	 *		scale: number=1.2,
	 *		sequence: Array.<number>=[1,2,3,4,5,6],
	 *		duration: number=2.5,
	 *		onSetup: function(this:RotatingCube, Event),
	 *		onBeforeRotate: function(this:RotatingCube, Event, {toFaceNumber:number, $toFace:jQuery, toFace:HTMLElement, duration:number}),
	 *		onStartRotate: function(this:RotatingCube, Event, {toFaceNumber:number, $toFace:jQuery, toFace:HTMLElement, duration:number}),
	 *		onEndRotate: function(this:RotatingCube, Event)
	 *	} options
	 *	
	 * The minimum html needed is one container, one box, and 6 elements within the box
	 * e.g. <div><ul><li>face1</li>...<li>face6</li></ul></div>
	 * 
	 * The minimum CSS needed is whatever is needed to ensure the effective height and width are the same for each face
	 */
	function RotatingCube(container, options) {
		this.initialize.apply(this, slice.call(arguments));
	}
	
	/**
	 * Default options
	 * @var {Object}
	 */
	RotatingCube.defaultOptions = {
		transitionTimingFunction: 'ease-in-out',
		perspectiveFactor: 2,
		scale: 1.25,
		sequence: [1, 2, 3, 4, 5, 6],
		duration: 2.5
		/*
		OTHER POSSIBLE OPTIONS
		onSetup: $.noop,
		onBeforeRotate: $.noop,
		onStartRotate: $.noop,
		onEndRotate: $.noop
		*/
	};
	
	/**
	 * Return true if the browser is able to render the cube
	 * 
	 * @return {Boolean}
	 */
	RotatingCube.isSupported = function() {
		return isSupported;
	};
	
	$.extend(RotatingCube.prototype, {
		/**
		 * @var {Object} options  The options after applying default options
		 */
		/**
		 * @var {jQuery} $container  jQuery collection containing outer element
		 */
		/**
		 * @var {jQuery} $box  jQuery collection containing inner element
		 */
		/**
		 * @var {jQuery} $faces  jQuery collection containing 6 faces
		 */
		/**
		 * @var {jQuery[]} $$faces  Array containing a jQuery collection for each face
		 */
		/**
		 * @var {Number} showingFace  A number indicating which face is showing
		 */
		/**
		 * @var {Number} size  The width/height of the cube in pixels
		 */		
		/**
		 * Effectively the constructor function that can be extended in a child class
		 * 
		 * @param {String|HTMLElement|jQuery} container
		 * @param {Object} options
		 * @see RotatingCube
		 */
		initialize: function(container, options) {
			this.$container = $(container);
			this.options = $.extend({}, RotatingCube.defaultOptions, options || {});
			this._setup();
		},
		/**
		 * @protected setup the cube and trigger the Setup event
		 */
		_setup: function() {
			this._setupPubsub();
			this._setupDuration();
			this._setupContainer();
			this._setupBox();
			this._setupFaces();
			this._setupBoxTransforms();
			this._setupEvents();
			this.trigger('Setup');
		},
		/**
		 * Rotate to another face
		 * 
		 * @param {Number|String} [toFace]  If a number, rotate to that face number. If falsy, omitted or 'next', go to the next face in this.optoins.sequence. If 'prev' go to the previous face in this.options.sequence
		 * @param {Number} [duration]  The number of seconds. If omitted or falsy, use the duration from this.options.duration
		 */
		rotate: function(toFace, duration) {
			var toFaceNum = toFace ? parseInt(toFace,10) : 0;
			if (toFaceNum > 6 || toFaceNum < 1) {
				var idx = this.options.sequence.indexOf(this.showingFace);
				if (toFace == 'prev') {
					toFace = this.options.sequence[idx == 0 ? 5 : idx-1];
				}
				else {
					toFace = this.options.sequence[idx == 5 ? 0 : idx+1];
				}
			}
			duration = duration || this.options.duration[toFace == 6 ? 0 : toFace];
			this._next = {
				toFaceNumber: toFace,
				$toFace: this.$$faces[toFace-1],
				toFace: this.$$faces[toFace-1][0],
				duration: duration
			};
			this.trigger('BeforeRotate', [this._next]);
			return this;
		},
		/*
		 * The actual rotation that happens if the BeforeRotate event is not prevented
		 */
		BeforeRotate: function() {
			this.$box.css(css.transition, css['transform-dashed'] + ' ' + this._next.duration + 's ' + this.options.transitionTimingFunction);
			this.$box.css(css.transform, this.boxTransforms[this._next.toFaceNumber-1]);
			this.showingFace = this._next.toFaceNumber;
			this.trigger('StartRotate', [this._next]);
			this._next = undefined;
		},
		/**
		 * @method bind
		 * @see http://api.jquery.com/bind/
		 * 
		 * Available events include:
		 *   Setup         function(eventObject)  - not cancelable
		 *   BeforeRotate  function(eventObject, {toFaceNumber:number, $toFace:jQuery, toFace:HTMLElement, duration:number}) - cancelable
		 *   StartRotate   function(eventObject, {toFaceNumber:number, $toFace:jQuery, toFace:HTMLElement, duration:number}) - not cancelable
		 *   EndRotate     function(eventObject) - not cancelable
		 */
		/**
		 * @method unbind
		 * @see http://api.jquery.com/unbind/
		 */
		/**
		 * @method trigger
		 * @see http://api.jquery.com/trigger/
		 */
		/**
		 * @method triggerHandler
		 * @see http://api.jquery.com/triggerHandler/
		 */
		/**
		 * @method on
		 * @see http://api.jquery.com/on/
		 */
		/**
		 * @method off
		 * @see http://api.jquery.com/off/
		 */
		/**
		 * @method one
		 * @see http://api.jquery.com/one/
		 */
		/**
		 * @protected  Setup publish/subscribe methods using jquery
		 */
		_setupPubsub: function() {
			var pubsub = $(this);
			var cube = this;
			$.each(['bind','unbind','trigger','triggerHandler','on','off','one'], function(i, name) {
				cube[name] = function() {
					return pubsub[name].apply(pubsub, slice.call(arguments));
				};
			});
			// bind listeners passed in the options
			for (var name in this.options) {
				if (name.match(/^on[A-Z0-9]/)) {
					this.bind(name.slice(2), this.options[name]);
				}
			}			
		},
		/**
		 * @protected Setup the duration array based on this.options.duration
		 */
		_setupDuration: function() {
			var d = this.options.duration;
			if (typeof d == 'number') {
				this.options.duration = [d,d,d,d,d,d];
			}
		},
		/**
		 * @protected Get the contianer size, apply CSS to container
		 */
		_setupContainer: function() {
			this.size = this.$container.children().children().eq(0).outerWidth();
			this.$container
				.css(css.perspective, (this.size * this.options.perspectiveFactor) + 'px')
				.css('position', 'relative')
			;
			if (!!this.options.scale && this.options.scale != 1) {
				this.$container.css(css.transform, 'scale(' + this.options.scale + ')');
			}
		},
		/**
		 * @protected Get the inner box and apply CSS
		 */
		_setupBox: function() {
			this.$box = this.$container.children();			
			this.$box
				.css(css.transformStyle, 'preserve-3d')
				.css({
					position: 'absolute',
					height: '100%',
					width: '100%'
				})
			;
		},
		/**
		 * @protected Collect the 6 faces and apply CSS
		 */
		_setupFaces: function() {
			this.$faces = this.$box.children();
			if (this.$faces.length < 6) {
				throw new Error('RotatingCube: Container must have cube element which has at least 6 child elements.');
			}
			this.$$faces = [];
			this.$faces.each($.proxy(function(i, element) {
				this.$$faces.push( $(element) );
			},this));			
			this.showingFace = 1;
			var z = Math.floor(this.size/2);
			this.$$faces[0].css(css.transform, 'rotateY(0deg)   translateZ('+z+'px)');
			this.$$faces[1].css(css.transform, 'rotateX(180deg) translateZ('+z+'px)');
			this.$$faces[2].css(css.transform, 'rotateY(90deg)  translateZ('+z+'px)');
			this.$$faces[3].css(css.transform, 'rotateY(-90deg) translateZ('+z+'px)');
			this.$$faces[4].css(css.transform, 'rotateX(90deg)  translateZ('+z+'px)');
			this.$$faces[5].css(css.transform, 'rotateX(-90deg) translateZ('+z+'px)');
			this.$faces
				.css(css.transformStyle, 'preserve-3d')
				.css({
					display: 'block',
					position: 'absolute',
					margin: '0'
				})
			;
		},
		/**
		 * @protected Setup array for transforms to apply to box
		 */
		_setupBoxTransforms: function() {
			this.boxTransforms = [
				'translateZ(-'+this.size+'px) rotateY(0deg)',
				'translateZ(-'+this.size+'px) rotateX(-180deg)',
				'translateZ(-'+this.size+'px) rotateY(-90deg)',
				'translateZ(-'+this.size+'px) rotateY(90deg)',
				'translateZ(-'+this.size+'px) rotateX(-90deg)',
				'translateZ(-'+this.size+'px) rotateX(90deg)'
			];			
			this.$box.css(css.transform, this.boxTransforms[0]);
		},
		/**
		 * @protected Observe the box's transitionend event
		 * 
		 * We bind to all possible events since we don't know which one the browser will fire
		 * We could test and find it, but such a test would be resource intense
		 */
		_setupEvents: function() {
			this.$box.bind(
				'transitionend.cube webkitTransitionEnd.cube oTransitionEnd.cube MSTransitionEnd.cube',
				$.proxy(function(evt) {
					this.trigger('EndRotate', [evt]);
				}, this)
			);
		}
	});

	/**
	 * @param options (see RotatingCube.defaultOptions)
	 */
	$.fn.rotatingCube = function(options) {
		var args = slice.call(arguments, 1);
		return this.each(function() {			
			var $el = $(this);
			var cube = $el.data('RotatingCube');
			if (cube) {
				// options is our method name
				if (typeof cube[options] == 'function') {
					cube[options].apply(cube, args);
				}
			}
			else {
				cube = new RotatingCube($el, options);
				$el.data('RotatingCube', cube);
			}
		});
	}
	
	// make the class available as a property of jQuery
	$.RotatingCube = RotatingCube;
	
	// return our class to the closure
	return RotatingCube;

}(jQuery));