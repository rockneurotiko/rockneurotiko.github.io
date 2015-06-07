/*global hljs, $ */

String.prototype.capitalizeFirstLetter = function() {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    // return this.charAt(0).toUpperCase() + this.slice(1);
};

function get(name){
    var namel = (new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)'));
    namel = namel.exec(window.location.search);
    if(namel)
        return decodeURIComponent(namel[1]);
    else return '';
}

function selectStyle(style) {
    $('link[title]').each(function(i, link) {
        link.disabled = (link.title != style);
    });
}

function listStyles() {
    var l = [];
    $('link[title]').each(function(i, link) {
        l.append(link.title);
    });
};

var initialize = function initialize() {
    var code=get("code");
    var lang=get("language");
    var theme=get("theme");
    var codec = document.getElementById("mycode");

    codec.textContent = code;

    if(lang !== "" && lang !== "detect" && lang !== "autodetect") {
        codec.className = lang;
    }
    // Right now don't do anything with theme
    if (theme === '')
        theme = 'monokai sublime';
    selectStyle(theme.capitalizeFirstLetter());

    hljs.initHighlighting.called = false;
    hljs.initHighlighting();
    // hljs.highlightBlock(codec);
};

if(window.attachEvent) {
    window.attachEvent('onload', initialize);
} else {
    if(window.onload) {
        var curronload = window.onload;
        var newonload = function() {
            curronload();
            initialize();
        };
        window.onload = newonload;
    } else {
        window.onload = initialize;
    }
}
