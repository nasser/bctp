BCTP - The Bytecode Transfer Protocol
=====================================

BCTP is a protocol that allows clients and servers to exchange source code for bytecode in a decentralized manner. When the client encounters code it cannot compile, it uploads the code to a server with the appropriate compiler, which responds with executable code that the client can run.

Example
-------
BCTP makes the following possible


```html
<script type="text/ruby">
    document.get_elements_by_tag("a").each do |element|
        element.text = "[absolute] #{element.text}" if element.href =~ /^\//
    end
</script>
```

Client side logic first produces a SHA1 hash of the mime type concatenated with the source code. It looks up this hash in a **local bytecode cache**, a mapping of source-hashes to bytecode. If the lookup fails, the code is `POST`ed to a **compiler server** as such

```json
{
    "type": "text/ruby",
    "code": "document.get_elements_by_tag(\"a\").each do |element|
        element.text = \"[absolute] #{element.text}\" if element.href =~ /^\//
    end",
    "options": {
        "version": "1.9",
        "require": ["rubygems", "dom"]
    }
}
```

In the event of an error, the compiler server responds with an error message

```json
{
    "ok": false,
    "error": "NameError: undefined local variable or method `document' on an instance of Object.",
    "line": 1,
    "column": 1,
    "backtrace": [
        "from kernel/delta/kernel.rb:81:in `document (method_missing)'",
        "from (eval):1",
        "from kernel/common/block_environment.rb:75:in `call_on_instance'",
        "from kernel/common/eval.rb:75:in `eval'",
        "from kernel/common/kernel19.rb:42:in `loop'",
        "from kernel/common/throw_catch19.rb:8:in `catch'",
        "from kernel/common/throw_catch.rb:10:in `register'",
        "from kernel/common/throw_catch19.rb:7:in `catch'",
        "from kernel/common/throw_catch19.rb:8:in `catch'",
        "from kernel/common/throw_catch.rb:10:in `register'",
        "from kernel/common/throw_catch19.rb:7:in `catch'",
        "from kernel/delta/codeloader.rb:68:in `load_script'",
        "from kernel/delta/codeloader.rb:110:in `load_script'",
        "from kernel/loader.rb:626:in `script'",
        "from kernel/loader.rb:829:in `main'"
    ]
}
```

In the event of succesful compilation, the compiler server responds with executable bytecode

```json
{
    "ok": true,
    "bytecode": "(function(){var b=null;function g(){return h.navigator?h.navigator.userAgent:b}function i(q){var a;if(!(a=j[q])){a=0;for(var c=String(l).replace(/^[\s\xa0]+|[\s\xa0]+$/g,"").split("."),d=String(q).replace(/^[\s\xa0]+|[\s\xa0]+$/g,"").split("."),y=Math.max(c.length,d.length),k=0;0==a&&k<y;k++){var F=c[k]||\"\",G=d[k]||\"\",H=RegExp(\"(\\d*)(\\D*)\",\"g\"),I=RegExp(\"(\\d*)(\\D*)\",\"g\");do{var e=H.exec(F)||[\"\",\"\",\"\"],f=I.exec(G)||[\"\",\"\",\"\"];if(0==e[0].length&&0==f[0].length)break;a=((0==e[1].length?0:parseInt(e[1],
10))<(0==f[1].length?0:parseInt(f[1],10))?-1:(0==e[1].length?0:parseInt(e[1],10))>(0==f[1].length?0:parseInt(f[1],10))?1:0)||((0==e[2].length)<(0==f[2].length)?-1:(0==e[2].length)>(0==f[2].length)?1:0)||(e[2]<f[2]?-1:e[2]>f[2]?1:0)}while(0==a)}a=j[q]=0<=a}return a}var h=this,m=Date.now||function(){return+new Date};var n,p,r,s;s=r=p=n=!1;var t;if(t=g()){var u=h.navigator;n=0==t.indexOf(\"Opera\");p=!n&&-1!=t.indexOf(\"MSIE\");r=!n&&-1!=t.indexOf(\"WebKit\");s=!n&&!r&&\"Gecko\"==u.product}var v=n,w=p,x=s,z=
r,A;a:{var B=\"\",C;if(v&&h.opera)var D=h.opera.version,B=\"function\"==typeof D?D():D;else if(x?C=/rv\:([^\);]+)(\)|;)/:w?C=/MSIE\s+([^\);]+)(\)|;)/:z&&(C=/WebKit\/(\S+)/),C)var E=C.exec(g()),B=E?E[1]:\"\";if(w){var J,K=h.document;J=K?K.documentMode:void 0;if(J>parseFloat(B)){A=String(J);break a}}A=B}var l=A,j={};h._ValidateBrowser=function $(){var a=window.location.href,c;if(!(c=window!=top||window.frameElement!=b?a:b)){if(!(a=-1==a.indexOf(\"nocheckbrowser\")&&!(w&&i(\"8.0\")||x&&i(\"1.9.2\")||z&&i(\"522\")||
v&&i(\"9.5\"))?h.GM_MOOSE_URL:b))if(document.cookie=\"jscookietest=valid\",-1!=document.cookie.indexOf(\"jscookietest=valid\")?(document.cookie=\"jscookietest=valid;expires=Thu, 01 Jan 1970 00:00:00 GMT\",a=b):a=h.GM_NO_COOKIE_URL,!a)a:{if(w&&!i(\"10\"))try{new ActiveXObject(\"Msxml2.XMLHTTP\")}catch(d){a=h.GM_NO_ACTIVEX_URL;break a}a=b}c=a}if(a=c)top.location=a};_ValidateBrowser()})();"
}
```

The client then stores this bytecode in the local cache.

Once the bytecode is available, the script tag in question is **replaced by the equivalent bytecode** in the document's DOM in order to execute it. This proceeds for every `<script>` tag with `type` different from `text/javascript`.

Open Questions
--------------

### Local Bytecode Cache
This will most probably be `localStorage`. Are there size restrictions? Will they be an issue?

### Bytecode
The project should be thought of in general terms, exchanging textual source code for executable bytecode. In practice, this bytecode is minified JavaScript, because that's what browers understand today and we're building this for the browser first. Can a lower level representation be passed back? Chrome's V8 does not have an intermediate representation for JavaScript – it goes straight to x86/arm assembler.

### Execution Order
Does the client side logic wait until the whole page has loaded before starting its pass? Can it swap out the `<script>` tags as they're loaded in?

### Cross Site Scripting Issues
[JSONP](http://en.wikipedia.org/wiki/JSONP) or [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing) should allow us to get around it.

### Compiler Server Discovery
Determining which compiler server to use should be a flexible, decentralized mechanism. Users should be able to use 'default' servers, possibly hosted on `bctp.org`, so that they can be up and running right away. The default servers would host compilers for the most common languages. Users should also be able to host their own compiler servers to compile fringe languages or to optimize. Users should also be able to use non-standard servers run by others.

An overridable mapping of mimetype to url needs to live somewhere. Is it baked into the BCTP client library? Do servers have a way of communicating what they are able to compile? How do you override the defaults or specify your own servers?

```html
<link rel="compiler" type="text/ruby" href="http://ruby.some-crazy-server.com">
```

Precedents to think about

1. DNS
1. Linux package managers and their repositories
1. BitTorrent

### Privacy and Security
Exchanging executable code over the internet is a risky thing. All communication should be over SSL, for sure, but this needs to be hashed out in detail.
