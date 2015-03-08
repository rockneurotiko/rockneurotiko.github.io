(function(global) {
	'use strict';
	// existing version for noConflict()
	var _Base64 = global.Base64;
	var version = "2.1.4";
	// if node.js, we use Buffer
	var buffer;
	if (typeof module !== 'undefined' && module.exports) {
		buffer = require('buffer').Buffer;
	}
	// constants
	var b64chars
		= 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	var b64tab = function(bin) {
		var t = {};
		for (var i = 0, l = bin.length; i < l; i++) t[bin.charAt(i)] = i;
		return t;
	}(b64chars);
	var fromCharCode = String.fromCharCode;
	// encoder stuff
	var cb_utob = function(c) {
		if (c.length < 2) {
			var cc = c.charCodeAt(0);
			return cc < 0x80 ? c
				: cc < 0x800 ? (fromCharCode(0xc0 | (cc >>> 6))
				+ fromCharCode(0x80 | (cc & 0x3f)))
				: (fromCharCode(0xe0 | ((cc >>> 12) & 0x0f))
				+ fromCharCode(0x80 | ((cc >>>  6) & 0x3f))
				+ fromCharCode(0x80 | ( cc         & 0x3f)));
		} else {
			var cc = 0x10000
				+ (c.charCodeAt(0) - 0xD800) * 0x400
				+ (c.charCodeAt(1) - 0xDC00);
			return (fromCharCode(0xf0 | ((cc >>> 18) & 0x07))
				+ fromCharCode(0x80 | ((cc >>> 12) & 0x3f))
				+ fromCharCode(0x80 | ((cc >>>  6) & 0x3f))
				+ fromCharCode(0x80 | ( cc         & 0x3f)));
		}
	};
	var re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
	var utob = function(u) {
		return u.replace(re_utob, cb_utob);
	};
	var cb_encode = function(ccc) {
		var padlen = [0, 2, 1][ccc.length % 3],
			ord = ccc.charCodeAt(0) << 16
				| ((ccc.length > 1 ? ccc.charCodeAt(1) : 0) << 8)
				| ((ccc.length > 2 ? ccc.charCodeAt(2) : 0)),
			chars = [
				b64chars.charAt( ord >>> 18),
				b64chars.charAt((ord >>> 12) & 63),
				padlen >= 2 ? '=' : b64chars.charAt((ord >>> 6) & 63),
				padlen >= 1 ? '=' : b64chars.charAt(ord & 63)
			];
		return chars.join('');
	};
	var btoa = global.btoa ? function(b) {
		return global.btoa(b);
	} : function(b) {
		return b.replace(/[\s\S]{1,3}/g, cb_encode);
	};
	var _encode = buffer
			? function (u) { return (new buffer(u)).toString('base64') }
			: function (u) { return btoa(utob(u)) }
		;
	var encode = function(u, urisafe) {
		return !urisafe
			? _encode(u)
			: _encode(u).replace(/[+\/]/g, function(m0) {
			return m0 == '+' ? '-' : '_';
		}).replace(/=/g, '');
	};
	var encodeURI = function(u) { return encode(u, true) };
	// decoder stuff
	var re_btou = new RegExp([
		'[\xC0-\xDF][\x80-\xBF]',
		'[\xE0-\xEF][\x80-\xBF]{2}',
		'[\xF0-\xF7][\x80-\xBF]{3}'
	].join('|'), 'g');
	var cb_btou = function(cccc) {
		switch(cccc.length) {
			case 4:
				var cp = ((0x07 & cccc.charCodeAt(0)) << 18)
						|    ((0x3f & cccc.charCodeAt(1)) << 12)
						|    ((0x3f & cccc.charCodeAt(2)) <<  6)
						|     (0x3f & cccc.charCodeAt(3)),
					offset = cp - 0x10000;
				return (fromCharCode((offset  >>> 10) + 0xD800)
					+ fromCharCode((offset & 0x3FF) + 0xDC00));
			case 3:
				return fromCharCode(
					((0x0f & cccc.charCodeAt(0)) << 12)
						| ((0x3f & cccc.charCodeAt(1)) << 6)
						|  (0x3f & cccc.charCodeAt(2))
				);
			default:
				return  fromCharCode(
					((0x1f & cccc.charCodeAt(0)) << 6)
						|  (0x3f & cccc.charCodeAt(1))
				);
		}
	};
	var btou = function(b) {
		return b.replace(re_btou, cb_btou);
	};
	var cb_decode = function(cccc) {
		var len = cccc.length,
			padlen = len % 4,
			n = (len > 0 ? b64tab[cccc.charAt(0)] << 18 : 0)
				| (len > 1 ? b64tab[cccc.charAt(1)] << 12 : 0)
				| (len > 2 ? b64tab[cccc.charAt(2)] <<  6 : 0)
				| (len > 3 ? b64tab[cccc.charAt(3)]       : 0),
			chars = [
				fromCharCode( n >>> 16),
				fromCharCode((n >>>  8) & 0xff),
				fromCharCode( n         & 0xff)
			];
		chars.length -= [0, 0, 2, 1][padlen];
		return chars.join('');
	};
	var atob = global.atob ? function(a) {
		return global.atob(a);
	} : function(a){
		return a.replace(/[\s\S]{1,4}/g, cb_decode);
	};
	var _decode = buffer
		? function(a) { return (new buffer(a, 'base64')).toString() }
		: function(a) { return btou(atob(a)) };
	var decode = function(a){
		return _decode(
			a.replace(/[-_]/g, function(m0) { return m0 == '-' ? '+' : '/' })
				.replace(/[^A-Za-z0-9\+\/]/g, '')
		);
	};
	var noConflict = function() {
		var Base64 = global.Base64;
		global.Base64 = _Base64;
		return Base64;
	};
	// export Base64
	global.Base64 = {
		VERSION: version,
		atob: atob,
		btoa: btoa,
		fromBase64: decode,
		toBase64: encode,
		utob: utob,
		encode: encode,
		encodeURI: encodeURI,
		btou: btou,
		decode: decode,
		noConflict: noConflict
	};
	// if ES5 is available, make Base64.extendString() available
	if (typeof Object.defineProperty === 'function') {
		var noEnum = function(v){
			return {value:v,enumerable:false,writable:true,configurable:true};
		};
		global.Base64.extendString = function () {
			Object.defineProperty(
				String.prototype, 'fromBase64', noEnum(function () {
					return decode(this)
				}));
			Object.defineProperty(
				String.prototype, 'toBase64', noEnum(function (urisafe) {
					return encode(this, urisafe)
				}));
			Object.defineProperty(
				String.prototype, 'toBase64URI', noEnum(function () {
					return encode(this, true)
				}));
		};
	}
	// that's it!
})(this);;var CryptoJS=CryptoJS||function(h,r){var k={},l=k.lib={},n=function(){},f=l.Base={extend:function(a){n.prototype=this;var b=new n;a&&b.mixIn(a);b.hasOwnProperty("init")||(b.init=function(){b.$super.init.apply(this,arguments)});b.init.prototype=b;b.$super=this;return b},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var b in a)a.hasOwnProperty(b)&&(this[b]=a[b]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
j=l.WordArray=f.extend({init:function(a,b){a=this.words=a||[];this.sigBytes=b!=r?b:4*a.length},toString:function(a){return(a||s).stringify(this)},concat:function(a){var b=this.words,d=a.words,c=this.sigBytes;a=a.sigBytes;this.clamp();if(c%4)for(var e=0;e<a;e++)b[c+e>>>2]|=(d[e>>>2]>>>24-8*(e%4)&255)<<24-8*((c+e)%4);else if(65535<d.length)for(e=0;e<a;e+=4)b[c+e>>>2]=d[e>>>2];else b.push.apply(b,d);this.sigBytes+=a;return this},clamp:function(){var a=this.words,b=this.sigBytes;a[b>>>2]&=4294967295<<
32-8*(b%4);a.length=h.ceil(b/4)},clone:function(){var a=f.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var b=[],d=0;d<a;d+=4)b.push(4294967296*h.random()|0);return new j.init(b,a)}}),m=k.enc={},s=m.Hex={stringify:function(a){var b=a.words;a=a.sigBytes;for(var d=[],c=0;c<a;c++){var e=b[c>>>2]>>>24-8*(c%4)&255;d.push((e>>>4).toString(16));d.push((e&15).toString(16))}return d.join("")},parse:function(a){for(var b=a.length,d=[],c=0;c<b;c+=2)d[c>>>3]|=parseInt(a.substr(c,
2),16)<<24-4*(c%8);return new j.init(d,b/2)}},p=m.Latin1={stringify:function(a){var b=a.words;a=a.sigBytes;for(var d=[],c=0;c<a;c++)d.push(String.fromCharCode(b[c>>>2]>>>24-8*(c%4)&255));return d.join("")},parse:function(a){for(var b=a.length,d=[],c=0;c<b;c++)d[c>>>2]|=(a.charCodeAt(c)&255)<<24-8*(c%4);return new j.init(d,b)}},t=m.Utf8={stringify:function(a){try{return decodeURIComponent(escape(p.stringify(a)))}catch(b){throw Error("Malformed UTF-8 data");}},parse:function(a){return p.parse(unescape(encodeURIComponent(a)))}},
q=l.BufferedBlockAlgorithm=f.extend({reset:function(){this._data=new j.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=t.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var b=this._data,d=b.words,c=b.sigBytes,e=this.blockSize,f=c/(4*e),f=a?h.ceil(f):h.max((f|0)-this._minBufferSize,0);a=f*e;c=h.min(4*a,c);if(a){for(var g=0;g<a;g+=e)this._doProcessBlock(d,g);g=d.splice(0,a);b.sigBytes-=c}return new j.init(g,c)},clone:function(){var a=f.clone.call(this);
a._data=this._data.clone();return a},_minBufferSize:0});l.Hasher=q.extend({cfg:f.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){q.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(b,d){return(new a.init(d)).finalize(b)}},_createHmacHelper:function(a){return function(b,d){return(new u.HMAC.init(a,
d)).finalize(b)}}});var u=k.algo={};return k}(Math);
;(function(){var h=CryptoJS,j=h.lib.WordArray;h.enc.Base64={stringify:function(b){var e=b.words,f=b.sigBytes,c=this._map;b.clamp();b=[];for(var a=0;a<f;a+=3)for(var d=(e[a>>>2]>>>24-8*(a%4)&255)<<16|(e[a+1>>>2]>>>24-8*((a+1)%4)&255)<<8|e[a+2>>>2]>>>24-8*((a+2)%4)&255,g=0;4>g&&a+0.75*g<f;g++)b.push(c.charAt(d>>>6*(3-g)&63));if(e=c.charAt(64))for(;b.length%4;)b.push(e);return b.join("")},parse:function(b){var e=b.length,f=this._map,c=f.charAt(64);c&&(c=b.indexOf(c),-1!=c&&(e=c));for(var c=[],a=0,d=0;d<
e;d++)if(d%4){var g=f.indexOf(b.charAt(d-1))<<2*(d%4),h=f.indexOf(b.charAt(d))>>>6-2*(d%4);c[a>>>2]|=(g|h)<<24-8*(a%4);a++}return j.create(c,a)},_map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="}})();
;var CryptoJS=CryptoJS||function(g,l){var e={},d=e.lib={},m=function(){},k=d.Base={extend:function(a){m.prototype=this;var c=new m;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
	p=d.WordArray=k.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=l?c:4*a.length},toString:function(a){return(a||n).stringify(this)},concat:function(a){var c=this.words,q=a.words,f=this.sigBytes;a=a.sigBytes;this.clamp();if(f%4)for(var b=0;b<a;b++)c[f+b>>>2]|=(q[b>>>2]>>>24-8*(b%4)&255)<<24-8*((f+b)%4);else if(65535<q.length)for(b=0;b<a;b+=4)c[f+b>>>2]=q[b>>>2];else c.push.apply(c,q);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<
		32-8*(c%4);a.length=g.ceil(c/4)},clone:function(){var a=k.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],b=0;b<a;b+=4)c.push(4294967296*g.random()|0);return new p.init(c,a)}}),b=e.enc={},n=b.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var b=[],f=0;f<a;f++){var d=c[f>>>2]>>>24-8*(f%4)&255;b.push((d>>>4).toString(16));b.push((d&15).toString(16))}return b.join("")},parse:function(a){for(var c=a.length,b=[],f=0;f<c;f+=2)b[f>>>3]|=parseInt(a.substr(f,
		2),16)<<24-4*(f%8);return new p.init(b,c/2)}},j=b.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var b=[],f=0;f<a;f++)b.push(String.fromCharCode(c[f>>>2]>>>24-8*(f%4)&255));return b.join("")},parse:function(a){for(var c=a.length,b=[],f=0;f<c;f++)b[f>>>2]|=(a.charCodeAt(f)&255)<<24-8*(f%4);return new p.init(b,c)}},h=b.Utf8={stringify:function(a){try{return decodeURIComponent(escape(j.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return j.parse(unescape(encodeURIComponent(a)))}},
	r=d.BufferedBlockAlgorithm=k.extend({reset:function(){this._data=new p.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=h.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,b=c.words,f=c.sigBytes,d=this.blockSize,e=f/(4*d),e=a?g.ceil(e):g.max((e|0)-this._minBufferSize,0);a=e*d;f=g.min(4*a,f);if(a){for(var k=0;k<a;k+=d)this._doProcessBlock(b,k);k=b.splice(0,a);c.sigBytes-=f}return new p.init(k,f)},clone:function(){var a=k.clone.call(this);
		a._data=this._data.clone();return a},_minBufferSize:0});d.Hasher=r.extend({cfg:k.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){r.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(b,d){return(new a.init(d)).finalize(b)}},_createHmacHelper:function(a){return function(b,d){return(new s.HMAC.init(a,
	d)).finalize(b)}}});var s=e.algo={};return e}(Math);
(function(){var g=CryptoJS,l=g.lib,e=l.WordArray,d=l.Hasher,m=[],l=g.algo.SHA1=d.extend({_doReset:function(){this._hash=new e.init([1732584193,4023233417,2562383102,271733878,3285377520])},_doProcessBlock:function(d,e){for(var b=this._hash.words,n=b[0],j=b[1],h=b[2],g=b[3],l=b[4],a=0;80>a;a++){if(16>a)m[a]=d[e+a]|0;else{var c=m[a-3]^m[a-8]^m[a-14]^m[a-16];m[a]=c<<1|c>>>31}c=(n<<5|n>>>27)+l+m[a];c=20>a?c+((j&h|~j&g)+1518500249):40>a?c+((j^h^g)+1859775393):60>a?c+((j&h|j&g|h&g)-1894007588):c+((j^h^
	g)-899497514);l=g;g=h;h=j<<30|j>>>2;j=n;n=c}b[0]=b[0]+n|0;b[1]=b[1]+j|0;b[2]=b[2]+h|0;b[3]=b[3]+g|0;b[4]=b[4]+l|0},_doFinalize:function(){var d=this._data,e=d.words,b=8*this._nDataBytes,g=8*d.sigBytes;e[g>>>5]|=128<<24-g%32;e[(g+64>>>9<<4)+14]=Math.floor(b/4294967296);e[(g+64>>>9<<4)+15]=b;d.sigBytes=4*e.length;this._process();return this._hash},clone:function(){var e=d.clone.call(this);e._hash=this._hash.clone();return e}});g.SHA1=d._createHelper(l);g.HmacSHA1=d._createHmacHelper(l)})();
(function(){var g=CryptoJS,l=g.enc.Utf8;g.algo.HMAC=g.lib.Base.extend({init:function(e,d){e=this._hasher=new e.init;"string"==typeof d&&(d=l.parse(d));var g=e.blockSize,k=4*g;d.sigBytes>k&&(d=e.finalize(d));d.clamp();for(var p=this._oKey=d.clone(),b=this._iKey=d.clone(),n=p.words,j=b.words,h=0;h<g;h++)n[h]^=1549556828,j[h]^=909522486;p.sigBytes=b.sigBytes=k;this.reset()},reset:function(){var e=this._hasher;e.reset();e.update(this._iKey)},update:function(e){this._hasher.update(e);return this},finalize:function(e){var d=
	this._hasher;e=d.finalize(e);d.reset();return d.finalize(this._oKey.clone().concat(e))}})})();;function hex2String(hex) {
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Copyright (C) Paul Johnston 1999 - 2000.
 * Updated by Greg Holt 2000 - 2001.
 * See http://pajhome.org.uk/site/legal.html for details.
 */

/*
 * Convert a 32-bit number to a hex string with ls-byte first
 */
var hex_chr = "0123456789abcdef";
function rhex(num)
{
    str = "";
    for(j = 0; j <= 3; j++)
        str += hex_chr.charAt((num >> (j * 8 + 4)) & 0x0F) +
            hex_chr.charAt((num >> (j * 8)) & 0x0F);
    return str;
}

/*
 * Convert a string to a sequence of 16-word blocks, stored as an array.
 * Append padding bits and the length, as described in the MD5 standard.
 */
function str2blks_MD5(str)
{
    nblk = ((str.length + 8) >> 6) + 1;
    blks = new Array(nblk * 16);
    for(i = 0; i < nblk * 16; i++) blks[i] = 0;
    for(i = 0; i < str.length; i++)
        blks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
    blks[i >> 2] |= 0x80 << ((i % 4) * 8);
    blks[nblk * 16 - 2] = str.length * 8;
    return blks;
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function add(x, y)
{
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left
 */
function rol(num, cnt)
{
    return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * These functions implement the basic operation for each round of the
 * algorithm.
 */
function cmn(q, a, b, x, s, t)
{
    return add(rol(add(add(a, q), add(x, t)), s), b);
}
function ff(a, b, c, d, x, s, t)
{
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function gg(a, b, c, d, x, s, t)
{
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function hh(a, b, c, d, x, s, t)
{
    return cmn(b ^ c ^ d, a, b, x, s, t);
}
function ii(a, b, c, d, x, s, t)
{
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Take a string and return the hex representation of its MD5.
 */
function calcMD5(str)
{
    x = str2blks_MD5(str);
    a =  1732584193;
    b = -271733879;
    c = -1732584194;
    d =  271733878;

    for(i = 0; i < x.length; i += 16)
    {
        olda = a;
        oldb = b;
        oldc = c;
        oldd = d;

        a = ff(a, b, c, d, x[i+ 0], 7 , -680876936);
        d = ff(d, a, b, c, x[i+ 1], 12, -389564586);
        c = ff(c, d, a, b, x[i+ 2], 17,  606105819);
        b = ff(b, c, d, a, x[i+ 3], 22, -1044525330);
        a = ff(a, b, c, d, x[i+ 4], 7 , -176418897);
        d = ff(d, a, b, c, x[i+ 5], 12,  1200080426);
        c = ff(c, d, a, b, x[i+ 6], 17, -1473231341);
        b = ff(b, c, d, a, x[i+ 7], 22, -45705983);
        a = ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
        d = ff(d, a, b, c, x[i+ 9], 12, -1958414417);
        c = ff(c, d, a, b, x[i+10], 17, -42063);
        b = ff(b, c, d, a, x[i+11], 22, -1990404162);
        a = ff(a, b, c, d, x[i+12], 7 ,  1804603682);
        d = ff(d, a, b, c, x[i+13], 12, -40341101);
        c = ff(c, d, a, b, x[i+14], 17, -1502002290);
        b = ff(b, c, d, a, x[i+15], 22,  1236535329);

        a = gg(a, b, c, d, x[i+ 1], 5 , -165796510);
        d = gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
        c = gg(c, d, a, b, x[i+11], 14,  643717713);
        b = gg(b, c, d, a, x[i+ 0], 20, -373897302);
        a = gg(a, b, c, d, x[i+ 5], 5 , -701558691);
        d = gg(d, a, b, c, x[i+10], 9 ,  38016083);
        c = gg(c, d, a, b, x[i+15], 14, -660478335);
        b = gg(b, c, d, a, x[i+ 4], 20, -405537848);
        a = gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
        d = gg(d, a, b, c, x[i+14], 9 , -1019803690);
        c = gg(c, d, a, b, x[i+ 3], 14, -187363961);
        b = gg(b, c, d, a, x[i+ 8], 20,  1163531501);
        a = gg(a, b, c, d, x[i+13], 5 , -1444681467);
        d = gg(d, a, b, c, x[i+ 2], 9 , -51403784);
        c = gg(c, d, a, b, x[i+ 7], 14,  1735328473);
        b = gg(b, c, d, a, x[i+12], 20, -1926607734);

        a = hh(a, b, c, d, x[i+ 5], 4 , -378558);
        d = hh(d, a, b, c, x[i+ 8], 11, -2022574463);
        c = hh(c, d, a, b, x[i+11], 16,  1839030562);
        b = hh(b, c, d, a, x[i+14], 23, -35309556);
        a = hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
        d = hh(d, a, b, c, x[i+ 4], 11,  1272893353);
        c = hh(c, d, a, b, x[i+ 7], 16, -155497632);
        b = hh(b, c, d, a, x[i+10], 23, -1094730640);
        a = hh(a, b, c, d, x[i+13], 4 ,  681279174);
        d = hh(d, a, b, c, x[i+ 0], 11, -358537222);
        c = hh(c, d, a, b, x[i+ 3], 16, -722521979);
        b = hh(b, c, d, a, x[i+ 6], 23,  76029189);
        a = hh(a, b, c, d, x[i+ 9], 4 , -640364487);
        d = hh(d, a, b, c, x[i+12], 11, -421815835);
        c = hh(c, d, a, b, x[i+15], 16,  530742520);
        b = hh(b, c, d, a, x[i+ 2], 23, -995338651);

        a = ii(a, b, c, d, x[i+ 0], 6 , -198630844);
        d = ii(d, a, b, c, x[i+ 7], 10,  1126891415);
        c = ii(c, d, a, b, x[i+14], 15, -1416354905);
        b = ii(b, c, d, a, x[i+ 5], 21, -57434055);
        a = ii(a, b, c, d, x[i+12], 6 ,  1700485571);
        d = ii(d, a, b, c, x[i+ 3], 10, -1894986606);
        c = ii(c, d, a, b, x[i+10], 15, -1051523);
        b = ii(b, c, d, a, x[i+ 1], 21, -2054922799);
        a = ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
        d = ii(d, a, b, c, x[i+15], 10, -30611744);
        c = ii(c, d, a, b, x[i+ 6], 15, -1560198380);
        b = ii(b, c, d, a, x[i+13], 21,  1309151649);
        a = ii(a, b, c, d, x[i+ 4], 6 , -145523070);
        d = ii(d, a, b, c, x[i+11], 10, -1120210379);
        c = ii(c, d, a, b, x[i+ 2], 15,  718787259);
        b = ii(b, c, d, a, x[i+ 9], 21, -343485551);

        a = add(a, olda);
        b = add(b, oldb);
        c = add(c, oldc);
        d = add(d, oldd);
    }
    return rhex(a) + rhex(b) + rhex(c) + rhex(d);
};var BASE_DEFAULT = '';
var LineConfig = function(){
    if(LineConfig.instance != null){
        return LineConfig.instance;
    }
};

LineConfig.PHASE = "REAL"; // 'BETA', 'RC', 'REAL'
LineConfig.DEVICE_NAME = "";        // DEVICE NAME
LineConfig.OS_NAME = "Firefox_OS";
LineConfig.APPLICATION_VERSION = "1.0.2";
LineConfig.OS_VERSION = "1.1";
LineConfig.APPLICATION_CODE = {"BETA":"FIREFOXOS_BETA", "RC":"FIREFOXOS_RC", "REAL":"FIREFOXOS"};


LineConfig.CONNECTION_INFO_REGION = "JP";

LineConfig.AUTO_RESEND_SLEEPTIME = 1.5 * 1000;
LineConfig.AUTO_RESEND_INTERVAL = 1 * 60 * 60 * 1000; // 1시간
LineConfig.AUTO_RESEND_TIME = 10*60*1000;

LineConfig.LONGPOLLING_TIMEOUT =  60 * 1000; // 60초
LineConfig.LONGPOLLING_TIMEOUT_TABLE = [1*60*1000, 110*1000, 3*60*1000, 5*60*1000]; //최대 5분
LineConfig.LONGPOLLING_MAX_LEVEL = LineConfig.LONGPOLLING_TIMEOUT_TABLE.length-1;

LineConfig.FETCH_OPERATION_COUNT = 30;
LineConfig.END_OF_OPERATION_SLEEP_INTERVAL = 300; //0.3s
LineConfig.NEW_FRIEND_CHECK_TIME = 60 * 1000; // Spec : 1 min = 1 * 60
LineConfig.DIMMED_TIMEOUT = 2 * 60 * 1000;   // 2 min


/**
 * 텔레포니카 독점 계약 사항
 */
LineConfig.restrictZone = [
    "73002", //chile
    "21405", "21407", //spain
    "71606", //peru
    "74807", //uruguay
    "73404", //Venezuela
    "732102", "732123", //colombia
    "33403", //mexico,
    "72406", "72410", "72411", "72423", // brazil
    "45005", "00" // korea test
];

LineConfig.restrictCountry = [
    "730", //chile
    "214", //spain
    "716", //peru
    "748", //uruguay
    "734", //Venezuela
    "732", //colombia
    "334", //mexico
    "724" //brazil
];








// Thumbnail Size
LineConfig.LIST_THUMBNAIL_SIZE = 56;
LineConfig.PROFILE_THUMBNAIL_SIZE = 90;

// UPLOAD
LineConfig.UPLOAD_IMAGE_QUALITY = 70;
LineConfig.UPLOAD_TIMEOUT_INTERVAL = 20 * 1000;   // 20 sec

// SETTINGS
LineConfig.SETTING_DISPLAY_NAME_LENGTH = 20;
LineConfig.SETTING_STATUS_MESSAGE_LENGTH = 100;

// REGISTER
LineConfig.LOCALE = 'pt-BR';
LineConfig.DEFAULT_REGION = 'JP';
LineConfig.REGISTER_PHONE_INPUT_LIMIT_SECONDS = 10; // Spec : 10 min = 10 * 60
LineConfig.REGISTER_PHONE_PINCODE_SESSION_LIMIT = 30;    // 30 min
LineConfig.REGISTER_PHONE_NUMBER_MIN_LENGTH = 1;
LineConfig.REGISTER_PIN_NUMBER_MIN_LENGTH = 1;
LineConfig.MAX_PHONE_NUMBER_LENGTH = 15;
LineConfig.MIN_PASSWORD_LENGTH = 6;
LineConfig.MAX_PASSWORD_LENGTH = 20;
LineConfig.MAX_PINCODE_LENGTH = 6;
LineConfig.SMS_RESEND_TIMEOUT = 2 * 60 * 1000;  // 2min

// CHAT
LineConfig.HEIGHT_OF_EMPTY_CHAT_LIST = 228;


// GROUP
LineConfig.MAX_GROUP_MEMBER_COUNT = 99;

// Constant
LineConfig.RECOMMEND_FRIEND_MAX_BADGE_COUNT = 99;
LineConfig.NEW_FRIEND_MAX_BADGE_COUNT = 99;

// Dimmed
LineConfig.MAX_DIMMED_TIME = 30 * 1000; // 10 sec
LineConfig.MAX_WORKER_SEND_TIME = 10 * 1000 // 10 sec

LineConfig.FILE_UPLOAD_LIMIT = 3000000;    // 3MB

LineConfig.prototype = {
    /**
     *  retrieve applicaton code
     */
    getApplicationCode : function(){
        return LineConfig.APPLICATION_CODE[LineConfig.PHASE];
    },

    /**
     *  retrieve application code's value
     */
    getApplicationCodeValue : function(){
        return ApplicationType[this.getApplicationCode()];
    },

    createUUID : function(){
        // http://www.ietf.org/rfc/rfc4122.txt
        var s = [];
        var hexDigits = "0123456789abcdef";
        for (var i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[8] = s[13] = s[18] = s[23] = "-";

        var uuid = s.join("");
        return uuid;
    }
};

/**
 *  singleton pattern
 */
LineConfig.getInstance = function(){
    if(LineConfig.instance == null){
        LineConfig.instance = new LineConfig();
    }

    return LineConfig.instance;
};
LineConfig.instance = null;;var ServerInfo = function(){
    if(ServerInfo.instance != null){
        return ServerInfo.instance;
    }
    this.host = null;
    this.port = null;
    this.uri = null;
    this.setting = function(type){

        if(type == "noAuth"){
            this.host = this.getPrivateHost("ThriftHost");
            this.port = this.getPrivatePort("ThriftPort");
            this.uri = ServerInfo.noAuthURI;

        }else if(type == "connectionInfo"){
            this.host = this.getPrivateHost("ThriftHost");
            this.port = this.getPrivatePort("ThriftPort");
            this.uri = ServerInfo.connectionInfoURI;

        }else if(type == "thrift"){
            this.host = this.getPrivateHost("ThriftHost");
            this.port = this.getPrivatePort("ThriftPort");
            this.uri = ServerInfo.authURI;

        }else if(type == "longPolling"){
            this.host = this.getPrivateHost("PollingHost");
            this.port = this.getPrivatePort("PollingPort");
            this.uri = ServerInfo.longPollingURI;

        } else if(type == "gCdnObs"){
            this.host = this.getPrivateHost("GCDNOBSHost");
            this.port = this.getPrivatePort("GCDNOBSPort");
            this.uri = ServerInfo.authURI;
            
        }else if(type == "sticker"){
            this.host = this.getPrivateHost("GCDNStickerHost");
            this.port = this.getPrivatePort("GCDNStickerPort");
            this.uri = ServerInfo.authURI;

        }else if(type == "originObsProfile"){
	        this.host = this.getOBSHost();
	        this.port = this.getOBSPort();
	        this.uri = ServerInfo.OBS.profileURI + '/upload.nhn';

        }else if(type == "originObsGroupProfile"){
	        this.host = this.getOBSHost();
	        this.port = this.getOBSPort();
	        this.uri = ServerInfo.OBS.groupProfileURI + '/upload.nhn';

        }else if(type == "originObsChatImage"){
	        this.host = this.getOBSHost();
	        this.port = this.getOBSPort();
	        this.uri = ServerInfo.OBS.chatImageURI + '/upload.nhn';

        } else if(type === 'originObsDownloadChat'){
	        this.host = ServerInfo.OriginOBSHost[LineConfig.PHASE];
	        this.port = this.getOBSPort();
	        this.uri = ServerInfo.OBS.chatImageURI + '/download.nhn';

        } else if(type === 'originObsObjectInfoChat'){
	        this.host = ServerInfo.OriginOBSHost[LineConfig.PHASE];
	        this.port = this.getOBSPort();
	        this.uri = '/talk/m/object_info.nhn';

        }else if(type === 'originObsObjectInfoGroupProfile'){
	        this.host = ServerInfo.OriginOBSHost[LineConfig.PHASE];
	        this.port = this.getOBSPort();
	        this.uri = '/talk/g/object_info.nhn';

        }else if(type == "warmup"){
            this.host = this.getPrivateHost("ThriftHost");
            this.port = 443;
            this.uri = ServerInfo.wramupURI;

        }else if(type == "help"){
            this.host = this.getPrivateHost("HelpHost");
        }
    };

	this.setQueryString = function(options){
		options.ver = '1.0';
		this.uri += '?' + $.param(options);
	};

	this.setRestfulUrl = function(options){
		this.uri += '/delete.nhn';
	};

    this.getHost = function(){
        return this.host;
    };
    
    this.getPort = function(){
        return this.port;
    };
    
    this.getURI = function(){
        return this.uri;  
    };
};

ServerInfo.prototype = {
    /**
     *  retrieve host that managed  in inner
     * @param {Object} type
     */
    getPrivateHost : function(type){
        var hostObj = this.getServerHost(type);
        if(!hostObj){
            alert("error - invalid host type : " + type);
            return null;
        }else{
            return hostObj[LineConfig.PHASE];
        }
    },
    
    /**
     *  retrieve port that managed in inner 
     * @param {Object} type
     */
    getPrivatePort : function(type){
        var portObj = ServerInfo[type];

        if(ServerInfo.isDebugMode && _.size(ServerInfo.DebugPort) > 0) {
            console.log("is Debug Mode server Port Info.............." + JSON.stringify(ServerInfo.DebugPort[type]));
            return ServerInfo.DebugPort[type];
        }

        if(!portObj){
            alert("error - invalid port type : " + type);
            return null;
        }else{
            return portObj;
        }
    },

    getOBSHost : function(){
	    return this.getPrivateHost("OriginOBSHost");
    },

	getGCDNOBSHost : function(){
		return this.getPrivateHost("GCDNOBSHost");
	},

	getOBSPort : function(){
		return this.getPrivatePort('OriginOBSPort');
	},

	OriginOBSHost : function(){
		return this.getPrivatePort('OriginOBSPort');
	},

    getStickerHost : function(){
        return "http://"+this.getPrivateHost("GCDNStickerHost");
    },

    getServerHost: function(type) {
        var serverList = ServerInfo.serverList;
        var hostObj = ServerInfo[type];

        if(ServerInfo.isDebugMode && _.size(ServerInfo.DebugHost) > 0) {
            console.log("is Debug Mode server Host Info.............." + JSON.stringify(ServerInfo.DebugHost[type]));
            return ServerInfo.DebugHost[type];
        }

        if(!ServerInfo.serverList) {
            //console.log("is default server info........" + JSON.stringify(hostObj));
            return hostObj;
        }

        switch(type) {
            case "PollingHost" :
                var pollingServers = _.findWhere(serverList, {server_type:"legy_polling", transport:"tls"});
                var pollingServerInfo = this.parseServerList(pollingServers);

                if(pollingServerInfo.length > 0) {
                    hostObj[LineConfig.PHASE] = _.first(pollingServerInfo).host;
                }

                break;
            case "ThriftHost" :
                var thriftServers = _.pick(_.findWhere(serverList, {server_type:"legy", transport:"tls"}), "list");
                var thriftServerInfo = this.parseServerList(thriftServers);

                if(thriftServerInfo.length > 0) {
                    hostObj[LineConfig.PHASE] = _.first(thriftServerInfo).host;
                }

                break;
            case "OriginOBSHost" :
                var obsServerList = _.pick(_.findWhere(serverList, {server_type:"obs", transport:"tls"}), "list");
                var obsServerInfo = this.parseServerList(obsServerList);

                if(obsServerInfo.length > 0) {
                    hostObj[LineConfig.PHASE] = _.first(obsServerInfo).host;
                }

                break;
            case "GCDNOBSHost" :
                var cdnObsServerList = _.pick(_.findWhere(serverList, {server_type:"cdn_obs", transport:"raw"}), "list");
                var cdnObsServerInfo = this.parseServerList(cdnObsServerList);

                if(cdnObsServerInfo.length > 0) {
                    hostObj[LineConfig.PHASE] = _.first(cdnObsServerInfo).host;
                }
                break;
            case "GCDNStickerHost" :
                var cdnStickerServerList = _.pick(_.findWhere(serverList, {server_type:"cdn_sticker", transport:"raw"}), "list");
                var cdnStickerServerInfo = this.parseServerList(cdnStickerServerList);

                if(cdnStickerServerInfo.length > 0) {
                    hostObj[LineConfig.PHASE] = _.first(cdnStickerServerInfo).host;
                }
                break;
        }

        //console.log("is not default server info........" + JSON.stringify(hostObj));

        return hostObj;
    },

    parseServerList: function(object) {
        var servers = _.pick(object, "list");
        var server = _.values(servers)[0];

        return server;
    }
};

/**
 *  singletone pattern 
 */
ServerInfo.getInstance = function(){
    if(ServerInfo.instance == null){
        ServerInfo.instance = new ServerInfo();
    }
    
    return ServerInfo.instance;
};

ServerInfo.instance = null;

/**
 *  Server's API URI Information 
 */
ServerInfo.connectionInfoURI = "/R";
ServerInfo.noAuthURI = "/api/v4j/TalkService.do";
ServerInfo.longPollingURI = "/JP4";
ServerInfo.authURI = "/JS4";
ServerInfo.compactSendMessageURI = "/JC4";
ServerInfo.notifySleepURI = "/JF4";
ServerInfo.wramupURI = "/200";

ServerInfo.OBS = {};

ServerInfo.OBS.profileURI = '/talk/p';
ServerInfo.OBS.groupProfileURI = '/talk/g';
ServerInfo.OBS.chatImageURI = '/talk/m';

/**
 *  Server's Host & Port Information Area 
 */
ServerInfo.PollingPort = 443;
ServerInfo.PollingHost = {"BETA":"gfp-beta.line.naver.jp", "RC":"gfp-rc.line.naver.jp", "REAL":"gfp.line.naver.jp"};

ServerInfo.ThriftPort = 443;
ServerInfo.ThriftHost = {"BETA":"gf-beta.line.naver.jp", "RC":"gf-rc.line.naver.jp", "REAL":"gf.line.naver.jp"};

ServerInfo.OriginOBSPort = 80;
ServerInfo.OriginOBSHost = {"BETA":"os-beta.line.naver.jp", "RC":"os-rc.line.naver.jp", "REAL":"os.line.naver.jp"};

ServerInfo.GCDNOBSPort = 80;
ServerInfo.GCDNOBSHost = {"BETA":"dl.os-beta.line.naver.jp", "RC":"dl.profile.line.naver.jp", "REAL":"dl.profile.line.naver.jp"};

ServerInfo.GCDNStickerPort = 80;
ServerInfo.GCDNStickerHost = {"BETA":"dl.stickershop.line.beta.naver.jp", "RC":"dl.stickershop.line.naver.jp", "REAL":"dl.stickershop.line.naver.jp"};

ServerInfo.HelpHost = {"BETA":"line.beta.naver.jp", "RC":"line.naver.jp", "REAL":"line.naver.jp"};


ServerInfo.serverList = null;

ServerInfo.isDebugMode = false;
ServerInfo.DebugHost = {};
ServerInfo.DebugPort = {};;var XHR = function(method){
    this.xhrObj = new XMLHttpRequest({'mozSystem': true, 'mozBackgroundRequest': true});

    // thrift 에 대한 타임아웃 설정
    // this.xhrObj.timeout = LineConfig.MAX_DIMMED_TIME;
    // this.xhrObj.ontimeout = function() {}

    this.method = method;
};


XHR.prototype = {
    /**
     *  retrieve XmlHttpRequest Object
     */
    getXHRObj : function(){
        return this.xhrObj;  
    },
    
    /**
     *  retrieve mthod 
     */
    getMethod : function(){
        return this.method;
    }
};    ;var console = {
	level : LineConfig.PHASE
};

console.infoLog = [];

console.log = function(msg){
	//console.infoLog.push(msg);
    //postMessage({ method : 'logger', "arguments": msg});
	postMessage({ method : 'logger', "arguments": Array.prototype.slice.call(arguments) });
};

console.exception = function(e){
	var result = JSON.stringify(e);
	postMessage({ method : 'exception', "arguments": result});
};

console.info = function(msg){
	console.infoLog.push(msg);
}

console.startTime = function(name){

};

console.endTime = function(name){

};

console.clear = function(){
	console.infoLog = [];
	console.infoLog.length = 0;
};

console.flush = function(){
	if(console.level == "BETA"){
		console.info(msg);

	}else{
		var fileJobWorker = new JobWorkor("src/worker/FileJob.js");
		fileJobWorker.sendQuery("writeLog", console.infoLog);
	}

	console.clear();
};
;var AuthInfoKeeper = function(){
    if(AuthInfoKeeper.instance != null){
        return AuthInfoKeeper.instance;
    }
    this.authToken = null;
    this.phoneNumber = null;
    this.isoCode = null;
	this.sessionData = null;
    this.mcc = 0;
    this.mnc = 0;
};

AuthInfoKeeper.prototype = {
    /**
     * save auth-token
     * @param authToken
     */
    setAuthToken : function(authToken){
        if(this.authToken == null){
	        this.authToken = authToken;
            AuthPersistentStore.getInstance().setAuthToken(authToken);
        }else{
            alert($.i18n.prop("ANOTHER_DEVICE_IS_REGISTERED_WITH_SAME_PHONE_NUMBER_ERROR_TEXT"));
	        this.authToken = null;
	        AuthPersistentStore.getInstance().setAuthToken(null);

	        LineMain.getInstance().changeScreen({
		        screen : LineMain.MAIN_SCREEN_TYPE.REGISTER,
		        subScreen : LineMain.SUB_SCREEN_TYPE.REGISTER_NEW_LINE
	        });
        }
    },

    /**
     * retrieve auth-token
     * @returns {null|*}
     */
    getAuthToken : function(){
        return this.authToken || AuthPersistentStore.getInstance().getAuthToken();
    },

    /**
     * save phone number
     * @param phoneNumber
     */
    setPhoneNumber : function(phoneNumber){
        AuthPersistentStore.getInstance().setPhoneNumber(phoneNumber);
        this.phoneNumber = phoneNumber;
    },

    /**
     * retrieve phone number
     * @returns {null|*}
     */
    getPhoneNumber : function(){
        return this.phoneNumber || AuthPersistentStore.getInstance().getPhoneNumber();
    },

    /**
     * save iso code
     * @param isoCode
     */
    setISOCode : function(isoCode){
        if(this.isoCode == null){
            AuthPersistentStore.getInstance().setISOCode(isoCode);
            this.isoCode = isoCode;
        }
    },

    /**
     * retrieve iso code
     * @returns {null|*}
     */
    getISOCode : function(){
        return this.isoCode || AuthPersistentStore.getInstance().getISOCode();
    },

    getAuthMid : function(){
        if(this.getAuthToken() !== null){
            return this.getAuthToken().split(":")[0];
        }else{
            return null;
        }
    },

	setSessionData : function(sessionData){
		AuthPersistentStore.getInstance().setSessionData(sessionData);
		this.sessionData = sessionData;
	},

	getSessionData : function(){
		return this.sessionData || AuthPersistentStore.getInstance().getSessionData();
	},

	removeAll : function(){
		AuthPersistentStore.getInstance().clear();
		this.authToken = null;
		this.phoneNumber = null;
		this.isoCode = null;
	},

    getSessions: function(customCallback) {

    },

    setMCCMNC : function(){
        // http://en.wikipedia.org/wiki/Mobile_country_code
        //:: for OS 1.1
        var conn = navigator.mozMobileConnection;
        if(!!conn == true){
            var network = (conn.lastKnownHomeNetwork || conn.lastKnownNetwork || '-').split('-');
            this.mcc = network[0];
            this.mnc = network[1];

        //:: for OS 1.3
        }else if(!!navigator.mozMobileConnections == true){
            for(var i=0; i<navigator.mozMobileConnections.length; i++){
                var connData = conn[i].data;
                if (!!connData == true && !!connData.network == true){
                    this.mcc = connData.network.mcc;
                    this.mnc = connData.network.mnc;
                }

            }
        }
    },

    getMNC : function(){
        return this.mnc;
    },

    getMCC : function(){
        return this.mcc;
    },

    getMCCMNC : function(){
        return this.getMCC()+""+this.getMNC();
    }
};

/**
 *  singleton pattern
 */
AuthInfoKeeper.getInstance = function(){
    if(AuthInfoKeeper.instance === null){
        AuthInfoKeeper.instance = new AuthInfoKeeper();
    }

    return AuthInfoKeeper.instance;
};

AuthInfoKeeper.instance = null;

;var CommonException = function(){
     if(CommonException.instance != null){
        return CommonException.instance;
    }
};

CommonException.prototype = {
    /**
     *  log for exception 
     */
    process : function(exception, methodName){
        if(exception instanceof TalkException){
            postMessage({ "method": "LineTalkException", "arguments":arguments});
        }else{
            console.log("LineNetworkException - ex : "+exception+", method = "+methodName);
            postMessage({ "method": "LineNetworkException", "arguments":null});
        }
    }
};

/**
 *  singleton pattern
 */
CommonException.getInstance = function(){
    if(CommonException.instance == null){
        CommonException.instance = new CommonException();
    }
    
    return CommonException.instance;
};

CommonException.instance = null;


;var LineTalkExceptionHandler = function () {
    if (LineTalkExceptionHandler.instance != null) {
        return LineTalkExceptionHandler.instance;
    }
};

LineTalkExceptionHandler.prototype = {
    handle: function (ex) {
        var code = null;
        var codeValue = null;
        var reason = null;

        var err = ex[0];
        var errMethodName = ex[1];


        code = err.code;
        codeValue = LineTalkExceptionHandler.getErrorCodeValue(code);
        reason = err.reason;

        switch (code) {

        /**************************************************************************
         * 공통 섹션
         */

            // 계정초기화 - 같은 번호, 다른 단말기에서 같은 번호로 등록됨.모든 어카운트 정보 삭제 + 인증이 이상한 경우
            case ErrorCode.NOT_AUTHORIZED_DEVICE :
            case ErrorCode.NOT_AVAILABLE_USER :
            case ErrorCode.AUTHENTICATION_FAILED : {
                AlertUI.getInstance().open({
                    message: $.i18n.prop("INVALID_AUTH_ERROR_TEXT"),
                    button: {label: $.i18n.prop("CLOSE"), callback: function() {AppCleaner.getInstance().clear();} }
                });
            } break;



        /**************************************************************************
         * 가입 섹션
         */

            // Register 관련
            case ErrorCode.INTERNAL_ERROR : break;
            case ErrorCode.ILLEGAL_ARGUMENT : break;
            case ErrorCode.INVALID_IDENTITY_CREDENTIAL : break;
            case ErrorCode.INVALID_LENGTH :  break;
            case ErrorCode.INVALID_PIN_CODE :  break;
	        case ErrorCode.NOT_AVAILABLE_PIN_CODE_SESSION : break;
            case ErrorCode.NOT_AVAILABLE_IDENTITY_IDENTIFIER : break;
            case ErrorCode.NOT_AVAILABLE_SESSION : break;

        /**
         * 아이디 검색 관련
         */
            case ErrorCode.NOT_FOUND :  break;
            case ErrorCode.EXCESSIVE_ACCESS: break;

            // process inside chatProxy > updateErrorMessage
            case ErrorCode.NOT_A_MEMBER : break;

            default : {
                alert("# [TalkException]-" + errMethodName + " # code(" + code + ") = " + codeValue + ", reason = " + reason + ", reqTime = " + new Date());
            }

        }
    }
};

/**
 *  singleton pattern
 */
LineTalkExceptionHandler.getInstance = function () {
    if (LineTalkExceptionHandler.instance == null) {
        LineTalkExceptionHandler.instance = new LineTalkExceptionHandler();
    }

    return LineTalkExceptionHandler.instance;
};

LineTalkExceptionHandler.instance = null;


LineTalkExceptionHandler.getErrorCodeValue = function (code) {
    for (var key in ErrorCode) {
        if (ErrorCode[key] == code) {
            return key;
        }
    }
};
;var HttpClient = function(xhr, serverInfo, async){
    this.xhr = xhr;
    this.xhrInstance = this.xhr.getXHRObj();

    this.host = serverInfo.getHost();
    this.port = serverInfo.getPort();
    this.uri = serverInfo.getURI();
    
    this.header = {};
    this.body = "";

	this.setPrepareXHR(async);
};

HttpClient.prototype = {
    /**
     *   activate xhr object
     *
     *   @notice
     *   async only use in OBS Upload (Progress event only available in asynchronous mode)
     */
    setPrepareXHR : function(async){
        var url = "http://"+this.getHost() + ":"+ this.getPort() + this.getURI();
        var method = this.xhr.getMethod();
        this.xhrInstance.open(method, url, async ? true : false);
    },
    
    /**
     *  retrieve xhr object
     */
    getXHRObj : function(){
        return this.xhrInstance;
    },
    
    /**
     *  set header
     */
    setHeader : function(name, value){
        this.header[name] = value;
        this.xhrInstance.setRequestHeader(name, value);
    },
    
    /**
     *  retrieve host
     */
    getHost : function(){
        return this.host;
    },
    
    /**
     *  retrieve port 
     */
    getPort : function(){
        return this.port;
    },
    
    /**
     *  retrieve URI 
     */
    getURI : function(){
        return this.uri;  
    }
};




;var ConnectionInfoHttpClient = function(xhr, region, mccmnc, serverInfo){
    this.xhr = xhr;
    this.xhrInstance = this.xhr.getXHRObj();
    this.psk = "4c 60 5e ff df 3d fc a1 21 7d 48 17 40 20 56 91 80 dc 23 38 a5 77 2a 80 ed 0a aa 01 bc d0 a0 8f";

    this.host = serverInfo.getHost();
    this.port = serverInfo.getPort();
    this.uri = serverInfo.getURI();

    this.header = {};

    /*this.reqData = {
        "type" : "iPhone_OS",
        "version" : "3.2.0",
        "region" : LineConfig.CONNECTION_INFO_REGION,
        "time" : new Date().getTime()
    };*/

    this.reqData = {
     "type" : LineConfig.OS_NAME,
     "version" : LineConfig.APPLICATION_VERSION,
     "region" : region,
     "carrier" : mccmnc,
     "time" : new Date().getTime()
     };

    console.log("@#@# >> c-info = "+JSON.stringify(this.reqData));

    var body = _.map(_.pairs(this.reqData), function(pair) {
        return [pair[0],"=",pair[1]].join("");
    }).join("&");

    this.setPrepareXHR(body);

};

ConnectionInfoHttpClient.prototype = {
    /**
     *   activate xhr object
     */
    setPrepareXHR : function(data){
        var url = "http://"+this.getHost() + ":"+ this.getPort() + this.getURI();

        if(data.length > 0) {
            url += "?" + data;
        }

        url += "&carrier=45005";
        url += "&key=" + this.makeKey();

        var method = this.xhr.getMethod();
        this.xhrInstance.open(method, url, false);
    },

    /**
     *  retrieve xhr object
     */
    getXHRObj : function(){
        return this.xhrInstance;
    },

    /**
     *  set header
     */
    setHeader : function(name, value){
        this.header[name] = value;
        this.xhrInstance.setRequestHeader(name, value);
    },

    /**
     *  retrieve host
     */
    getHost : function(){
        return this.host;
    },

    /**
     *  retrieve port
     */
    getPort : function(){
        return this.port;
    },

    /**
     *  retrieve URI
     */
    getURI : function(){
        return this.uri;
    },

    makeKey : function(){
        var arpskList = this.psk.split(" ");
        var data = [];
        var stream = [];

        for (var  i = 0; i<arpskList.length; i++) {
            data[i] = parseInt(arpskList[i], 16);
        }

        stream.push(this.reqData.type);
        stream.push(this.reqData.version);
        stream.push(this.reqData.region);
        stream.push(this.reqData.time);
        stream.push(this.reqData.carrier);
        stream.push(hex2String(this.psk.split(" ").join("")));

        var hash = calcMD5(stream.join(""));

        return hash;
    }
};;var LineHeaderHttpClient = function(httpClient, acToken){
    this.httpClient = httpClient;
    var lineConfig = LineConfig.getInstance();
    
    //this.setUserAgentHeader();
    this.setLineApplicationHeader(lineConfig.getApplicationCode(), LineConfig.APPLICATION_VERSION, LineConfig.OS_NAME, LineConfig.OS_VERSION);

    if(acToken){
        this.setLineAccessTokenHeader(acToken);
    }
    
    return this.httpClient;
};

LineHeaderHttpClient.prototype = {
    /**
     *  combine UserAgent to header
     */
    setUserAgentHeader : function(){
        this.httpClient.setHeader("User-Agent", "LF/100");
    },
    
    /**
     *  combine LineApplication Information to header 
     * @param {Object} applicationCode
     * @param {Object} appVersion
     * @param {Object} osName
     * @param {Object} osVersion
     */
    setLineApplicationHeader : function(applicationCode, appVersion, osName, osVersion){
        this.httpClient.setHeader("X-Line-Application", applicationCode + "\t" + appVersion + "\t" + osName + "\t" + osVersion);
    },
    
    /**
     * combine Acess-token to header
     * @param {Object} acToken
     */
    setLineAccessTokenHeader : function(authToken){
        this.httpClient.setHeader("X-Line-Access", this.generateAccessToken(authToken));
    },


    generateAccessToken : function(authToken){
        var result = [];
        var timeStamp = parseInt((new Date).getTime() / 1000, 10);
        var splitedAuthKey = authToken.split(':');
        result.push(splitedAuthKey[0]);
        var strClaim = 'iat: ' + timeStamp + '\n';
        var strEncodedClaim = Base64.encode(strClaim);
        strEncodedClaim = strEncodedClaim.trim(); // remove Carriage Return
        var strCryptoInput = strEncodedClaim + '.';
        var strEncodedSecretKey = splitedAuthKey[1];
        var strDecodedSecretKey = CryptoJS.enc.Base64.parse(strEncodedSecretKey);
        var hashStream = CryptoJS.HmacSHA1(strCryptoInput, strDecodedSecretKey);
        var strEncodedCrypto = CryptoJS.enc.Base64.stringify(hashStream);
        var ywt = [strCryptoInput , '.', strEncodedCrypto];

        result.push(':');
        result.push(ywt.join(''));

        return result.join('');
    }


    
};
;var ThriftHeaderHttpClient = function(httpClient){
    this.httpClient = httpClient;
    this.httpClient.setHeader("Content-Type", "application/x-thrift");
    this.httpClient.setHeader("Accept", "application/x-thrift");
    
    return this.httpClient;
};
;var LongPollingHeaderHttpClient = function(httpClient, timeout){
    this.httpClient = httpClient;
    this.httpClient.setHeader("X-LST", timeout);
    
    return this.httpClient;
};
;var OBSHeaderHttpClient = function(httpClient){
    this.httpClient = httpClient;

//	if(navigator.mozMobileConnection){
//		var mccMnc = navigator.mozMobileConnection.iccInfo.mcc + navigator.mozMobileConnection.iccInfo.mnc;
//		this.httpClient.setHeader("x-line-carrier", mccMnc);
//	}

//    this.httpClient.setHeader("x-line-region", AuthInfoKeeper.getInstance().getISOCode());

	var authToken = AuthInfoKeeper.getInstance().getAuthToken();
	this.setLineAccessTokenHeader(authToken);
	this.setLineApplicationHeader(LineConfig.getInstance().getApplicationCode(), LineConfig.APPLICATION_VERSION, LineConfig.OS_NAME, LineConfig.OS_VERSION);

    return this.httpClient;
};

OBSHeaderHttpClient.prototype = {

	/**
	 *  combine LineApplication Information to header
	 * @param {Object} applicationCode
	 * @param {Object} appVersion
	 * @param {Object} osName
	 * @param {Object} osVersion
	 */
	setLineApplicationHeader : function(applicationCode, appVersion, osName, osVersion){
		this.httpClient.setHeader("x-line-application", applicationCode + "\t" + appVersion + "\t" + osName + "\t" + osVersion);
	},

	/**
	 * combine Acess-token to header
	 * @param {Object} acToken
	 */
	setLineAccessTokenHeader : function(authToken){
		this.httpClient.setHeader("x-line-access", this.generateAccessToken(authToken));
	},


	generateAccessToken : function(authToken){
		var result = [];
		var timeStamp = parseInt((new Date).getTime() / 1000, 10);
		var splitedAuthKey = authToken.split(':');
		result.push(splitedAuthKey[0]);
		var strClaim = 'iat: ' + timeStamp + '\n';
		var strEncodedClaim = Base64.encode(strClaim);
		strEncodedClaim = strEncodedClaim.trim(); // remove Carriage Return
		var strCryptoInput = strEncodedClaim + '.';
		var strEncodedSecretKey = splitedAuthKey[1];
		var strDecodedSecretKey = CryptoJS.enc.Base64.parse(strEncodedSecretKey);
		var hashStream = CryptoJS.HmacSHA1(strCryptoInput, strDecodedSecretKey);
		var strEncodedCrypto = CryptoJS.enc.Base64.stringify(hashStream);
		var ywt = [strCryptoInput , '.', strEncodedCrypto];

		result.push(':');
		result.push(ywt.join(''));

		return result.join('');
	}
};
;var OBSUploadHeaderHttpClient = function(httpClient){
	this.httpClient = httpClient;

	this.setCrossDomainHeader();
	return this.httpClient;
};

OBSUploadHeaderHttpClient.prototype = {
	setCrossDomainHeader : function(){
		this.httpClient.setHeader("Access-Control-Allow-Origin", "*");
	}
};
;var HttpClientFactory = function(){};

/**
 *  create http client for connection info
 */
HttpClientFactory.createConnectionInfoHttpClient = function(authToken, region, mccmnc){
    var serverInfo = ServerInfo.getInstance();
    serverInfo.setting("connectionInfo");
    var httpClient = new ConnectionInfoHttpClient(new XHR("GET"), region, mccmnc, serverInfo);

    //:: combine header
    httpClient = new LineHeaderHttpClient(httpClient, authToken);
    httpClient = new ThriftHeaderHttpClient(httpClient);

    return httpClient;
};

HttpClientFactory.createWarmupHttpClient = function(authToken){
    var serverInfo = ServerInfo.getInstance();
    serverInfo.setting("warmup");
    var httpClient = new HttpClient(new XHR("GET"), serverInfo);

    //:: combine header
    httpClient = new LineHeaderHttpClient(httpClient, authToken);
    httpClient = new ThriftHeaderHttpClient(httpClient);

    return httpClient;
};

/**
 *  create http client for no-authentic Thrift API
 */
HttpClientFactory.createNoAuthThriftHttpClient = function(){
    var serverInfo = ServerInfo.getInstance();
    serverInfo.setting("noAuth");

    var httpClient = new HttpClient(new XHR("POST"), serverInfo);
    //:: combine header
    // TODO [blankus] must add header cache...
    httpClient = new LineHeaderHttpClient(httpClient);
    httpClient = new ThriftHeaderHttpClient(httpClient);

    return httpClient;
};

/**
 *  create http client for Thrift API 
 */
HttpClientFactory.createThriftHttpClient = function(authToken){
    var serverInfo = ServerInfo.getInstance();
    serverInfo.setting("thrift");

    var httpClient = new HttpClient(new XHR("POST"), serverInfo);

    //:: combine header
    //if(Thrift.Line.useCachedHeader == true){
    //    httpClient = new CachedHeaderHttpClient(httpClient);
    //}else{
        httpClient = new LineHeaderHttpClient(httpClient, authToken);
        httpClient = new ThriftHeaderHttpClient(httpClient);
    //}

     return httpClient;
};

/**
 *  create http client for Thrift async sendmessage API
 */
HttpClientFactory.createAsyncThriftHttpClient = function(authToken){
    var serverInfo = ServerInfo.getInstance();
    serverInfo.setting("thrift");

    var httpClient = new HttpClient(new XHR("POST"), serverInfo, true);

    //:: combine header
    //if(Thrift.Line.useCachedHeader == true){
    //    httpClient = new CachedHeaderHttpClient(httpClient);
    //}else{
    httpClient = new LineHeaderHttpClient(httpClient, authToken);
    httpClient = new ThriftHeaderHttpClient(httpClient);
    //}

    return httpClient;
};

/**
 *  create http client for Long polling API
 */
HttpClientFactory.createLongPollingHttpClient = function(authToken, timeout){
    var serverInfo = ServerInfo.getInstance();
    serverInfo.setting("longPolling");

    var httpClient = new HttpClient(new XHR("POST"), serverInfo);

    //:: combine header
    httpClient = new LongPollingHeaderHttpClient(httpClient, timeout);
    //if(Thrift.Line.useCachedHeader == true){
    //    httpClient = new CachedHeaderHttpClient(httpClient, "polling");
    //}else{
        httpClient = new LineHeaderHttpClient(httpClient, authToken);
        httpClient = new ThriftHeaderHttpClient(httpClient);
    //}

    return httpClient;
};

/**
 *  create http client for GCDN-OBS API
 */
HttpClientFactory.createGCDNOBSHttpClient = function(){
    var serverInfo = ServerInfo.getInstance();
    serverInfo.setting("gCdnObs");

    var httpClient = new HttpClient(new XHR("POST"), serverInfo);
    //:: combine header
    httpClient = new LineHeaderHttpClient(httpClient);
    httpClient = new OBSHeaderHttpClient(httpClient);
           
    return httpClient;
};



HttpClientFactory.getDefaultOBSHttpClient = function(serverInfo, authToken){

	var httpClient = new HttpClient(new XHR("POST"), serverInfo, true);
	//:: combine header
	httpClient = new LineHeaderHttpClient(httpClient, authToken);
	httpClient = new OBSUploadHeaderHttpClient(httpClient);

	return httpClient;
};

/**
 *  create http client for OBS Profile Upload
 */
HttpClientFactory.createOBSProfileUploadHttpClient = function(authToken){

	var serverInfo = ServerInfo.getInstance();
	serverInfo.setting("originObsProfile");

	return HttpClientFactory.getDefaultOBSHttpClient(serverInfo, authToken);
};

/**
 *  create http client for OBS Group Profile Upload
 */
HttpClientFactory.createOBSGroupProfileUploadHttpClient = function(authToken){
	var serverInfo = ServerInfo.getInstance();
	serverInfo.setting("originObsGroupProfile");

	return HttpClientFactory.getDefaultOBSHttpClient(serverInfo, authToken);
};


/**
 *  create http client for OBS Chat Image Upload
 */
HttpClientFactory.createOBSChatImageUploadHttpClient = function(authToken){
	var serverInfo = ServerInfo.getInstance();
	serverInfo.setting("originObsChatImage");

	return HttpClientFactory.getDefaultOBSHttpClient(serverInfo, authToken);
};


/**
 *  create http client for OBS Profile Download
 */
HttpClientFactory.createOBSChatImageDownloadHttpClient = function(authToken, params){

	var serverInfo = ServerInfo.getInstance();
	serverInfo.setting("originObsDownloadChat");

	serverInfo.setQueryString(params);

	var httpClient = new HttpClient(new XHR("GET"), serverInfo, true);
	//:: combine header
	httpClient = new LineHeaderHttpClient(httpClient, authToken);
	httpClient = new OBSUploadHeaderHttpClient(httpClient);

	return httpClient;
};

/**
 *  create http client for OBS Chat Image Object Info
 */
HttpClientFactory.createOBSChatObjectInfoHttpClient = function(authToken){

	var serverInfo = ServerInfo.getInstance();
	serverInfo.setting("originObsObjectInfoChat");

	var httpClient = new HttpClient(new XHR("POST"), serverInfo, true);
	//:: combine header
	httpClient = new LineHeaderHttpClient(httpClient, authToken);
	httpClient = new OBSUploadHeaderHttpClient(httpClient);

	return httpClient;
};

/**
 *  create http client for OBS Group Profile Image Object Info
 */
HttpClientFactory.createOBSGroupProfileObjectInfoHttpClient = function(authToken){

	var serverInfo = ServerInfo.getInstance();
	serverInfo.setting("originObsObjectInfoGroupProfile");

	var httpClient = new HttpClient(new XHR("POST"), serverInfo, true);
	//:: combine header
	httpClient = new LineHeaderHttpClient(httpClient, authToken);
	httpClient = new OBSUploadHeaderHttpClient(httpClient);

	return httpClient;
};;var TalkClientFactory = function(){
    if(TalkClientFactory.instance != null){
        return TalkClientFactory.instance;
    }
};

TalkClientFactory.prototype = {
    /**
     * create TalkService client for connection info
     */
    createConnectionInfoClient : function(authToken, region, mccmnc){
        return HttpClientFactory.createConnectionInfoHttpClient(authToken, region, mccmnc);
    },

    /**
     *  create TalkService client for no-auth 
     */
    createNoAuthClient : function(){
        var httpClient = HttpClientFactory.createNoAuthThriftHttpClient();
        var transport = new Thrift.Transport(httpClient, ServerInfo.noAuthURI);
        var protocol  = new Thrift.Protocol(transport);
		
        return new TalkServiceClient(protocol);
    },
    
    /**
     *  create TalkService client for sendMessage 
     */
    createAuthClient : function(authToken){
        var httpClient = HttpClientFactory.createThriftHttpClient(authToken);
        var transport = new Thrift.Transport(httpClient, ServerInfo.authURI);
        var protocol  = new Thrift.Protocol(transport);

        return new TalkServiceClient(protocol);
    },

    /**
     *  create TalkService client for async sendMessage
     */
    createAsyncAuthClient : function(authToken){
        var httpClient = HttpClientFactory.createAsyncThriftHttpClient(authToken);
        var transport = new Thrift.Transport(httpClient, ServerInfo.authURI);
        var protocol  = new Thrift.Protocol(transport);

        return new TalkServiceClient(protocol);
    },
    
    /**
     *  create TalkService client for long polling
     */
    createLongPollingClient : function(authToken, timeout){
        var httpClient = HttpClientFactory.createLongPollingHttpClient(authToken, timeout);
        var transport = new Thrift.Transport(httpClient, ServerInfo.longPollingURI);
        var protocol  = new Thrift.Protocol(transport);

        return new TalkServiceClient(protocol);
    },

    createWarmUpClient : function(authToken){
        return HttpClientFactory.createWarmupHttpClient(authToken);
    }
};

/**
 *  singleton pattern
 */
TalkClientFactory.getInstance = function(){
    if(TalkClientFactory.instance == null){
        TalkClientFactory.instance = new TalkClientFactory();
    }
    
    return TalkClientFactory.instance;
};

TalkClientFactory.instance = null;
;//     Underscore.js 1.5.2
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.
(function(){var n=this,t=n._,r={},e=Array.prototype,u=Object.prototype,i=Function.prototype,a=e.push,o=e.slice,c=e.concat,l=u.toString,f=u.hasOwnProperty,s=e.forEach,p=e.map,h=e.reduce,v=e.reduceRight,g=e.filter,d=e.every,m=e.some,y=e.indexOf,b=e.lastIndexOf,x=Array.isArray,w=Object.keys,_=i.bind,j=function(n){return n instanceof j?n:this instanceof j?(this._wrapped=n,void 0):new j(n)};"undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=j),exports._=j):n._=j,j.VERSION="1.5.2";var A=j.each=j.forEach=function(n,t,e){if(null!=n)if(s&&n.forEach===s)n.forEach(t,e);else if(n.length===+n.length){for(var u=0,i=n.length;i>u;u++)if(t.call(e,n[u],u,n)===r)return}else for(var a=j.keys(n),u=0,i=a.length;i>u;u++)if(t.call(e,n[a[u]],a[u],n)===r)return};j.map=j.collect=function(n,t,r){var e=[];return null==n?e:p&&n.map===p?n.map(t,r):(A(n,function(n,u,i){e.push(t.call(r,n,u,i))}),e)};var E="Reduce of empty array with no initial value";j.reduce=j.foldl=j.inject=function(n,t,r,e){var u=arguments.length>2;if(null==n&&(n=[]),h&&n.reduce===h)return e&&(t=j.bind(t,e)),u?n.reduce(t,r):n.reduce(t);if(A(n,function(n,i,a){u?r=t.call(e,r,n,i,a):(r=n,u=!0)}),!u)throw new TypeError(E);return r},j.reduceRight=j.foldr=function(n,t,r,e){var u=arguments.length>2;if(null==n&&(n=[]),v&&n.reduceRight===v)return e&&(t=j.bind(t,e)),u?n.reduceRight(t,r):n.reduceRight(t);var i=n.length;if(i!==+i){var a=j.keys(n);i=a.length}if(A(n,function(o,c,l){c=a?a[--i]:--i,u?r=t.call(e,r,n[c],c,l):(r=n[c],u=!0)}),!u)throw new TypeError(E);return r},j.find=j.detect=function(n,t,r){var e;return O(n,function(n,u,i){return t.call(r,n,u,i)?(e=n,!0):void 0}),e},j.filter=j.select=function(n,t,r){var e=[];return null==n?e:g&&n.filter===g?n.filter(t,r):(A(n,function(n,u,i){t.call(r,n,u,i)&&e.push(n)}),e)},j.reject=function(n,t,r){return j.filter(n,function(n,e,u){return!t.call(r,n,e,u)},r)},j.every=j.all=function(n,t,e){t||(t=j.identity);var u=!0;return null==n?u:d&&n.every===d?n.every(t,e):(A(n,function(n,i,a){return(u=u&&t.call(e,n,i,a))?void 0:r}),!!u)};var O=j.some=j.any=function(n,t,e){t||(t=j.identity);var u=!1;return null==n?u:m&&n.some===m?n.some(t,e):(A(n,function(n,i,a){return u||(u=t.call(e,n,i,a))?r:void 0}),!!u)};j.contains=j.include=function(n,t){return null==n?!1:y&&n.indexOf===y?n.indexOf(t)!=-1:O(n,function(n){return n===t})},j.invoke=function(n,t){var r=o.call(arguments,2),e=j.isFunction(t);return j.map(n,function(n){return(e?t:n[t]).apply(n,r)})},j.pluck=function(n,t){return j.map(n,function(n){return n[t]})},j.where=function(n,t,r){return j.isEmpty(t)?r?void 0:[]:j[r?"find":"filter"](n,function(n){for(var r in t)if(t[r]!==n[r])return!1;return!0})},j.findWhere=function(n,t){return j.where(n,t,!0)},j.max=function(n,t,r){if(!t&&j.isArray(n)&&n[0]===+n[0]&&n.length<65535)return Math.max.apply(Math,n);if(!t&&j.isEmpty(n))return-1/0;var e={computed:-1/0,value:-1/0};return A(n,function(n,u,i){var a=t?t.call(r,n,u,i):n;a>e.computed&&(e={value:n,computed:a})}),e.value},j.min=function(n,t,r){if(!t&&j.isArray(n)&&n[0]===+n[0]&&n.length<65535)return Math.min.apply(Math,n);if(!t&&j.isEmpty(n))return 1/0;var e={computed:1/0,value:1/0};return A(n,function(n,u,i){var a=t?t.call(r,n,u,i):n;a<e.computed&&(e={value:n,computed:a})}),e.value},j.shuffle=function(n){var t,r=0,e=[];return A(n,function(n){t=j.random(r++),e[r-1]=e[t],e[t]=n}),e},j.sample=function(n,t,r){return arguments.length<2||r?n[j.random(n.length-1)]:j.shuffle(n).slice(0,Math.max(0,t))};var k=function(n){return j.isFunction(n)?n:function(t){return t[n]}};j.sortBy=function(n,t,r){var e=k(t);return j.pluck(j.map(n,function(n,t,u){return{value:n,index:t,criteria:e.call(r,n,t,u)}}).sort(function(n,t){var r=n.criteria,e=t.criteria;if(r!==e){if(r>e||r===void 0)return 1;if(e>r||e===void 0)return-1}return n.index-t.index}),"value")};var F=function(n){return function(t,r,e){var u={},i=null==r?j.identity:k(r);return A(t,function(r,a){var o=i.call(e,r,a,t);n(u,o,r)}),u}};j.groupBy=F(function(n,t,r){(j.has(n,t)?n[t]:n[t]=[]).push(r)}),j.indexBy=F(function(n,t,r){n[t]=r}),j.countBy=F(function(n,t){j.has(n,t)?n[t]++:n[t]=1}),j.sortedIndex=function(n,t,r,e){r=null==r?j.identity:k(r);for(var u=r.call(e,t),i=0,a=n.length;a>i;){var o=i+a>>>1;r.call(e,n[o])<u?i=o+1:a=o}return i},j.toArray=function(n){return n?j.isArray(n)?o.call(n):n.length===+n.length?j.map(n,j.identity):j.values(n):[]},j.size=function(n){return null==n?0:n.length===+n.length?n.length:j.keys(n).length},j.first=j.head=j.take=function(n,t,r){return null==n?void 0:null==t||r?n[0]:o.call(n,0,t)},j.initial=function(n,t,r){return o.call(n,0,n.length-(null==t||r?1:t))},j.last=function(n,t,r){return null==n?void 0:null==t||r?n[n.length-1]:o.call(n,Math.max(n.length-t,0))},j.rest=j.tail=j.drop=function(n,t,r){return o.call(n,null==t||r?1:t)},j.compact=function(n){return j.filter(n,j.identity)};var M=function(n,t,r){return t&&j.every(n,j.isArray)?c.apply(r,n):(A(n,function(n){j.isArray(n)||j.isArguments(n)?t?a.apply(r,n):M(n,t,r):r.push(n)}),r)};j.flatten=function(n,t){return M(n,t,[])},j.without=function(n){return j.difference(n,o.call(arguments,1))},j.uniq=j.unique=function(n,t,r,e){j.isFunction(t)&&(e=r,r=t,t=!1);var u=r?j.map(n,r,e):n,i=[],a=[];return A(u,function(r,e){(t?e&&a[a.length-1]===r:j.contains(a,r))||(a.push(r),i.push(n[e]))}),i},j.union=function(){return j.uniq(j.flatten(arguments,!0))},j.intersection=function(n){var t=o.call(arguments,1);return j.filter(j.uniq(n),function(n){return j.every(t,function(t){return j.indexOf(t,n)>=0})})},j.difference=function(n){var t=c.apply(e,o.call(arguments,1));return j.filter(n,function(n){return!j.contains(t,n)})},j.zip=function(){for(var n=j.max(j.pluck(arguments,"length").concat(0)),t=new Array(n),r=0;n>r;r++)t[r]=j.pluck(arguments,""+r);return t},j.object=function(n,t){if(null==n)return{};for(var r={},e=0,u=n.length;u>e;e++)t?r[n[e]]=t[e]:r[n[e][0]]=n[e][1];return r},j.indexOf=function(n,t,r){if(null==n)return-1;var e=0,u=n.length;if(r){if("number"!=typeof r)return e=j.sortedIndex(n,t),n[e]===t?e:-1;e=0>r?Math.max(0,u+r):r}if(y&&n.indexOf===y)return n.indexOf(t,r);for(;u>e;e++)if(n[e]===t)return e;return-1},j.lastIndexOf=function(n,t,r){if(null==n)return-1;var e=null!=r;if(b&&n.lastIndexOf===b)return e?n.lastIndexOf(t,r):n.lastIndexOf(t);for(var u=e?r:n.length;u--;)if(n[u]===t)return u;return-1},j.range=function(n,t,r){arguments.length<=1&&(t=n||0,n=0),r=arguments[2]||1;for(var e=Math.max(Math.ceil((t-n)/r),0),u=0,i=new Array(e);e>u;)i[u++]=n,n+=r;return i};var R=function(){};j.bind=function(n,t){var r,e;if(_&&n.bind===_)return _.apply(n,o.call(arguments,1));if(!j.isFunction(n))throw new TypeError;return r=o.call(arguments,2),e=function(){if(!(this instanceof e))return n.apply(t,r.concat(o.call(arguments)));R.prototype=n.prototype;var u=new R;R.prototype=null;var i=n.apply(u,r.concat(o.call(arguments)));return Object(i)===i?i:u}},j.partial=function(n){var t=o.call(arguments,1);return function(){return n.apply(this,t.concat(o.call(arguments)))}},j.bindAll=function(n){var t=o.call(arguments,1);if(0===t.length)throw new Error("bindAll must be passed function names");return A(t,function(t){n[t]=j.bind(n[t],n)}),n},j.memoize=function(n,t){var r={};return t||(t=j.identity),function(){var e=t.apply(this,arguments);return j.has(r,e)?r[e]:r[e]=n.apply(this,arguments)}},j.delay=function(n,t){var r=o.call(arguments,2);return setTimeout(function(){return n.apply(null,r)},t)},j.defer=function(n){return j.delay.apply(j,[n,1].concat(o.call(arguments,1)))},j.throttle=function(n,t,r){var e,u,i,a=null,o=0;r||(r={});var c=function(){o=r.leading===!1?0:new Date,a=null,i=n.apply(e,u)};return function(){var l=new Date;o||r.leading!==!1||(o=l);var f=t-(l-o);return e=this,u=arguments,0>=f?(clearTimeout(a),a=null,o=l,i=n.apply(e,u)):a||r.trailing===!1||(a=setTimeout(c,f)),i}},j.debounce=function(n,t,r){var e,u,i,a,o;return function(){i=this,u=arguments,a=new Date;var c=function(){var l=new Date-a;t>l?e=setTimeout(c,t-l):(e=null,r||(o=n.apply(i,u)))},l=r&&!e;return e||(e=setTimeout(c,t)),l&&(o=n.apply(i,u)),o}},j.once=function(n){var t,r=!1;return function(){return r?t:(r=!0,t=n.apply(this,arguments),n=null,t)}},j.wrap=function(n,t){return function(){var r=[n];return a.apply(r,arguments),t.apply(this,r)}},j.compose=function(){var n=arguments;return function(){for(var t=arguments,r=n.length-1;r>=0;r--)t=[n[r].apply(this,t)];return t[0]}},j.after=function(n,t){return function(){return--n<1?t.apply(this,arguments):void 0}},j.keys=w||function(n){if(n!==Object(n))throw new TypeError("Invalid object");var t=[];for(var r in n)j.has(n,r)&&t.push(r);return t},j.values=function(n){for(var t=j.keys(n),r=t.length,e=new Array(r),u=0;r>u;u++)e[u]=n[t[u]];return e},j.pairs=function(n){for(var t=j.keys(n),r=t.length,e=new Array(r),u=0;r>u;u++)e[u]=[t[u],n[t[u]]];return e},j.invert=function(n){for(var t={},r=j.keys(n),e=0,u=r.length;u>e;e++)t[n[r[e]]]=r[e];return t},j.functions=j.methods=function(n){var t=[];for(var r in n)j.isFunction(n[r])&&t.push(r);return t.sort()},j.extend=function(n){return A(o.call(arguments,1),function(t){if(t)for(var r in t)n[r]=t[r]}),n},j.pick=function(n){var t={},r=c.apply(e,o.call(arguments,1));return A(r,function(r){r in n&&(t[r]=n[r])}),t},j.omit=function(n){var t={},r=c.apply(e,o.call(arguments,1));for(var u in n)j.contains(r,u)||(t[u]=n[u]);return t},j.defaults=function(n){return A(o.call(arguments,1),function(t){if(t)for(var r in t)n[r]===void 0&&(n[r]=t[r])}),n},j.clone=function(n){return j.isObject(n)?j.isArray(n)?n.slice():j.extend({},n):n},j.tap=function(n,t){return t(n),n};var S=function(n,t,r,e){if(n===t)return 0!==n||1/n==1/t;if(null==n||null==t)return n===t;n instanceof j&&(n=n._wrapped),t instanceof j&&(t=t._wrapped);var u=l.call(n);if(u!=l.call(t))return!1;switch(u){case"[object String]":return n==String(t);case"[object Number]":return n!=+n?t!=+t:0==n?1/n==1/t:n==+t;case"[object Date]":case"[object Boolean]":return+n==+t;case"[object RegExp]":return n.source==t.source&&n.global==t.global&&n.multiline==t.multiline&&n.ignoreCase==t.ignoreCase}if("object"!=typeof n||"object"!=typeof t)return!1;for(var i=r.length;i--;)if(r[i]==n)return e[i]==t;var a=n.constructor,o=t.constructor;if(a!==o&&!(j.isFunction(a)&&a instanceof a&&j.isFunction(o)&&o instanceof o))return!1;r.push(n),e.push(t);var c=0,f=!0;if("[object Array]"==u){if(c=n.length,f=c==t.length)for(;c--&&(f=S(n[c],t[c],r,e)););}else{for(var s in n)if(j.has(n,s)&&(c++,!(f=j.has(t,s)&&S(n[s],t[s],r,e))))break;if(f){for(s in t)if(j.has(t,s)&&!c--)break;f=!c}}return r.pop(),e.pop(),f};j.isEqual=function(n,t){return S(n,t,[],[])},j.isEmpty=function(n){if(null==n)return!0;if(j.isArray(n)||j.isString(n))return 0===n.length;for(var t in n)if(j.has(n,t))return!1;return!0},j.isElement=function(n){return!(!n||1!==n.nodeType)},j.isArray=x||function(n){return"[object Array]"==l.call(n)},j.isObject=function(n){return n===Object(n)},A(["Arguments","Function","String","Number","Date","RegExp"],function(n){j["is"+n]=function(t){return l.call(t)=="[object "+n+"]"}}),j.isArguments(arguments)||(j.isArguments=function(n){return!(!n||!j.has(n,"callee"))}),"function"!=typeof/./&&(j.isFunction=function(n){return"function"==typeof n}),j.isFinite=function(n){return isFinite(n)&&!isNaN(parseFloat(n))},j.isNaN=function(n){return j.isNumber(n)&&n!=+n},j.isBoolean=function(n){return n===!0||n===!1||"[object Boolean]"==l.call(n)},j.isNull=function(n){return null===n},j.isUndefined=function(n){return n===void 0},j.has=function(n,t){return f.call(n,t)},j.noConflict=function(){return n._=t,this},j.identity=function(n){return n},j.times=function(n,t,r){for(var e=Array(Math.max(0,n)),u=0;n>u;u++)e[u]=t.call(r,u);return e},j.random=function(n,t){return null==t&&(t=n,n=0),n+Math.floor(Math.random()*(t-n+1))};var I={escape:{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"}};I.unescape=j.invert(I.escape);var T={escape:new RegExp("["+j.keys(I.escape).join("")+"]","g"),unescape:new RegExp("("+j.keys(I.unescape).join("|")+")","g")};j.each(["escape","unescape"],function(n){j[n]=function(t){return null==t?"":(""+t).replace(T[n],function(t){return I[n][t]})}}),j.result=function(n,t){if(null==n)return void 0;var r=n[t];return j.isFunction(r)?r.call(n):r},j.mixin=function(n){A(j.functions(n),function(t){var r=j[t]=n[t];j.prototype[t]=function(){var n=[this._wrapped];return a.apply(n,arguments),z.call(this,r.apply(j,n))}})};var N=0;j.uniqueId=function(n){var t=++N+"";return n?n+t:t},j.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var q=/(.)^/,B={"'":"'","\\":"\\","\r":"r","\n":"n","	":"t","\u2028":"u2028","\u2029":"u2029"},D=/\\|'|\r|\n|\t|\u2028|\u2029/g;j.template=function(n,t,r){var e;r=j.defaults({},r,j.templateSettings);var u=new RegExp([(r.escape||q).source,(r.interpolate||q).source,(r.evaluate||q).source].join("|")+"|$","g"),i=0,a="__p+='";n.replace(u,function(t,r,e,u,o){return a+=n.slice(i,o).replace(D,function(n){return"\\"+B[n]}),r&&(a+="'+\n((__t=("+r+"))==null?'':_.escape(__t))+\n'"),e&&(a+="'+\n((__t=("+e+"))==null?'':__t)+\n'"),u&&(a+="';\n"+u+"\n__p+='"),i=o+t.length,t}),a+="';\n",r.variable||(a="with(obj||{}){\n"+a+"}\n"),a="var __t,__p='',__j=Array.prototype.join,"+"print=function(){__p+=__j.call(arguments,'');};\n"+a+"return __p;\n";try{e=new Function(r.variable||"obj","_",a)}catch(o){throw o.source=a,o}if(t)return e(t,j);var c=function(n){return e.call(this,n,j)};return c.source="function("+(r.variable||"obj")+"){\n"+a+"}",c},j.chain=function(n){return j(n).chain()};var z=function(n){return this._chain?j(n).chain():n};j.mixin(j),A(["pop","push","reverse","shift","sort","splice","unshift"],function(n){var t=e[n];j.prototype[n]=function(){var r=this._wrapped;return t.apply(r,arguments),"shift"!=n&&"splice"!=n||0!==r.length||delete r[0],z.call(this,r)}}),A(["concat","join","slice"],function(n){var t=e[n];j.prototype[n]=function(){return z.call(this,t.apply(this._wrapped,arguments))}}),j.extend(j.prototype,{chain:function(){return this._chain=!0,this},value:function(){return this._wrapped}})}).call(this);
//# sourceMappingURL=underscore-min.map