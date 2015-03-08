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
/*jslint bitwise: true, nomen: true, unparam: true, todo: true, white: true, browser: true */
/*global struct: true, CryptoJS: true */
(function () {
    "use strict";

    var KeePass = window.KeePass = window.KeePass || {},
        C = KeePass.constants || {},
        U = KeePass.utils || {},
        S = KeePass.strings || {},
        E = KeePass.events || {},
        Group = KeePass.Group,
        Entry = KeePass.Entry,
        ExtData = KeePass.ExtData,
        Database = KeePass.Database = function (manager) {
        this.manager = manager;
        this.algorithm = null;
        this.groupCount = 0;
        this.groups = {};
        this.subGroups = [];
        this.entries = {};
        this.extData = null;
        this.signature1 = 0x0000;
        this.signature2 = 0x0000;
        this.flags = 0x000;
        this.version = 0x000;
        this.masterSeed = '';
        this.encryptionIV = '';
        this.masterSeed2 = '';
        this.keyEncryptionRounds = 0x0000;
    };

    Database.prototype.addGroup = function (group) {
        this.subGroups.push(group);
    };

    Database.prototype._decryptWithTransformedKey = function(transformedMasterKey, data) {
	var finalKey, cipherParams, encryptedPart, decryptedPart, fieldType, fieldSize,
	    decryptedPartByteArray, headerHash, lastGroupLevel, lastGroup = this,
	    group, entry, currentGroup, currentEntry, pos = 0;

        if (!transformedMasterKey) {
            throw S.error_failed_to_open;
        }

        // Hash the master password with the salt in the file
        finalKey = CryptoJS.SHA256(this.masterSeed.concat(transformedMasterKey));

        if ((data.length - C.HEADER_SIZE) % 16 !== 0) {
            throw S.error_bad_file_size;
        }

        this.manager.status(S.decrypting_db);
        encryptedPart = CryptoJS.enc.Latin1.parse(data.slice(C.HEADER_SIZE));

        if (this.algorithm === C.ALGO_AES) {
            // Decrypt! The first bytes aren't encrypted (that's the header)
            cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: encryptedPart,
                key: finalKey,
                mode: CryptoJS.mode.CBC,
                iv: this.encryptionIV,
                padding: CryptoJS.pad.Pkcs7,
                algorithm: CryptoJS.algo.AES
            });
            decryptedPart = CryptoJS.AES.decrypt(cipherParams,
            finalKey, {
                mode: CryptoJS.mode.CBC,
                iv: this.encryptionIV,
                padding: CryptoJS.pad.Pkcs7
            });
        } else if (this.algorithm === C.ALGO_TWOFISH) {
            cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: encryptedPart,
                key: finalKey,
                mode: CryptoJS.mode.CBC,
                iv: this.encryptionIV,
                padding: CryptoJS.pad.Pkcs7,
                algorithm: CryptoJS.algo.AES
            });
            decryptedPart = CryptoJS.TwoFish.decrypt(cipherParams,
            finalKey, {
                mode: CryptoJS.mode.CBC,
                iv: this.encryptionIV,
                padding: CryptoJS.pad.Pkcs7
            });
        } else {
            this.manager.status(null);
            throw S.error_failed_to_open;
        }

        if (decryptedPart.words.length > 2147483446 || (decryptedPart.words.length === 0 && (groupCount !== 0 || entryCount !== 0))) {
            this.manager.status(null);
            throw S.error_invalid_key;
        }

        this.manager.status(S.verifying_contents);

        decryptedPartByteArray = U.wordArrayToByteArray(decryptedPart);

        /* TODO: something seems to go wrong in the last 4 bytes of
         * decryption. Enable this again once decryption fixed.
         * if (this.contentsHash != CryptoJS.SHA256(decryptedPart)) {
            throw "Invalid key.";
        }*/

        this.manager.status(S.loading_contents);

        function _hashHeader(data) {
            // SHA256 of header - excluding the contents hash
            var headerSize = 124, // (bytes)
                endCount = 32 + 4, // masterSeed2 + keyEncRounds
                startCount = headerSize - endCount - 32, // signature1, signature2, flags, version, masterSeed, IV, group count, entry count
                toHash = data.slice(0, startCount) + data.slice(headerSize - endCount, headerSize),
                hashWords = CryptoJS.SHA256(CryptoJS.enc.Latin1.parse(toHash));

            return hashWords.toString(CryptoJS.enc.Latin1).slice(0, 32);
        }

        headerHash = _hashHeader(data);
        this.extData = new ExtData(headerHash);

        lastGroupLevel = currentGroup = pos = 0;
        group = new Group({
            database: this,
            parent: this
        });
        while (currentGroup < this.groupCount) {
            fieldType = struct.Unpack('<H', decryptedPartByteArray, pos)[0];
            pos += 2;
            fieldSize = struct.Unpack('<I', decryptedPartByteArray, pos)[0];
            pos += 4;

            group.addField(fieldType, fieldSize, decryptedPartByteArray, pos);

            if (fieldType === 0xFFFF) {
                currentGroup += 1;
                this.groups[group.id] = group;
                if (group.level <= lastGroupLevel) {
                    while (lastGroup && lastGroup.level >= group.level) {
                        lastGroup = lastGroup.parent;
                    }
                }
                if (lastGroup) {
                    lastGroup.addGroup(group);
                    group.parent = lastGroup;
                }
                lastGroupLevel = group.level;
                lastGroup = group;
                group = new Group({
                    database: this
                });
            }

            pos += fieldSize;
        }

        currentEntry = 0;
        entry = new Entry({
            database: this
        });
        while (currentEntry < this.entryCount) {
            fieldType = struct.Unpack('<H', decryptedPartByteArray, pos)[0];
            pos += 2;
            fieldSize = struct.Unpack('<I', decryptedPartByteArray, pos)[0];
            pos += 4;
            if (fieldSize) {
                entry.addField(fieldType, fieldSize, decryptedPartByteArray, pos);
            }

            if (fieldType === 0xFFFF) {
                currentEntry += 1;
                this.entries[entry.uuid] = entry;
                this.groups[entry.groupId].addEntry(entry);
                entry = new Entry({
                    database: this
                });
            }

            pos += fieldSize;
        }

        this.manager.status(null);
	E.fireDatabaseOpened(this.manager);
    };

    Database.prototype.read = function (data) {
        var dataByteArray = data.split('').map(function (i) {
                return i.charCodeAt(0);
            }),
            self = this,
            header = struct.Unpack('<4I16A16A2I32A32AI', dataByteArray, 0);

        this.groupCount = header[6];
        this.entryCount = header[7];
        this.contentsHash = U.byteArrayToWordArray(header[8]);
        this.signature1 = header[0];
        this.signature2 = header[1];
        this.flags = header[2];
        this.version = header[3];
        this.masterSeed = U.byteArrayToWordArray(header[4]);
        this.encryptionIV = U.byteArrayToWordArray(header[5]);
        this.masterSeed2 = U.byteArrayToWordArray(header[9]);
        this.keyEncryptionRounds = header[10];

        if (this.signature1 === C.PWM_DBSIG_1_KDBX_P && this.signature2 === C.PWM_DBSIG_2_KDBX_P) {
            throw S.error_unsupported_file;
        }
        if (this.signature1 === C.PWM_DBSIG_1_KDBX_R && this.signature2 === C.PWM_DBSIG_2_KDBX_R) {
            throw S.error_unsupported_file;
        }
        if (this.signature1 !== C.PWM_DBSIG_1 && this.signature2 !== C.PWM_DBSIG_2) {
            throw S.error_bad_signature;
        }
        if ((this.version & 0xFFFFFF00) !== (C.PWM_DBVER_DW & 0xFFFFFF00)) {
            // Design decision: I'm not going to support this antiquated crap.
            // the chances of anyone having these old versions and this being the
            // first time they open them in a modern version of KeePass is tiny.
            /*
            if (this.version == 0x00020000 || this.version == 0x00020001 || this.version == 0x00020002) {
                return this.openDatabaseV2(data);
            } else if (this.version <= 0x00010002) {
                return this.openDatabaseV1(data);
            } else {
                throw "Failed to open database.";
            }*/
            throw S.error_unsupported_version;
        }

        if (this.groupCount === 0) {
            throw S.error_empty_db;
        }

        // Select algorithm
        if (this.flags & C.PWM_FLAG_RIJNDAEL) {
            this.algorithm = C.ALGO_AES;
        } else if (this.flags & C.PWM_FLAG_TWOFISH) {
            this.algorithm = C.ALGO_TWOFISH;
        } else {
            throw S.error_failed_to_open;
        }

        // Generate pTransformedMasterKey from pMasterKey
        this.manager._transformMasterKey(this.masterSeed2, this.keyEncryptionRounds, function (transformedMasterKey) {
            self._decryptWithTransformedKey(transformedMasterKey, data);
        });
    };
}());