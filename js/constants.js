/*global  toggleEditorOpt */
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
     function(event) {if(event.buttons > 0) toggleEditorOpt('lineNumbers', 'bool');},
     true],
    ['Line Wrapping',
     "toggleEditorOpt('lineWrapping', 'bool');",
     function(event) {if(event.buttons > 0) toggleEditorOpt('lineWrapping', 'bool');},
     true],
    ['Active line with style',
     "toggleEditorOpt('styleActiveLine', 'bool');",
     function(event) {if(event.buttons > 0) toggleEditorOpt('styleActiveLine', 'bool');},
     true],
    ['Match brackets',
     "toggleEditorOpt('matchBrackets', 'bool');",
     function(event) {if(event.buttons > 0) toggleEditorOpt('matchBrackets', 'bool');},
     true],
    ['Auto Close Brackets',
     "toggleEditorOpt('autoCloseBrackets', 'bool');",
     function(event) {if(event.buttons > 0) toggleEditorOpt('autoCloseBrackets', 'bool');},
     true],
    ['Auto Close Tags',
     "toggleEditorOpt('autoCloseTags', 'bool');",
     function(event) {if(event.buttons > 0) toggleEditorOpt('autoCloseTags', 'bool');},
     true],
    ['Show Cursor when Selecting',
     "toggleEditorOpt('showCursorWhenSelecting', 'bool');",
     function(event) {if(event.buttons > 0) toggleEditorOpt('showCursorWhenSelecting', 'bool');},
     true],
    ['Show Trailing WhiteSpace',
     "toggleEditorOpt('showTrailingSpace', 'bool');",
     function(event) {if(event.buttons > 0) toggleEditorOpt('showTrailingSpace', 'bool');},
     true],
    ['Auto Complete',
     "toggleEditorOpt('extraKeys', 'object', 'Alt-/', 'autocomplete')",
     function(event) {if(event.buttons > 0) toggleEditorOpt('extraKeys', 'object', 'Alt-/', 'autocomplete');},
     true],
    ['Fold code',
     "toggleEditorOpt('foldGutter', 'bool');",
     function(event) {if(event.buttons > 0) toggleEditorOpt('foldGutter', 'bool');},
     false],
    ['Lint code',
     "toggleEditorOpt('lint', 'bool');",
     function(event) {if(event.buttons > 0) toggleEditorOpt('lint', 'bool');},
     true],
    ['Highlight Selection',
     "toggleEditorOpt('highlightSelectionMatches', 'object', 'showToken', /\\w/)",
     function(event) {if(event.buttons > 0) toggleEditorOpt('highlightSelectionMatches', 'object', 'showToken', /\w/);},
     false]
];

