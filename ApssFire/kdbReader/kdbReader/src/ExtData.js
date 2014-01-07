/* KeePassJS - A JavaScript port of KeePassLib.
 * Copyright (C) 2012 Richard Mitchell
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see http://www.gnu.org/licenses/.
 */
/*jslint unparam: true, white: true, browser: true */
/*global struct: true */
(function () {
    "use strict";
    // Random data to pad the file out to prevent guessing attacks

    var KeePass = window.KeePass = window.KeePass || {},
        S = KeePass.strings = KeePass.strings || {},
        ExtData = KeePass.ExtData = function (headerHash) {
        this.headerHash = headerHash;
    };

    ExtData.prototype.read = function (data, size, group, entry, pos) {
        if (size === 0) {
            return;
        }
        var eos = false,
            result = true,
            fieldType = 0,
            fieldSize = 0,
            fieldData = '';

        while (!eos) {
            fieldType = struct.Unpack('<H', data, pos)[0];
            fieldSize = struct.Unpack('<I', data, pos += 2)[0];
            pos += 4;
            if (fieldSize > 0) {
                fieldData = struct.Unpack('<' + fieldSize.toString() + 's',
                                          data, pos)[0];
                pos += fieldSize;
            }

            switch (fieldType) {
            case 0x0000:
                // Ignore field
                break;
            case 0x0001:
                if (fieldSize === this.headerHash.length) {
                    result = this.headerHash === fieldData;
                }
                break;
            case 0x0002:
                // Ignore random data
                break;
            case 0xFFFF:
                eos = true;
                break;
            default:
                throw S.error_unknown_field_type;
            }
            if (!result) {
                throw S.error_padding_data_mismatch;
            }
        }
    };
}());