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
/*jslint nomen: true, white: true, browser: true */
/*global CryptoJS: true, base64: true */
(function () {
    "use strict";

    var KeePass = window.KeePass = window.KeePass || {},
        U = KeePass.utils || {},
        S = KeePass.strings || {},
        E = KeePass.events || {},
        Database = KeePass.Database,
        isBase64UrlString = (new RegExp('^base64:\/\/')).test,
        C = KeePass.constants || {},
        Manager = KeePass.Manager = function (statusCallback) {
        this.masterKey = '';
        this.keySource = '';
        this.database = null;
        this.statusCallback = statusCallback;
    };

    function loadHexKey(string) {
        var i, result = [];
        for (i = 0; i < 32; i += 2) {
            result.push(parseInt(string.slice(i, 2), 16));
        }
        return U.byteArrayToWordArray(result);
    }

    Manager.prototype.status = function(message) {
	var $this = this;
	if (this.statusCallback) {
	    // fork
	    $this.statusCallback(message);
	    //window.setTimeout(function() {}, 0);
	}
    };

    Manager.prototype.setMasterKey = function (key, diskDrive, keyFile, providerName) {
        var fileSize, fileKey = '', fileData,
            passwordKey, readNormal, extKey, keySourceCand;

        if (key.length === 0) {
            this.status(null);
            throw S.error_invalid_key;
        }

        this.status(S.creating_key);

        if (!diskDrive) {
            this.masterKey = CryptoJS.SHA256(CryptoJS.enc.Latin1.parse(key));
        } else if (isBase64UrlString(keyFile.name)) {
            extKey = (window.atob || base64.decode)(keyFile.name.slice(9));
            if (extKey) {
                fileKey = CryptoJS.SHA256(extKey);
            } else {
                this.status(null);
                throw S.error_invalid_key;
            }

            if (providerName !== null && providerName !== undefined) {
                this.keySource = providerName;
            }

            if (key === null) { // external source only
                this.masterKey = fileKey;
            } else {
                passwordKey = CryptoJS.SHA256(key);
                this.masterKey = CryptoJS.SHA256(passwordKey.concat(fileKey));
            }
        } else {
            // with key file
            if (key === null) { // key file only
                keySourceCand = keyFile.name;
                if (keySourceCand.charAt(keySourceCand.length - 1) === '\\') {
                    keySourceCand += C.PWS_DEFAULT_KEY_FILENAME;
                }
                fileData = keyFile.data;

                readNormal = true;
                fileSize = keyFile.size;
                if (fileSize === 32) {
                    this.masterKey = fileData;
                    readNormal = false;
                } else if (fileSize === 64) {
                    this.masterKey = loadHexKey(fileData);
                    readNormal = false;
                }
                if (readNormal) {
                    this.masterKey = CryptoJS.SHA256(fileData);
                }
                this.keySource = keySourceCand;
            } else { // secondKey != null
                keySourceCand = keyFile.name;
                if (keySourceCand.charAt(keySourceCand.length - 1) === '\\') {
                    keySourceCand += C.PWS_DEFAULT_KEY_FILENAME;
                }
                fileData = keyFile.data;
                fileSize = keyFile.size;
                readNormal = true;

                if (fileSize === 32) {
                    fileKey = fileData;
                    readNormal = false;
                } else if (fileSize === 64) {
                    fileKey = loadHexKey(fileData);
                    readNormal = false;
                }

                if (readNormal) {
                    fileKey = CryptoJS.SHA256(fileData);
                }

                passwordKey = CryptoJS.SHA256(key);
                this.masterKey = CryptoJS.SHA256(passwordKey.concat(fileKey));
            }
        }
        this.status(null);
    };

    Manager.prototype.open = function (data) {
	try {
	    this.database = new Database(this);
	    this.database.read(data);
	} catch (e) {
	    E.fireDatabaseOpenError(this, e);
	    throw e;
	}
    };

    Manager.prototype._transformMasterKey = function (keySeed, keyEncRounds, callback) {
        var lastPercentage = 0, percentage, self = this;

        this.status(S.transforming_key.replace('%d', 0));

        function doRounds(transformedMasterKey, remainingRounds) {
            var allowUpdate = false;
            transformedMasterKey = CryptoJS.AES.encrypt(transformedMasterKey,
                    keySeed, {
                        mode: CryptoJS.mode.ECB
                    }).ciphertext;
                    transformedMasterKey = CryptoJS.lib.WordArray.create(transformedMasterKey.words.slice(0, 8));
                    percentage = Math.round((keyEncRounds - remainingRounds) / keyEncRounds * 100);
                    if (percentage != lastPercentage) {
                	allowUpdate = true;
                        self.status(S.transforming_key.replace('%d', percentage));
                        lastPercentage = percentage;
                    }
            remainingRounds -= 1;
            if (remainingRounds === 0) {
                // Hash once with SHA-256
                transformedMasterKey = CryptoJS.SHA256(transformedMasterKey);
                self.status(null);
                callback(transformedMasterKey);
            } else {
                if (allowUpdate) {
                    // timeout to let DOM update
                    window.setTimeout(function() { doRounds(transformedMasterKey, remainingRounds);}, 0);
                } else {
                    doRounds(transformedMasterKey, remainingRounds);
                }
            }
        }

        doRounds(this.masterKey, keyEncRounds);
    };
}());