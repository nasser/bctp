(function(fn) {
	var didRun = false; //flag to indicate whether target function has already been run
	
	if (document.addEventListener) {
		document.addEventListener("DOMContentLoaded", function(){
			didRun = true;
			fn();
		}, false);
	} else if (document.all && !window.opera) {
		document.write(
			'<script type="text/javascript" id="contentloadtag" ' + 
			'defer="defer" src="javascript:void(0)"><\/script>'
		);
		
		/* TODO: Replace with more DOM-friendly version:
		var contentloadtag = document.createElement("script");
		contentloadtag.setAttribute("type", "text/javascript");
		contentloadtag.setAttribute("defer", "defer");
		contentloadtag.innerHTML = "(function(){})();";

		document.getElementById("head").appendChild(contentloadtag);
		*/

		var contentloadtag = document.getElementById("contentloadtag");
		contentloadtag.onreadystatechange = function(){
			if (this.readyState === "complete"){
				didRun = true;
				fn();
			}
		}
	} else {
		window.onload = function() {
			var interval = setInterval(function() {
				if (!didRun) {
					didRun = true;
					fn();
					clearInterval(interval);
				}
			}, 10);
		};
	}
})(function() {
	var host = 'http://bctp.herokuapp.com/',
		data = {},
		Interface = function (runtime, type, maybeHost, uri) {
			this.runtime = runtime;
			this.type = type;
			this.host = maybeHost || null;
			this.uri = uri || null;
			this.compiler = null;
			
			if (!data[this.type]) {
				data[this.type] = true;
				$.ajax({
					'url': this.getHost() + 'language',
					'data': {
						type: this.type
					},
					'type': 'HEAD',
					'success': function(response, status, xhr) {
						console.log(response);
					}
				});
			}
		};
	
	Interface.prototype.getHost = function () {
		return this.host || this.runtime.host;
	};

	Interface.prototype.fetch = function (callback) {
		var frame = document.createElement('iframe'),
			self = this,
			SafeFunction;

		document.body.appendChild(frame);
		SafeFunction = frame.contentWindow.Function;
		document.body.removeChild(frame);
		
		$.ajax({
			'url': this.uri,
			'type': 'GET',
			'async': false,
			'success': function(data, status, xhr) {
				if (status === 200) {
					var compiler = SafeFunction(data)();
					
					if (compiler) {
						self.compiler = compiler;
					}

					callback.apply(self);
				}
			}
		});
	};
	
	Interface.prototype.compress = function (data) {
		var result, encoding = null;

		if (window.RawDeflate && window.RawDeflate.deflate) {
			result = RawDeflate.deflate(data);
			encoding = 'deflate';
				
			if (window.ArrayBuffer && window.Uint8Array) {
				var arrBuff = new ArrayBuffer(result.length),
					builder = new Uint8Array(arrBuff);
				for (var i = 0, len = result.length; i < len; i++) {
					builder[i] = result.charCodeAt(i);
				}
				result = arrBuff;
			} else {
				result = $.base64.encode(result);
				encoding += '-base64';
			}
		} else {
			result = data;
		}

		return [result, encoding];
	};

	Interface.prototype.inject = function(source) {
		var tag = document.createElement('script');
		tag.innerHTML = source;
	};

	Interface.prototype.compile = function (source /* [, attributes] */) {
		var attributes = arguments[1] || {},
			self = this;
		
		if (attributes['data-compilation-mode'] === 'remote' || this.uri === null) {
			var headers = {},
				zipped = null,
				data = null;

			headers['Content-Type'] = this.type;
			headers['Accept'] = 'text/javascript';
			//headers['Accept-Encoding'] = 'identity, deflate, gzip';

			zipped = this.compress(source);
			data = zipped[0];
			
			if (zipped[1] !== null) {
				headers['Content-Encoding'] = zipped[1];
			}
			
			// TODO: Remove jQuery dependency by including our own
			// ajax abstraction layer.
			
			$.ajax({
				'url': this.getHost(),
				'type': 'POST',
				'headers': headers,
				'data': data,
				'processData': false,
				'success': function(data, status, xhr) {
					if (status === 200) {
						self.inject(data);
					}
				}
			});
		} else {
			var cb = function() {
				this.inject(this.compiler.compile(source));
			};

			if (!this.compiler) {
				this.fetch(cb);
			} else {
				cb();
			}
		}
	};
	
	if (!navigator.runtime) {
		navigator.runtime = {
			Interface: Interface,
			host: host,
			languages: {},
			addLanguage: function(type, host, uri) {
				this.languages[type] = new Interface(this, type, host, uri);
			},
			initialize: function() {
				var linkTags = document.getElementsByTagName("link"),
					scriptTags = document.getElementsByTagName("script"),
					langs,
					deferred = [],
					relations = {
						"runtime-server": function (tag) {
							// TODO: check this
							this.host = tag.getAttribute('href');
						},
						"compiler": function (tag) {
							// Same-origin: protocol, host, and port must match
							var type = tag.getAttribute('type'),
								url = tag.getAttribute('href');
							
							if (url.match(RegExp('^' + this.host))) {
								deferred.push([type, null, url]);
							}
						},
						"unsafe-compiler": function (tag) {
							var type = tag.getAttribute('type'),
								url = tag.getAttribute('href');
							deferred.push([type, null, url]);
						}
					};
				
				for (var i = 0, len = linkTags.length; i < len; i++) {
					var tag = linkTags[i],
						linkRel = tag.getAttribute('rel'),
						fn = relations[linkRel];
					
					if (fn) {
						fn.call(this, tag);
					}
				}

				this.addLanguage.call(this, 'text/coffeescript');
				this.addLanguage.call(this, 'text/lispyscript');
				
				for (var i = 0, len = deferred.length; i < len; i += 1) {
					this.addLanguage.apply(this, deferred[i]);
				}

				langs = Object.keys(this.languages);
				
				for (var i = 0, tagLength = scriptTags.length; i < tagLength; i++) {
					var tag = scriptTags[i],
						scriptType = tag.getAttribute('type'),
						scriptCompileMode = tag.getAttribute('data-compilation-mode');

					for (var j = 0, len = langs.length; j < len; j += 1) {
						if (scriptType === langs[j]) {
							this.languages[scriptType].compile(tag.innerHTML, {
								'data-compilation-mode': scriptCompileMode
							});
							break; // Once you've found it, stop looking
						}
					}
				}
			}
		};
		
		navigator.runtime.initialize();
	}
});