var editorModes = {
    emacs: {
        bindings: {
            "Ctrl-W": "Kill Region",
            "Ctrl-K": "Kill Line",
            "Alt-W": "Copy Selection",
            "Ctrl-Y": "Paste in cursor",
            "Alt-Y": "Paste replacing selection",

            "Ctrl-Space": "Set mark",
            "Ctrl-Shift-2": "Set mark",

            "Ctrl-F": "Move one character right",
            "Right": "Move one character right",
            "Ctrl-B": "Move one character left",
            "Left": "Move one character left",
            "Ctrl-D": "Delete next character",
            "Delete": "Delete next character",
            "Ctrl-H": "Delete previous character",
            "Backspace": "Delete previous character",

            "Alt-F": move(byWord, 1), "Alt-B": move(byWord, -1),
            "Alt-D": function(cm) { killTo(cm, byWord, 1); },
            "Alt-Backspace": function(cm) { killTo(cm, byWord, -1); },

            "Ctrl-N": move(byLine, 1), "Ctrl-P": move(byLine, -1),
            "Down": move(byLine, 1), "Up": move(byLine, -1),
            "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
            "End": "goLineEnd", "Home": "goLineStart",

            "Alt-V": move(byPage, -1), "Ctrl-V": move(byPage, 1),
            "PageUp": move(byPage, -1), "PageDown": move(byPage, 1),

            "Ctrl-Up": move(byParagraph, -1), "Ctrl-Down": move(byParagraph, 1),

            "Alt-A": move(bySentence, -1), "Alt-E": move(bySentence, 1),
            "Alt-K": function(cm) { killTo(cm, bySentence, 1); },

            "Ctrl-Alt-K": function(cm) { killTo(cm, byExpr, 1); },
            "Ctrl-Alt-Backspace": function(cm) { killTo(cm, byExpr, -1); },
            "Ctrl-Alt-F": move(byExpr, 1), "Ctrl-Alt-B": move(byExpr, -1),

            "Shift-Ctrl-Alt-2": function(cm) {
                var cursor = cm.getCursor();
                cm.setSelection(findEnd(cm, cursor, byExpr, 1), cursor);
            },
            "Ctrl-Alt-T": function(cm) {
                var leftStart = byExpr(cm, cm.getCursor(), -1), leftEnd = byExpr(cm, leftStart, 1);
                var rightEnd = byExpr(cm, leftEnd, 1), rightStart = byExpr(cm, rightEnd, -1);
                cm.replaceRange(cm.getRange(rightStart, rightEnd) + cm.getRange(leftEnd, rightStart) +
                                cm.getRange(leftStart, leftEnd), leftStart, rightEnd);
            },
            "Ctrl-Alt-U": repeated(toEnclosingExpr),

            "Alt-Space": function(cm) {
                var pos = cm.getCursor(), from = pos.ch, to = pos.ch, text = cm.getLine(pos.line);
                while (from && /\s/.test(text.charAt(from - 1))) --from;
                while (to < text.length && /\s/.test(text.charAt(to))) ++to;
                cm.replaceRange(" ", Pos(pos.line, from), Pos(pos.line, to));
            },
            "Ctrl-O": repeated(function(cm) { cm.replaceSelection("\n", "start"); }),
            "Ctrl-T": repeated(function(cm) {
                cm.execCommand("transposeChars");
            }),

            "Alt-C": repeated(function(cm) {
                operateOnWord(cm, function(w) {
                    var letter = w.search(/\w/);
                    if (letter == -1) return w;
                    return w.slice(0, letter) + w.charAt(letter).toUpperCase() + w.slice(letter + 1).toLowerCase();
                });
            }),
            "Alt-U": repeated(function(cm) {
                operateOnWord(cm, function(w) { return w.toUpperCase(); });
            }),
            "Alt-L": repeated(function(cm) {
                operateOnWord(cm, function(w) { return w.toLowerCase(); });
            }),

            "Alt-;": "toggleComment",

            "Ctrl-/": repeated("undo"), "Shift-Ctrl--": repeated("undo"),
            "Ctrl-Z": repeated("undo"), "Cmd-Z": repeated("undo"),
            "Shift-Alt-,": "goDocStart", "Shift-Alt-.": "goDocEnd",
            "Ctrl-S": "findNext", "Ctrl-R": "findPrev", "Ctrl-G": quit, "Shift-Alt-5": "replace",
            "Alt-/": "autocomplete",
            "Ctrl-J": "newlineAndIndent", "Enter": false, "Tab": "indentAuto",

            "Alt-G G": function(cm) {
                var prefix = getPrefix(cm, true);
                if (prefix != null && prefix > 0) return cm.setCursor(prefix - 1);

                getInput(cm, "Goto line", function(str) {
                    var num;
                    if (str && !isNaN(num = Number(str)) && num == num|0 && num > 0)
                        cm.setCursor(num - 1);
                });
            },

            "Ctrl-X Tab": function(cm) {
                cm.indentSelection(getPrefix(cm, true) || cm.getOption("indentUnit"));
            },
            "Ctrl-X Ctrl-X": function(cm) {
                cm.setSelection(cm.getCursor("head"), cm.getCursor("anchor"));
            },
            "Ctrl-X Ctrl-S": "save",
            "Ctrl-X Ctrl-W": "save",
            "Ctrl-X S": "saveAll",
            "Ctrl-X F": "open",
            "Ctrl-X U": repeated("undo"),
            "Ctrl-X K": "close",
            "Ctrl-X Delete": function(cm) { kill(cm, cm.getCursor(), bySentence(cm, cm.getCursor(), 1), true); },
            "Ctrl-X H": "selectAll",

            "Ctrl-Q Tab": repeated("insertTab"),
            "Ctrl-U": addPrefixMap
        }
    },

    vim: {},
    sublime: {
        bindings: {
            "Alt-Left": "goSubwordLeft",
            "Alt-Right": "goSubwordRight",
            "Ctrl-Up": "scrollLineUp",
            "Ctrl-Down": "scrollLineDown",
            "Shift-Ctrl-L": "splitSelectionByLine",
            "Shift-Tab": "indentLess",
            "Esc": "singleSelectionTop",
            "Ctrl-L": "selectLine",
            "Shift-Ctrl-K": "deleteLine",
            "Ctrl-Enter": "insertLineAfter",
            "Shift-Ctrl-Enter": "insertLineBefore",
            "Ctrl-D": "selectNextOccurrence",
            "Shift-Ctrl-Space": "selectScope",
            "Shift-Ctrl-M": "selectBetweenBrackets",
            "Ctrl-M": "goToBracket",
            "Shift-Ctrl-Up": "swapLineUp",
            "Shift-Ctrl-Down": "swapLineDown",
            "Ctrl-/": "toggleComment",
            "Ctrl-J": "joinLines",
            "Shift-Ctrl-D": "duplicateLine",
            "Ctrl-T": "transposeChars",
            "F9": "sortLines",
            "Ctrl-F9": "sortLinesInsensitive",
            "F2": "nextBookmark",
            "Shift-F2": "prevBookmark",
            "Ctrl-F2": "toggleBookmark",
            "Shift-Ctrl-F2": "clearBookmarks",
            "Alt-F2": "selectBookmarks",
            "Alt-Q": "wrapLines",
            "Ctrl-K Ctrl-Backspace": "delLineLeft",
            "Backspace": "smartBackspace",
            "Ctrl-K Ctrl-K": "delLineRight",
            "Ctrl-K Ctrl-U": "upcaseAtCursor",
            "Ctrl-K Ctrl-L": "downcaseAtCursor",
            "Ctrl-K Ctrl-Space": "setSublimeMark",
            "Ctrl-K Ctrl-A": "selectToSublimeMark",
            "Ctrl-K Ctrl-W": "deleteToSublimeMark",
            "Ctrl-K Ctrl-X": "swapWithSublimeMark",
            "Ctrl-K Ctrl-Y": "sublimeYank",
            "Ctrl-K Ctrl-G": "clearBookmarks",
            "Ctrl-K Ctrl-C": "showInCenter",
            "Shift-Alt-Up": "selectLinesUpward",
            "Shift-Alt-Down": "selectLinesDownward",
            "Ctrl-F3": "findUnder",
            "Shift-Ctrl-F3": "findUnderPrevious",
            "Shift-Ctrl-[": "fold",
            "Shift-Ctrl-]": "unfold",
            "Ctrl-K Ctrl-j": "unfoldAll",
            "Ctrl-K Ctrl-0": "unfoldAll",
            "Ctrl-H": "replace"
        }
    }
};

var baseremoteurl = 'http://codefiles.neurotiko.com';
// baseremoteurl = 'http://localhost:5000';

var editor = null;
