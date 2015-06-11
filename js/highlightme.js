/*global hljs, $ */

String.prototype.capitalizeFirstLetter = function() {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    // return this.charAt(0).toUpperCase() + this.slice(1);
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
    var pos = $(drop + ' li.active').position().top;
    if (pos > 100) {
        $(drop).scrollTop(pos - 100);
    }
}

function selectStyle(style) {
    $('link[title]').each(function(i, link) {
        link.disabled = (link.title != style);
    });
    $("#stylesdrop li").removeClass("active");
    $("#stylesdrop").find("li:contains(\"" + style + "\")").addClass("active");
    var t = $('#stylesdrop li.active');
    var t2 = t.position().top;
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
}

function rehighlight() {
    hljs.initHighlighting.called = false;
    hljs.initHighlighting();
    $("#langnav").text(getLangDetected());
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


function setStylesDrop() {
    var langsdrop = $("#stylesdrop");
    var langs = listStyles();
    for (var i in langs) {
        var l = langs[i];
        langsdrop.append('<li><a href="#" onclick="selectStyle(\'' + l.capitalizeFirstLetter() + '\');">' + l + '</a></li>');
    }
};


function setLanguagesDrop() {
    var langsdrop = $("#languagesdrop");
    var langs = hljs.listLanguages();
    for (var i in langs) {
        var l = langs[i];
        langsdrop.append('<li><a href="#" onclick="setLang(\'' + l + '\');">' + l + '</a></li>');
    }
};

function initializeListeners() {
    $(".dropdown-toggle").attrchange({
        trackValues: true, // set to true so that the event object is updated with old & new values
        callback: function(evnt) {
            if(evnt.attributeName == "aria-expanded") { // which attribute you want to watch for changes
                if(evnt.newValue.search(/'true'/i) == -1) {
                    scrollToDrop('#stylesdrop');
                }
            }
        }
    });
    $("#stylesdrop").on('show', function() {
        scrollToDrop('#stylesdrop');
    });
}

var initialize = function initialize() {
    var code=get("code");
    var lang=get("language") || get("lang");
    var theme=get("theme");
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
