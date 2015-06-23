/*global Blob, saveAs, $, CodeMirror, RSAKey, CryptoJS, rng_seed_time, rng_get_bytes, byte2Hex */

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
    ['Line Numbers',
     "toggleEditorOpt('lineNumbers', 'bool');",
     function() {toggleEditorOpt('lineNumbers', 'bool');}],
    ['Line Wrapping',
     "toggleEditorOpt('lineWrapping', 'bool');",
     function() {toggleEditorOpt('lineWrapping', 'bool');}],
    ['Active line with style',
     "toggleEditorOpt('styleActiveLine', 'bool');",
     function() {toggleEditorOpt('styleActiveLine', 'bool');}],
    ['Match brackets',
     "toggleEditorOpt('matchBrackets', 'bool');",
     function() {toggleEditorOpt('matchBrackets', 'bool');}],
    ['Auto Close Brackets',
     "toggleEditorOpt('autoCloseBrackets', 'bool');",
     function() {toggleEditorOpt('autoCloseBrackets', 'bool');}],
    ['Auto Close Tags',
     "toggleEditorOpt('autoCloseTags', 'bool');",
     function() {toggleEditorOpt('autoCloseTags', 'bool');}],
    ['Auto Complete',
     "toggleEditorOpt('extraKeys', 'object', 'Ctrl-Space', 'autocomplete')",
     function() {toggleEditorOpt('extraKeys', 'object', 'Ctrl-Space', 'autocomplete');}],
    ['Fold code',
     "toggleEditorOpt('foldGutter', 'bool');",
     function() {toggleEditorOpt('foldGutter', 'bool');}],
    ['Lint code',
     "toggleEditorOpt('lint', 'bool');",
     function() {toggleEditorOpt('lint', 'bool');}],
    ['Highlight Selection',
     "toggleEditorOpt('highlightSelectionMatches', 'object', 'showToken', /\\w/)",
     function() {toggleEditorOpt('highlightSelectionMatches', 'object', 'showToken', /\\w/);}]
];

var baseremoteurl = 'http://codefiles.neurotiko.com';
// baseremoteurl = 'http://localhost:5000';

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

function fillDrop(name, array, fname, f1, f2, other) {

    var a = '<input id="ui-multiselect-0-option-0" type="checkbox" title="Option 1" value="option1" name="multiselect_0" aria-selected="false"></input><span></span>';
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
        var prev = (other) ? '<li><input id="ui-multiselect-0-option-0" type="checkbox" title="Option 1" value="option1" name="multiselect_0" aria-selected="false"></input><span onclick="': '<li><a href="#" onclick="';
        var end = (other) ? '</span></li>' : '</a></li>';
        drop.append(prev + f + '">' + text + end);
        // drop.append(prev + '<a href="#" onclick="' + f + '">' + text + '</a>' + end);
        // drop.append('<li><a href="#" onclick="' + f + '">' + text + '</a></li>');
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
    // var myData = [];
    // for(var i=0; i < features.length; i++) {
    //     myData.push({'id': i, 'label': features[i][0], 'isChecked': true});
    // }
    // $("#featuresdrop2").dropdownCheckbox({
    //     data: myData,
    //     title: "Editor Options",
    //     btnClass: 'btn btn-primary'
    // });
    // var items = $('#featuresdrop2').dropdownCheckbox("items");
    // var elems = $('#featuresdrop2 li');
    // for(var l in items) {
    //     $(elems[items[l].id]).on('click', features[items[l].id][2]);
    // }

    fillDrop('#featuresdrop', features, '', id, id, true);
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


function initializeUI() {
    editor = CodeMirror.fromTextArea(document.getElementById('mycode'), {
        lineNumbers: true,
        lineWrapping: true,
        styleActiveLine: true,
        matchBrackets: true,
        theme: 'monokai',
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

    initializeListeners();
}

var asyncinit = function asyncinit(code, lang, theme, hidespinner) {
    if (typeof hidespinner == 'undefined') {
        hidespinner = true;
    }

    if (typeof editor == 'undefined' || !editor) {
        initializeUI();
    }

    editor.setValue(code);

    if (theme === '') {
        theme = 'monokai';
    } else if (theme === 'random') {
        var styles = listStyles();
        theme = styles[Math.floor(Math.random() * styles.length)];
    }

    if (modeList.indexOf(lang) == -1) {
        lang = 'Unknown';
    }

    setLang(lang);

    selectStyle(theme.capitalizeFirstLetter());

    if (hidespinner) {
        $('#spinnerframe').hide();
    }
};

var initialize = function initialize() {
    CodeMirror.modeURL = "codemirror/mode/%N/%N.js";
    CodeMirror.commands.autocomplete = function(cm) {
        cm.showHint({hint: CodeMirror.hint.anyword});
    };
    initializeUI();
    // asyncinit('', '', '', false);

    var idinternal=get("idinternal") || '';
    var id=get("id") || '';
    var fromurl=get("fromurl") || '';
    var finalurl = '';

    var elegiblersa = false;

    if (id != '') {
        finalurl = baseremoteurl +'/' + id + '?callback=?';
        if (use_rsa) {
            var pciph = rsa.encrypt(ultra_password);
            finalurl = finalurl + "&cypherkey=" + pciph;
        } else {
            finalurl = finalurl + "&plainkey=" + ultra_password;
        }
    }

    if (idinternal != '') {
        finalurl = 'codefiles/'+ id + '.json?';
    }

    if (fromurl != '') {
        finalurl = fromurl + '?callback=?';  // Use jsonp callback mode
    }

    var code, lang, theme;
    if (finalurl != '') {
        $.getJSON(finalurl, function(json) {
            json = handleDecrypt(json);
            code = json.code || '';
            lang = json.language || json.lang || json.mode || '';
            theme = json.theme || '';
            asyncinit(code, lang, theme);
        }).fail(function() {
            code=get("code");
            lang=get("language") || get("lang") || get("mode");
            theme=get("theme");
            asyncinit(code, lang, theme);
        });
    } else {
        code=get("code");
        lang=get("language") || get("lang") || get("mode");
        theme=get("theme");
        asyncinit(code, lang, theme);
    }
};

function handleDecrypt(message) {
    if (!message.encrypted) {
        window.console.warn("Message not encrypted");
        return message;
    }
    if (message.algorithm != 'AES') {
        window.console.warn("Message not ciphered with AES");
        return message.msg;
    }
    var offset = message.offset;
    var key = CryptoJS.enc.Hex.parse(ultra_password),
        iv = CryptoJS.enc.Hex.parse(message.iv),
        cipher = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Base64.parse(message.msg)
        }),
        result = CryptoJS.AES.decrypt(cipher, key, {iv: iv, mode: CryptoJS.mode.CFB});

    return JSON.parse(result.toString(CryptoJS.enc.Utf8));
}

rng_seed_time();
var pwdarr = Array(32);
rng_get_bytes(pwdarr);
var ultra_password = '';
for(var i=0; i < pwdarr.length; i++) {
    ultra_password = ultra_password + byte2Hex(pwdarr[i]);
}

var use_rsa = true;
var get_rsa_path = baseremoteurl + '/getsshpub?callback=?';
var rsa = new RSAKey();
// create own private, 512 maybe?

function load_rsa_pub() {
    if (!use_rsa) {
        return;
    }
    use_rsa = false;  // by default
    $.getJSON(get_rsa_path, function(json) {
        if (json.status == 'ok') {
            rsa.setPublic(json.n, json.e);
            use_rsa = true;
        }
    });
}

load_rsa_pub();

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
