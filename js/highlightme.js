/*global hljs, $ */

String.prototype.capitalizeFirstLetter = function() {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

function copyToClipboard(text) {
    window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
}

function get(name){
    var namel = (new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)'));
    namel = namel.exec(window.location.search);
    if(namel)
        return decodeURIComponent(namel[1]);
    else return '';
}


function scrollToDrop(drop) {
    $(drop).scrollTop(0);
    var pos = $(drop + ' li.active').position().top;
    if (pos > 100) {
        $(drop).scrollTop(pos - 100);
    }
}


function toggleActiveClass(drop, name) {
    $(drop + " li").removeClass("active");
    var selector = $(drop).find("li:contains(\"" + name + "\")");
    selector.map(function(v, a) {
        if (a.textContent.toLowerCase().replace(' ', '_') == name.toLowerCase().replace(' ', '_'))
            a.className = "active";
    });
}


function selectStyle(style) {
    $('link[title]').each(function(i, link) {
        link.disabled = (link.title != style);
    });
    toggleActiveClass('#stylesdrop', style);
}

function listStyles() {
    var l = [];
    $('link[title]').each(function(i, link) {
        l.push(link.title);
    });
    return l;
};

function getLangDetected() {
    var c = $("#mycode").attr('class') || '';
    return c.replace(' ', '').replace('hljs', '');
}

function safeEnter() {
    var str = $("#mycode").html();
    var regex = /<br\s*[\/]?>/gi;
    $("#mycode").html(str.replace(regex, "\n"));
    // Add \n at the end :)
    var text = $("#mycode").text();
    if (text[text.length] != "\n")
        $("#mycode").html($("#mycode").html() + "\n");
}

function rehighlight() {
    hljs.initHighlighting.called = false;
    hljs.initHighlighting();
    var lang = getLangDetected();
    $("#langnav").text(lang);
    toggleActiveClass("#languagesdrop", lang.capitalizeFirstLetter());
    safeEnter();
}

function setLang(lang) {
    var c = $("#mycode");
    c.attr('class', lang);
    gotonewlink(); // Reload, just rehighlight don't wors :(
}

function toggleedit() {
    var edit = $('#mycode').attr("contenteditable")  == 'true' || false;
    var btn = $('#editbutton');
    $("#mycode").attr("contenteditable", !edit);
    if (edit) {
        rehighlight();
        btn.text('Start Edit!');
        btn.removeClass('btn-danger');
        btn.addClass('btn-success');
    } else {
        $("#generatelinkbtn").removeClass("disabled");
        btn.text('Stop Edit!');
        btn.removeClass('btn-success');
        btn.addClass('btn-danger');
    }
}

function copyLink() {
    copyToClipboard(linkgenerate());
}

function linkgenerate() {
    var url = window.location.href.split("?")[0];
    var mc = $("#mycode");
    var text = encodeURIComponent(mc.text());
    var lang = encodeURIComponent(getLangDetected());
    return url + "?" + "lang=" + lang + "&code=" + text;
}

function gotonewlink() {
    window.location.href = linkgenerate();
}

function fillDrop(name, array, fname, f1, f2) {
    var drop = $(name);
    for (var i in array) {
        var l = array[i];
        drop.append('<li><a href="#" onclick="' + fname + '(\'' + f1(l) + '\');">' + f1(l) + '</a></li>');
    }
}

function id(n) { return n; };

function fCapit(s) {return s.capitalizeFirstLetter();};

function setStylesDrop() {
    fillDrop('#stylesdrop', listStyles(), 'selectStyle', fCapit, id);
};

function setLanguagesDrop() {
    fillDrop('#languagesdrop', hljs.listLanguages(), 'setLang', fCapit, id);
};

function initializeListeners() {
    $(".dropdown-toggle").attrchange({
        trackValues: true, // set to true so that the event object is updated with old & new values
        callback: function(evnt) {
            if(evnt.attributeName == "aria-expanded") { // which attribute you want to watch for changes
                if(evnt.newValue.search(/'true'/i) == -1) {
                    scrollToDrop('#stylesdrop');
                    scrollToDrop('#languagesdrop');
                }
            }
        }
    });
}

var asyncinit = function asyncinit(code, lang, theme) {
    var codec = document.getElementById("mycode");

    codec.textContent = code;

    setLanguagesDrop();
    setStylesDrop();

    if(lang !== "" && lang !== "detect" && lang !== "autodetect") {
        codec.className = lang;
    }
    // Right now don't do anything with theme
    if (theme === '')
        theme = 'monokai sublime';
    selectStyle(theme.capitalizeFirstLetter());

    rehighlight();
    if (code === '') {
        toggleedit();
    }

    initializeListeners();
};

var initialize = function initialize() {
    var id=get("id") || '';
    var code, lang, theme;
    if (id != '') {
        $.getJSON('codefiles/' + id + '.json', function(json) {
            code = json.code || '';
            lang = json.language || json.lang || '';
            theme = json.theme || '';
            asyncinit(code, lang, theme);
        });
    } else {
        code=get("code");
        lang=get("language") || get("lang");
        theme=get("theme");
        asyncinit(code, lang, theme);
    }
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
