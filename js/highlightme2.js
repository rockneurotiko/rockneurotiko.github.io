/*global Blob, saveAs, $, CodeMirror */


var modeList = [
    "apl",
    "asciiarmor",
    "asn.1",
    "asterisk",
    "clike",
    "clojure",
    "cmake",
    "cobol",
    "coffeescript",
    "commonlisp",
    "css",
    "cypher",
    "d",
    "dart",
    "diff",
    "django",
    "dockerfile",
    "dtd",
    "dylan",
    "ebnf",
    "ecl",
    "eiffel",
    "erlang",
    "forth",
    "fortran",
    "gas",
    "gfm",
    "gherkin",
    "go",
    "groovy",
    "haml",
    "handlebars",
    "haskell",
    "haxe",
    "htmlembedded",
    "htmlmixed",
    "http",
    "idl",
    "index.html",
    "jade",
    "javascript",
    "jinja2",
    "julia",
    "kotlin",
    "livescript",
    "lua",
    "markdown",
    "mathematica",
    "meta.js",
    "mirc",
    "mllike",
    "modelica",
    "mumps",
    "nginx",
    "ntriples",
    "octave",
    "pascal",
    "pegjs",
    "perl",
    "php",
    "pig",
    "pony",
    "properties",
    "puppet",
    "python",
    "q",
    "r",
    "rpm",
    "rst",
    "ruby",
    "rust",
    "sass",
    "scala",
    "scheme",
    "shell",
    "sieve",
    "slim",
    "smalltalk",
    "smarty",
    "solr",
    "soy",
    "sparql",
    "spreadsheet",
    "sql",
    "stex",
    "stylus",
    "tcl",
    "textile",
    "tiddlywiki",
    "tiki",
    "toml",
    "tornado",
    "troff",
    "ttcn",
    "ttcn-cfg",
    "turtle",
    "vb",
    "vbscript",
    "velocity",
    "verilog",
    "xml",
    "xquery",
    "yaml",
    "z80"];

var editor = null;
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
    var posf = $(drop + ' li.active').position();
    if (typeof posf === 'undefined') {
        return;
    }
    var pos = posf.top;
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
    editor.setOption('theme', style);
    toggleActiveClass('#stylesdrop', style);
}

function listStyles() {
    var l = [];
    $('link').each(function(i, link) {
        var hr = link.href;
        if (hr.indexOf('theme') != -1) {
            l.push(hr.split('/')[hr.split('/').length-1].split('.')[0]);
        }
    });
    return l;
};

function getLangDetected() {
    return editor.getOption('mode');
}

function safeEnter() {
    var str = $("#mycode").html();
    var regex = /<br\s*[\/]?>/gi;
    $("#mycode").html(str.replace(regex, "\n"));
    // Add \n at the end :)
    var text = $("#mycode").text();
    if (text[0] != '\n')
        $('#mycode').html('\n' + $('#mycode').html());
    text = $("#mycode").text();
    if (text[text.length] != "\n")
        $("#mycode").html($("#mycode").html() + "\n");
}

function setLang(lang) {
    var ops = parseMode(lang.toLowerCase());
    var mode = ops.mode;
    var spec = ops.spec;
    editor.setOption('mode', spec);
    CodeMirror.autoLoadMode(editor, mode);
    $("#langnav").text(lang);
    toggleActiveClass('#languagesdrop', spec);
}

function copyLink() {
    copyToClipboard(linkgenerate());
}

function linkgenerate() {
    var url = window.location.href.split("?")[0];
    var mc = $("#mycode");
    var text = encodeURIComponent(mc.text());
    var lang = encodeURIComponent(getLangDetected());
    var theme = encodeURIComponent(editor.getOption('theme'));
    return url + "?" + "lang=" + lang + '&theme=' + theme + "&code=" + text;
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
    fillDrop('#languagesdrop', modeList, 'setLang', fCapit, id);
};

function localSaveJson() {
    var code = editor.getValue();
    var lang = editor.getOption('mode');
    var theme = editor.getOption('theme');
    var rjson = {lang: lang, theme: theme, code: code};
    var blob = new Blob([JSON.stringify(rjson, null, 4)], {type: "text/json;charset=utf-8"});
    saveAs(blob, "awesome_code_" + lang + ".json");
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

function parseMode(mode) {
    var rmode = mode, spec = mode;
    var info = CodeMirror.findModeByExtension(mode);
    if (info) {
        rmode = info.mode;
        spec = info.mime;
    } else {
        info = CodeMirror.findModeByMIME(mode);
        if (info) {
            rmode = info.mode;
            spec = info.mime;
        }
    }
    return {mode: rmode, spec: spec};
}

var asyncinit = function asyncinit(code, lang, theme) {
    var codec = document.getElementById("mycode");

    codec.textContent = code;

    if (theme === '') {
        theme = 'monokai';
    }

    if (modeList.indexOf(lang) == -1) {
        lang = 'Unknown';
    }

    editor = CodeMirror.fromTextArea(document.getElementById('mycode'), {
        lineNumbers: true,
        styleActiveLine: true,
        matchBrackets: true,
        theme: theme
        // keyMap: "emacs"
        // mode: lang
    });

    setLang(lang);

    setLanguagesDrop();
    setStylesDrop();

    selectStyle(theme.capitalizeFirstLetter());

    initializeListeners();
};

var initialize = function initialize() {
    CodeMirror.modeURL = "codemirror/mode/%N/%N.js";
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
        lang=get("language") || get("lang") || get("mode");
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
