/* Example definition of a simple mode that understands a subset of
 * JavaScript:
 */
/*global CodeMirror */
(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
        mod(require("../../lib/codemirror"), require("../../addon/mode/simple"));
    else if (typeof define == "function" && define.amd) // AMD
        define(["../../lib/codemirror", "../../addon/mode/simple"], mod);
    else // Plain browser env
        mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";

    function wordRegexp(words) {
        // return new RegExp("^((" + words.join(")|(") + "))\\b");
        return new RegExp("^(" + words.join("|") + ")\\b");
    }

    CodeMirror.defineSimpleMode("pony", {
        // The start state contains the rules that are intially used
        start: [
            {regex: /"""/, token: "string", push: "multiline"},
            { regex: /"(?:[^\\]|\\.)*?"/, token: "string" },

            { regex: /=>/, token: "tag", indent: true},

            // use!!!!
            {regex: /(use)(\s+)("(?:[^\\]|\\.)*?")/,
             token: ['keyword', null, 'string']},

            // Actor regs
            {regex: /(actor)(\s+)([A-Za-z$][\w]*)/,
             token: ['keyword', null, 'variable-2'],
             indent: true},

            {regex: /(consume)(\s+)([_A-Za-z$][\w]*)*/,
             token: ['keyword', null, 'variable-2']},

            {regex: wordRegexp(["I8", "I16", "I32", "I64", "I128", "Bool", "U8", "U16", "U32", "U64", "U128", "F32", "F64", "Array", "Env", "File", "Float", "Range", "Number", "Options", "Signed", "Unsigned"]), token: ['atom']},

            // {regex: /(var|let)(\s+)([_A-Za-z][\w]*):(\s+)([A-Za-z][A-Za-z0-9\s$]*)/,
            //  token: ['keyword', null, 'variable-2', null, 'variable-3']},
            {regex: /(var|let)(\s+)([_A-Za-z][\w]*)/,
             token: ['keyword', null, 'variable-2']},

            {regex: /comment/,token: 'comment'},
            {regex: /atom/,token: 'atom'},
            {regex: /keyword/,token: 'keyword'},
            {regex: /property/,token: 'property'},
            {regex: /attribute/,token: 'attribute'},
            {regex: /builtin/,token: 'builtin'},
            {regex: /variable-3/,token: 'variable-3'},
            {regex: /variable-2/,token: 'variable-2'},
            {regex: /variable/,token: 'variable'},
            {regex: /header/,token: 'header'},
            {regex: /link/, token: 'link'},
            {regex: /error/, token: 'error'},
            {regex: /tag/,token: 'tag'},
            {regex: /def/,token: 'def'},
            {regex: /bracket/, token: 'bracket'},
            {regex: /number/,token: 'number'},
            {regex: /string-2/, token: "string-2"},
            {regex: /string/, token: 'string'},

            {regex: /:\s*/, token: "tag", push: 'htype'},
            // Keywords
            {regex: wordRegexp(['new', 'be', 'fun', 'iso|10', 'trn', 'ref', 'val', 'box|10', 'tag|10', 'break', 'continue', 'return', 'error', 'if', 'then', 'elseif', 'else', 'end', 'match', 'where', 'try', 'with', 'recover|10', 'consume|10', 'object', 'while', 'do', 'repeat', 'until', 'for', 'in', 'type', 'interface', 'trait', 'primitive|10', 'class', 'actor|10']),
             token: ['keyword']},
            // Rules are matched in the order in which they appear, so there is
            // no ambiguity between this one and the one above
            {regex: /(?:function|var|return|if|for|while|else|do|this)\b/,
             token: "keyword"},
            {regex: /true|false|null|undefined/, token: "atom"},
            {regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i,
             token: "number"},
            {regex: /\/\/.*/, token: "comment"},
            {regex: /\/(?:[^\\]|\\.)*?\//, token: "variable-3"},
            // A next property will cause the mode to move to a different state
            // {regex: /\/\*/, token: "comment", next: "comment"},
            {regex: /[-+\/*=<>!]+/, token: "operator"},
            // indent and dedent properties guide autoindentation
            {regex: /[\{\[\(]/, indent: true},
            {regex: /[\}\]\)]/, dedent: true},

            {regex: /[a-z$][\w$]*/, token: "variable"},

            {regex: /@[_A-Za-z][\w]*/, token: "atom"}
        ],
        multiline: [
            {regex: /"""/, token: "string", pop: true},
            {regex: /./, token: "string"}
        ],
        htype: [
            {regex: /(\s+)(iso|tag)/, pop: true, token: [null, "tag"]},
            {regex: /(\s+)/, pop: true, token: null},
            {regex: /[_A-Za-z][\w$]*/, token: 'variable-3'}
        ],
        // The multi-line comment state.
        comment: [
            // {regex: /.*?\*\//, token: "comment", next: "start"},
            // {regex: /.*/, token: "comment"}
        ],
        // The meta property contains global information about the mode. It
        // can contain properties like lineComment, which are supported by
        // all modes, and also directives like dontIndentStates, which are
        // specific to simple modes.
        meta: {
            dontIndentStates: ["comment"],
            lineComment: "//"
        }
    });

    CodeMirror.defineMIME("text/x-pony", "pony");
});
