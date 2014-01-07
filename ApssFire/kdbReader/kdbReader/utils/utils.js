/* Copyright (C) 2012 Richard Mitchell
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/*jslint bitwise: true, white: true, browser: true */
/*global CryptoJS: true */
(function () {
    "use strict";

    var KeePass = window.KeePass || {},
        U = KeePass.utils = KeePass.utils || {};


    U.byteArrayToWordArray = function (arr) {
        var words = [],
            i,
            padding = 4 - (arr.length % 4),
            byte1, byte2, byte3, byte4;
        for (i = 0; i < arr.length + padding; i += 4) {
            byte1 = arr[i];
            byte2 = arr[i + 1] === undefined ? 0 : arr[i + 1];
            byte3 = arr[i + 2] === undefined ? 0 : arr[i + 2];
            byte4 = arr[i + 3] === undefined ? 0 : arr[i + 3];
            words.push((byte1 << 24) | (byte2 << 16) | (byte3 << 8) | byte4);
        }
        return CryptoJS.lib.WordArray.create(words, arr.length);
    };

    U.wordArrayToByteArray = function (arr) {
        return arr.toString(CryptoJS.enc.Latin1).split('').map(function (i) {
            return i.charCodeAt(0);
        });
    };
}());