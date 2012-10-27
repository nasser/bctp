var coffee_script = require('coffee-script');
var express = require('express');
var zlib = require('zlib');
var stream = require('stream');
var util = require('util');



// TODO: Move this out into a module that can be included.

var Base64Decode = function () {
	this.writable = true;
	this.readable = true;
	this.decoder = {
		width: 6,
		alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	};
	
	var bitWindow = 0,
			bitWindowOffset = 16 - this.decoder['width'];
	
	this._decode = function (data) {
		if (!data) {
			return;
		}

		var buffer = new Buffer(1024),
				contentLength = 0;
		
		data = data.replace(/[\r\n =]/g, '');

		for (var i = 0, len = data.length; i < len; i++) {
			var value = this.decoder.alphabet.indexOf(data[i]);
			
			if (value < 0) {
				throw new RangeError('Illegal character in input string');
			}

			bitWindow |= value << bitWindowOffset;
			bitWindowOffset -= this.decoder.width;
			
			if (bitWindowOffset <= (8 - this.decoder.width)) {
				buffer.writeUInt8((bitWindow & 0xFF00) >> 8, contentLength);
				
				contentLength += 1;
				if (contentLength === buffer.length) {
					buffer.append(new Buffer(1024));
				}

				bitWindow = (bitWindow & 0xFF) << 8;
				bitWindowOffset += 8;
			}
		}
		this.emit('data', buffer.slice(0, contentLength));
	};
};

util.inherits(Base64Decode, stream);

Base64Decode.prototype.write = function (data) {
	this._decode.apply(this, arguments);
};

Base64Decode.prototype.end = function () {
	this._decode.apply(this, arguments);
	this.emit('end');
};



var app = express.createServer(express.logger());

app.configure(function(){
  app.use(app.router);
})

app.get('/', function(request, response) {
  response.send("<h1>BCTP Server</h1><p>POST with code in the body, we'll respond with JavaScript</p><p>Berg, Nasser, 2012</p>")
});

app.get('/.well-known/runtime', function(request, response) {
	response.setHeader('Content-Type', 'text/json');
	response.send(JSON.stringify({
		'allowed-hosts': ['*']
	}));
});

app.post('/', function(request, response) {
  var body = '', buffer, decompressor;
	
	switch (request.headers['content-encoding']) {
	case 'gzip':
		decompressor = zlib.createUnzip();
		request.pipe(decompressor);
		buffer = decompressor;
		break;
	case 'deflate':
		decompressor = zlib.createInflateRaw();
		request.pipe(decompressor);
		buffer = decompressor;
		break;
	case 'deflate-base64':
		decompressor = zlib.createInflateRaw();
		request.setEncoding('ascii');
		request.pipe(new Base64Decode()).pipe(decompressor);
		buffer = decompressor;
		break;
	default:
 		request.setEncoding('utf8');
		buffer = request;
	}
	
	
  buffer.on('data', function(raw) { 
		body += raw;
	}).on('error', function(err) {
		response.status(400);
		response.send(err);
	}).on('end', function(raw) {
    var js = '';
		try {
			js = coffee_script.compile(body);
			response.setHeader("Content-Type", "text/javascript");
    	response.send(js);
		} catch (err) {
			console.log(err);
			response.status(400);
			response.send(err);
		}
  });
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
