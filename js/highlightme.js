function get(name){
    if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search))
        return decodeURIComponent(name[1]);
    else return '';
}

var code=get("code");
var lang=get("language");
var theme=get("theme");
var codec = document.getElementById("mycode");

// Right now don't do anything with theme

codec.textContent = code;

if(lang !== "" && lang !== "detect" && lang !== "autodetect") {
    codec.className = lang;
}
