/*global hljs */
function get(name){
    var namel = (new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)'));
    namel = namel.exec(window.location.search);
    if(namel)
        return decodeURIComponent(namel[1]);
    else return '';
}

var initialize = function initialize() {
    var code=get("code");
    var lang=get("language");
    var theme=get("theme");
    var codec = document.getElementById("mycode");

    // Right now don't do anything with theme

    codec.textContent = code;

    if(lang !== "" && lang !== "detect" && lang !== "autodetect") {
        codec.className = lang;
    }
    hljs.initHighlighting.called = false;
    hljs.initHighlighting();
    hljs.highlightBlock(codec);
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
