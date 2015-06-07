function get(name){
    if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search))
        return decodeURIComponent(name[1]);
    else return '';
}


console.log(get("code"));
console.log(get("language"));
console.log(get("theme"));
