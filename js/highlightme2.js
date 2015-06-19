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

var features = [
    ['Line Numbers', "toggleEditorOpt('lineNumbers', 'bool');"],
    ['Line Wrapping', "toggleEditorOpt('lineWrapping', 'bool');"],
    ['Active line with style', "toggleEditorOpt('styleActiveLine', 'bool');"],
    ['Match brackets', "toggleEditorOpt('matchBrackets', 'bool');"],
    ['Auto Close Brackets', "toggleEditorOpt('autoCloseBrackets', 'bool');"],
    ['Auto Close Tags', "toggleEditorOpt('autoCloseTags', 'bool');"],
    ['Auto Complete', "toggleEditorOpt('extraKeys', 'object', 'Ctrl-Space', 'autocomplete')"],
    ['Fold code', "toggleEditorOpt('foldGutter', 'bool');"],
    ['Lint code', "toggleEditorOpt('lint', 'bool');"],
    ['Highlight Selection', "toggleEditorOpt('highlightSelectionMatches', 'object', 'showToken', /\\w/)"]
];

var editor = null;
String.prototype.capitalizeFirstLetter = function() {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

function isArray(v) {
    if (Array.isArray)
        return Array.isArray(v);
    else return v instanceof Array;
}

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
    var selector = $(drop).find("li:contains(\"" + name.capitalizeFirstLetter() + "\")");
    selector.map(function(v, a) {
        if (a.textContent.toLowerCase().replace(' ', '_') == name.toLowerCase().replace(' ', '_'))
            a.className = "active";
    });
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

function selectStyle(style) {
    $('#stylenav').text(style);
    editor.setOption('theme', style);
    toggleActiveClass('#stylesdrop', style);
}

function setLang(lang) {
    var ops = parseMode(lang.toLowerCase());
    var mode = ops.mode;
    var spec = ops.spec;
    editor.setOption('mode', spec);
    CodeMirror.autoLoadMode(editor, mode);
    $("#langnav").text(lang.capitalizeFirstLetter());
    toggleActiveClass('#languagesdrop', lang);
}

function copyLink() {
    copyToClipboard(generatelink());
}

function generatelink() {
    var url = window.location.href.split("?")[0];
    var mc = $("#mycode");
    var text = encodeURIComponent(mc.text());
    var lang = encodeURIComponent(getLangDetected());
    var theme = encodeURIComponent(editor.getOption('theme'));
    return url + "?" + "lang=" + lang + '&theme=' + theme + "&code=" + text;
}

function fillDrop(name, array, fname, f1, f2) {
    var drop = $(name);
    var f, text;
    for (var i in array) {
        var l = array[i];
        if (isArray(l)) {
            text = f1(l[0]);
            f = l[1];
        } else {
            f = fname + '(\'' + f1(l) + '\');';
            text = f1(l);
        }
        drop.append('<li><a href="#" onclick="' + f + '">' + text + '</a></li>');
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

function setEditorFeatures() {
    fillDrop('#featuresdrop', features, '', id, id);
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

function clone(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

function changeEditorOpt(opt, value) {
    editor.setOption(opt, value);
}

function toggleEditorOpt(opt, type, name, value) {
    if (type == "bool") {
        changeEditorOpt(opt, !editor.getOption(opt));
    } else if (type == "object") {
        var nobj = editor.getOption(opt) || {};
        nobj = clone(nobj);
        if (editor.getOption(opt)[name]) {
            nobj[name] = null;
            changeEditorOpt(opt, nobj);
        } else {
            nobj[name] = value;
            changeEditorOpt(opt, nobj);
        }
    }
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
    } else if (theme === 'random') {
        var styles = listStyles();
        theme = styles[Math.floor(Math.random() * styles.length)];
    }

    if (modeList.indexOf(lang) == -1) {
        lang = 'Unknown';
    }

    editor = CodeMirror.fromTextArea(document.getElementById('mycode'), {
        lineNumbers: true,
        lineWrapping: true,
        styleActiveLine: true,
        matchBrackets: true,
        theme: theme,
        autoCloseBrackets: true,
        autoCloseTags: true,
        extraKeys: {"Ctrl-Space": "autocomplete",
                    "Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); }},
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
        lint: true,
        highlightSelectionMatches: {showToken: /\w/}
        // keyMap: "emacs"
        // mode: lang
    });

    setLanguagesDrop();
    setStylesDrop();
    setEditorFeatures();

    setLang(lang);

    selectStyle(theme.capitalizeFirstLetter());

    initializeListeners();
};

var initialize = function initialize() {
    CodeMirror.modeURL = "codemirror/mode/%N/%N.js";
    CodeMirror.commands.autocomplete = function(cm) {
        cm.showHint({hint: CodeMirror.hint.anyword});
    };

    var id=get("id") || '';
    var fromurl=get("fromurl") || '';
    var finalurl = '';
    if (id != '') {
        finalurl = 'codefiles/'+ id + '.json';
    }
    if (fromurl != '') {
        finalurl = fromurl + '?callback=?';
    }

    var code, lang, theme;
    if (finalurl != '') {
        $.getJSON(finalurl, function(json) {
            code = json.code || '';
            lang = json.language || json.lang || json.mode || '';
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
// Improvements: buffers?
