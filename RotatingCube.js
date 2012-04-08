var RotatingCube = (function($) {
	
	"use strict";
	
	var slice = Array.prototype.slice;
	
	function RotatingCube(element, options) {
		this.initialize.apply(this, slice.call(arguments));
	}
	
	RotatingCube.defaultOptions = {
		transitionTimingFunction: 'ease-in-out',
		perspectiveFactor: 2,
		scale: 1.25,
		sequence: [1, 2, 3, 4, 5, 6],
		duration: 2.5
		/*
		onBeforeRotate: $.noop,
		onStartRotate: $.noop,
		onEndRotate: $.noop
		*/
	};
	
	$.extend(RotatingCube.prototype, {
		initialize: function(container, options) {
			this.options = $.extend({}, RotatingCube.defaultOptions, options || {});
			this._setupPubsub();
			this.$container = $(container);
			this._collectElements();
			this._setupCss();
		},
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
		_collectElements: function() {
			this.$box = this.$container.children();
			this.$faces = this.$box.children();
			if (this.$faces.length < 6) {
				throw new Error('RotatingCube: Container must have cube element which has at least 6 child elements.');
			}
			this.$$faces = [];
			this.$faces.each($.proxy(function(i, element) {
				this.$$faces.push( $(element) );
			},this));
			this.size = this.$faces.outerWidth();
			this.$container.css('width', this.size + 'px');
			this.$container.css('height', this.size + 'px');
		},
		_setupCss: function() {
			this.setDuration(this.options.duration);
			this.$container
				.cubePrefixedCss('perspective', (this.size * this.options.perspectiveFactor) + 'px')
				.css({
					pointerEvents: 'none',
					position: 'relative'
				})
			;
			if (!!this.options.scale && this.options.scale != 1) {
				this.$container.cubePrefixedCss('transform', 'scale(' + this.options.scale + ')');
			}
			this.$box
				.cubePrefixedCss('transform-style', 'preserve-3d')
				.css({
					position: 'absolute',
					height: '100%',
					width: '100%'
				})
			;
			this.showingFace = 1;
			this.$$faces[0].cubePrefixedCss('transform', 'rotateY(0deg)   translateZ('+(this.size/2)+'px)');
			this.$$faces[1].cubePrefixedCss('transform', 'rotateX(180deg) translateZ('+(this.size/2)+'px)');
			this.$$faces[2].cubePrefixedCss('transform', 'rotateY(90deg)  translateZ('+(this.size/2)+'px)');
			this.$$faces[3].cubePrefixedCss('transform', 'rotateY(-90deg) translateZ('+(this.size/2)+'px)');
			this.$$faces[4].cubePrefixedCss('transform', 'rotateX(90deg)  translateZ('+(this.size/2)+'px)');
			this.$$faces[5].cubePrefixedCss('transform', 'rotateX(-90deg) translateZ('+(this.size/2)+'px)');
			this.boxTransforms = [
				'translateZ(-'+this.size+'px) rotateY(0deg)',
				'translateZ(-'+this.size+'px) rotateX(-180deg)',
				'translateZ(-'+this.size+'px) rotateY(-90deg)',
				'translateZ(-'+this.size+'px) rotateY(90deg)',
				'translateZ(-'+this.size+'px) rotateX(-90deg)',
				'translateZ(-'+this.size+'px) rotateX(90deg)'
			];
			this.$faces
				.css({
					display: 'block',
					position: 'absolute',
					margin: '0'
				})
				.cubePrefixedCss('transform-style', 'preserve-3d')
			;
			this.$box.bind(
				'transitionend.cube webkitTransitionEnd.cube oTransitionEnd.cube MSTransitionEnd.cube',
				$.proxy(function(evt) {
					this.trigger('EndRotate', [evt]);
				}, this)
			);
			this.$box.cubePrefixedCss('transform', this.boxTransforms[0]);
		},
		rotate: function(toFace, duration) {
			toFace = toFace ? parseInt(toFace,10) : 0;
			if (toFace > 6 || toFace < 1) {
				var idx = this.options.sequence.indexOf(this.showingFace);
				var nextFace = this.options.sequence[idx == 5 ? 0 : idx+1];
				toFace = nextFace;
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
		// the actual rotation that happens if the BeforeRotate event is not prevented
		BeforeRotate: function() {
			this.$box.cubePrefixedCss({
				transition: prefix('transform','dashed') + ' ' + this._next.duration + 's ' + this.options.transitionTimingFunction,
				transform: this.boxTransforms[this._next.toFaceNumber-1]
			});
			this.showingFace = this._next.toFaceNumber;
			this.trigger('StartRotate', [this._next]);
			this._next = undefined;
		},
		setDuration: function(d) {
			if (typeof d == 'number' || typeof d == 'string') {
				this.options.duration = [d,d,d,d,d,d];
			}		
			else {
				this.options.duration = d;
			}
			return this;
		},
		setSequence: function(s) {
			this.options.sequence = s;
			return this;
		},
		setTransitionTimingFunction: function(f) {
			this.options.transitionTimingFunction = f;
			return this;
		}
	});

	// based on Paul Irish's gist at https://gist.github.com/523692
	function dasherize(s) {
		return s.replace(/([a-z])([A-Z])/, function($0, $1, $2) {
			return $1 + '-' + $2.toLowerCase();
		});
	}
	function camelize(s) {
		return s.replace(/-([a-z])/, function($0, $1) {
			return $1.toUpperCase();
		});
	}
	function findPrefix(prop) {
		var prefixes = ['Moz','Webkit','O','MS'];
		var elem = document.createElement('div');
		var upper = prop.charAt(0).toUpperCase() + prop.slice(1);

		if (prop in elem.style) {
			return {
				prefix: '',
				property: prop,
				dashed: dasherize(prop)
			};
		}
		
		var i = prefixes.length;
		while (i--) {
			if ((prefixes[i] + upper) in elem.style) {
				return {
					prefix: prefixes[i],
					property: prefixes[i] + upper,
					dashed: '-' + prefixes[i].toLowerCase() + '-' + dasherize(prop)
				}
			}
		}
		return {
			prefix: undefined,
			property: undefined,
			dashed: undefined
		};
	}
	
	var prefixCache = {};
	function prefix(prop, type) {
		type = type == 'dashed' ? 'dashed' : 'property';
		if (prop.indexOf('-') > -1) {
			prop = camelize(prop);
		}
		if (!(prop in prefixCache)) {
			prefixCache[prop] = findPrefix(prop);
		}
		return prefixCache[prop][type];
	}
	$.fn.cubePrefixedCss = function(prop, val) {
		if ($.type(prop) == 'string') {
			return this.css(prefix(prop), val);
		}
		var props = prop;
		var prefixedProps = {};
		for (prop in props) {
			prefixedProps[prefix(prop)] = props[prop];
		}
		return this.css(prefixedProps);
	}
	$.fn.rotatingCube = function(options) {
		var args = slice.call(arguments,1);
		return this.each(function() {			
			var $el = $(this);
			var cube = $el.data('RotatingCube');
			if (cube) {
				// options is our method name
				if (typeof cube[options] == 'function') {
					cube[options].apply(card, args);
				}
			}
			else {
				cube = new RotatingCube($el, options);
				$el.data('RotatingCube', cube);
			}
		});
	}
	
	$.RotatingCube = RotatingCube;
	
	return RotatingCube;

})(jQuery);