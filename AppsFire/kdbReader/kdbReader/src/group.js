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
        Group = KeePass.Group = function (initStructure) {
            var k = null;
            this.database = null;
            this.id = '';
            this.imageId = 0x00;
            this.name = '';
            this.created = new Date(1970, 1, 1);
            this.lastModified = new Date(1970, 1, 1);
            this.lastAccessed = new Date(1970, 1, 1);
            this.expires = new Date(1970, 1, 1);
            this.level = 0;
            this.flags = 0x00;
            this.subGroups = [];
            this.entries = {};
            this.parent = null;

            for (k in initStructure) {
                if (initStructure.hasOwnProperty(k)) {
                    this[k] = initStructure[k];
                }
            }
        };

    Group.prototype.addField = function (fieldType, fieldSize, decryptedPart, pos) {
        var fmt;
        switch (fieldType) {
        case 0x0000:
            this.database.extData.read(decryptedPart, fieldSize, this, null, pos);
            break;
        case 0x0001:
            this.id = struct.Unpack('<I', decryptedPart, pos)[0];
            break;
        case 0x0002:
            fmt = '<' + (fieldSize - 1).toString() + 's';
            this.name = struct.Unpack(fmt, decryptedPart, pos, fieldSize)[0];
            break;
        case 0x0003:
            this.created = readTime(decryptedPart, pos);
            break;
        case 0x0004:
            this.lastModified = readTime(decryptedPart, pos);
            break;
        case 0x0005:
            this.lastAccessed = readTime(decryptedPart, pos);
            break;
        case 0x0006:
            this.expires = readTime(decryptedPart, pos);
            break;
        case 0x0007:
            this.imageId = struct.Unpack('<I', decryptedPart, pos)[0];
            break;
        case 0x0008:
            this.level = struct.Unpack('<H', decryptedPart, pos)[0];
            break;
        case 0x0009:
            this.flags = struct.Unpack('<I', decryptedPart, pos)[0];
            break;
        case 0xFFFF:
            if (fieldSize !== 0) {
                throw S.error_unknown_field_type;
            }
            break;
        }
    };

    Group.prototype.addGroup = function (group) {
        this.subGroups.push(group);
    };

    Group.prototype.addEntry = function (entry) {
        this.entries[entry.uuid] = entry;
    };
}());