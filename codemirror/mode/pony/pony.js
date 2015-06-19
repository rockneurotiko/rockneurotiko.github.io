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
            {regex: /"""/, token: "string-2", push: "multiline"},
            { regex: /"(?:[^\\]|\\.)*?"/, token: "string" },

            { regex: /=>/, token: "tag", indent: true},

            // use!!!!
            {regex: /(use)(\s+)("(?:[^\\]|\\.)*?")/,
             token: ['keyword', null, 'string']},

            // Actor regs
            {regex: /(actor)(\s+)([A-Za-z$][\w]*)/,
             token: ['def', null, 'variable-2'],
             indent: true},

            // new regs
            {regex: /(new)(\s+)/,
             token: ['def', null],
             push: 'fdec'},
            // be regs
            {regex: /(be)(\s+)/,
             token: ['def', null],
             push: 'fdec'},
            // func regs
            {regex: /(fun)(\s+)/,
             token: ['def', null],
             push: 'fdec'},
            // consume
            {regex: /(consume)(\s+)([_A-Za-z$][\w]*)*/,
             token: ['keyword', null, 'variable-2']},
            // variable declarations
            {regex: /(var|let)(\s+)([_A-Za-z][\w]*)/,
             token: ['keyword', null, 'attribute']},
            // pretty asignation
            {regex: /([_A-Za-z][\w$]+'*)(\s*)(=)/, token: ['attribute', null, 'tag']},


            // {regex: /comment/,token: 'comment'},
            // {regex: /atom/,token: 'atom'},
            // {regex: /keyword/,token: 'keyword'},
            // {regex: /property/,token: 'property'},
            // {regex: /attribute/,token: 'attribute'},
            // {regex: /builtin/,token: 'builtin'},
            // {regex: /variable-3/,token: 'variable-3'},
            // {regex: /variable-2/,token: 'variable-2'},
            // {regex: /variable/,token: 'variable'},
            // {regex: /header/,token: 'header'},
            // {regex: /link/, token: 'link'},
            // {regex: /error/, token: 'error'},
            // {regex: /tag/,token: 'tag'},
            // {regex: /def/,token: 'def'},
            // {regex: /bracket/, token: 'bracket'},
            // {regex: /number/,token: 'number'},
            // {regex: /string-2/, token: "string-2"},
            // {regex: /string/, token: 'string'},

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

            {regex: /[-+\/*=<>!]+/, token: "operator"},
            // indent and dedent properties guide autoindentation
            {regex: /[\{\[\(]/, indent: true, token: 'bracket'},
            {regex: /[\}\]\)]/, dedent: true, token: 'bracket'},

            {regex: wordRegexp(["I8", "I16", "I32", "I64", "I128", "Bool", "U8", "U16", "U32", "U64", "U128", "F32", "F64", "Array", "Env", "File", "Float", "Range", "Number", "Options", "Signed", "Unsigned", 'None']), token: ['atom']},

            {regex: /[a-z$][\w$]*/, token: "variable"},

            {regex: /@[_A-Za-z][\w]*/, token: "atom"}
        ],
        // multiline strings
        multiline: [
            {regex: /"""/, token: "string-2", pop: true},
            {regex: /./, token: "string-2"}
        ],

        // Function definition :)
        fdec: [
            {regex: /(iso|tag|ref)/, token: 'tag'},
            {regex: /\s+/, token: null},
            {regex: /[_a-z][\w]*/, token: 'variable-2'},
            {regex: /\(/, token: 'bracket', next: 'insideParameters'},
        ],
        // Between the () of definitions
        insideParameters: [
            {regex: /\)/, pop: true, token: 'bracket'},
            {regex: /:\s*/, push: 'htype', token: 'tag'},
            {regex: /\s+/, token: null},
            {regex: /(=)(\s+)([a-zA-Z"0-9]+'*)/, token: ['tag', null, 'variable-3']},
            {regex: /[_a-zA-Z]+'*/, token: 'variable-2'}
        ],
        // Type patterns
        htype: [
            {regex: /\s+/, token: null},
            {regex: /([_A-Za-z][\w$]*)(\s+)(iso|tag|ref|val)/, pop: true, token: ['variable-3', null, "tag"]},
            {regex: /[_A-Za-z][\w$]*/, pop: true, token: 'variable-3'},
        ],
        // The meta property contains global information about the mode. It
        // can contain properties like lineComment, which are supported by
        // all modes, and also directives like dontIndentStates, which are
        // specific to simple modes.
        meta: {
            dontIndentStates: ["multiline"],
            lineComment: "//"
        }
    });

    CodeMirror.defineMIME("text/x-pony", "pony");
});
