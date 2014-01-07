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
/*jslint browser: true */
/*global struct: true */
(function () {
    "use strict";

    var KeePass = window.KeePass = window.KeePass || {},
        readTime = KeePass.Time.readTime,
        Entry = KeePass.Entry = function (initStructure) {
            var k = null;
            this.database = null;
            this.uuid = '';
            this.groupId = 0x00;
            this.imageId = 0x00;
            this.title = '';
            this.url = '';
            this.userName = '';
            this.password = '';
            this.additional = '';
            this.created = new Date(0);
            this.lastModified = new Date(0);
            this.lastAccessed = new Date(0);
            this.expires = new Date(0);
            this.binaryDescription = '';
            this.binaryData = '';

            for (k in initStructure) {
                if (initStructure.hasOwnProperty(k)) {
                    this[k] = initStructure[k];
                }
            }
        };

    Entry.prototype.addField = function (fieldType, fieldSize, decryptedPart, pos) {
        var fmt;
        switch (fieldType) {
        case 0x0000:
            this.database.extData.read(decryptedPart, fieldSize, null, this, pos);
            break;
        case 0x0001:
            this.uuid = struct.Unpack('<16s', decryptedPart, pos)[0];
            break;
        case 0x0002:
            this.groupId = struct.Unpack('<I', decryptedPart, pos)[0];
            break;
        case 0x0003:
            this.imageId = struct.Unpack('<I', decryptedPart, pos)[0];
            break;
        case 0x0004:
            fmt = '<' + (fieldSize - 1).toString() + 's';
            this.title = struct.Unpack(fmt, decryptedPart, pos)[0];
            break;
        case 0x0005:
            fmt = '<' + (fieldSize - 1).toString() + 's';
            this.url = struct.Unpack(fmt, decryptedPart, pos)[0];
            break;
        case 0x0006:
            fmt = '<' + (fieldSize - 1).toString() + 's';
            this.userName = struct.Unpack(fmt, decryptedPart, pos)[0];
            break;
        case 0x0007:
            fmt = '<' + (fieldSize - 1).toString() + 's';
            this.password = struct.Unpack(fmt, decryptedPart, pos)[0];
            break;
        case 0x0008:
            fmt = '<' + (fieldSize - 1).toString() + 's';
            this.additional = struct.Unpack(fmt, decryptedPart, pos)[0];
            break;
        case 0x0009:
            this.created = readTime(decryptedPart, pos);
            break;
        case 0x000A:
            this.lastModified = readTime(decryptedPart, pos);
            break;
        case 0x000B:
            this.lastAccessed = readTime(decryptedPart, pos);
            break;
        case 0x000C:
            this.expires = readTime(decryptedPart, pos);
            break;
        case 0x000D:
            fmt = '<' + (fieldSize - 1).toString() + 's';
            this.binaryDescription = struct.Unpack(fmt, decryptedPart, pos)[0];
            break;
        case 0x000E:
            fmt = '<' + fieldSize.toString() + 's';
            this.binaryData = struct.Unpack(fmt, decryptedPart, pos)[0];
            break;
        case 0xFFFF:
            if (fieldSize !== 0) {
                throw S.error_unknown_field_type;
            }
            break;
        }
    };
}());