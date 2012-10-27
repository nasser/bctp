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
	if (!window.runtime) {
		window.runtime = {
			host: "http://bctp.herokuapp.com/",
			languages: [
				"text/coffeescript",
				"text/ruby",
				"text/haskell",
				"text/python"
			],
			initialize: function() 
				var scriptTags = document.getElementsByTagName("script");
				var tags = [];
				for (var i = 0, tagLength = scriptTags.length; i < tagLength; i++) {
					var tag = scriptTags[i],
						scriptType = tag.getAttribute('type');
					
					for (var j = 0, langLength = this.languages.length; j < langLength; j++) {
						if (scriptType === this.languages[j]) {
							tags.push(tag);
							break; // Once you've found it, stop looking
						}
					}
				}
		
				for (var i = 0, len = tags.length; i < len; i++) {
					// Now that we have an array of tags to replace, do your thing.
					var sourceTag = tags[i],
						headers = {},
						data = null;
					
					if (window.RawDeflate && window.RawDeflate.deflate) {
						data = RawDeflate.deflate(sourceTag.innerHTML);
						headers['Content-Encoding'] = 'deflate';
					} else {
						data = sourceTag.innerHTML;
					}

					headers['Content-Type'] = sourceTag.getAttribute('type');
					headers['Accept'] = 'text/javascript';
					headers['Accept-Encoding'] = 'identity, deflate, gzip';
					
					// TODO: Remove jQuery dependency by including our own
					// ajax abstraction layer.
					
					$.ajax({
						'url': 'http://bctp.herokuapp.com/',
						'type': 'POST',
						'headers': headers,
						'data': data,
						'processData': false,
						'success': function(data, status, xhr) {
							var jsTag = document.createElement('script');
							jsTag.innerHTML = data;
							sourceTag.parentNode.replaceChild(jsTag, sourceTag);
						}
					});
				}
			}
		};
		
		window.runtime.initialize();
	}
});

