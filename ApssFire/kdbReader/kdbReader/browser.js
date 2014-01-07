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
/*jslint unparam: true, white: true, browser: true */
/*global FileReader: true, File: true, alert: true, jQuery: true */
(function ($) {
    "use strict";
    var KeePass = window.KeePass,
        PERCENT_RE = /\b(\d{1,3})%/,
        droppedFiles = [];

    $(function () {
        var opening = false,
            passwordToggle = '<a href="#" class="password-toggle hidden">Show password</a>';

        function readFiles(files, callback) {
            var reader = new FileReader(),
                fileArray = [],
                i;

            if (files.length !== 1) {
                return false;
            }
            for (i = 0; i < files.length; i += 1) {
                fileArray.push(files[i]);
            }

            function doRead(fileArray) {
                $(reader).bind('loadend', function (ev) {
                    var file = {
                        name: fileArray[0].name,
                        size: fileArray[0].size,
                        type: fileArray[0].type,
                        data: reader.result
                    };
                    callback(file);
                    fileArray.shift();
                    if (fileArray.length) {
                        doRead(fileArray);
                    }
                });
                reader.readAsBinaryString(fileArray[0]);
            }

            doRead(fileArray);
        }

        function pwMask(len) {
            /* Could also be done by (new Array(len)).join('*');, but lint no likey. */
            var result = '', i;
            for (i = 0; i < len; i += 1) {
                result += '*';
            }
            return result;
        }

        function createEntry(entry) {
            var binary = (
                    entry.binaryData ?
                    '<a href="data:application/octet-stream;base64,' + encodeURIComponent((window.btoa || base64.encode)(entry.binaryData)) + '"' + (entry.binaryDescription ? ' download="' + encodeURIComponent(entry.binaryDescription) + '"' : '') + '>' + (entry.binaryDescription || 'Attached file') + '</a>' :
                    ''
                    ),
                entryMarkup = $('<tr><td class="title"><a href="' + entry.url + '">' + entry.title + '</a></td><td class="userName">' + entry.userName + '</td><td class="password"><span>' + pwMask(entry.password.length) + '</span>' + passwordToggle + '</td><td class="notes"><pre>' + entry.additional + '</pre></td><td>' + binary + '</td></tr>');
            entryMarkup.find('.password-toggle').click(function (ev) {
        	ev.preventDefault();
                var $this = $(this),
                    $field = $this.parent();
                if ($this.hasClass('hidden')) {
                    $this.text('Hide password');
                    $field.find('span').hide();
                    $field.prepend($('<input type="text" value="' + entry.password + '"/>'));
                } else {
                    $this.text('Show password');
                    $field.find('span').show();
                    $field.find('input').remove();
                }
                $this.toggleClass('hidden');
            });
            return entryMarkup;
        }

        function doNotDisplay(entry) {
            return (entry.title==='Meta-Info' &&
        	    entry.userName==='SYSTEM' &&
        	    entry.url==='$' &&
        	    entry.additional==="KPX_GROUP_TREE_STATE");
        }

        function createSubGroups(groups, container) {
            var g, e = null,
                l = $('<ul class="groups"></ul>'),
                groupMarkup, entriesContainer, entryMarkup, entry;

            container.append(l);
            for (g = 0; g < groups.length; g += 1) {
                groupMarkup = $('<li><a class="group-name" href="#">' + groups[g].name + '</a></li>');
                entriesContainer = $('<table class="entries"><thead><tr><th class="title">Title</th><th class="userName">Username</th><th class="password">Password</th><th class="notes">Notes</th><th class="attachment">Attachment</th></tr></thead></table>');

                for (e in groups[g].entries) {
                    if (groups[g].entries.hasOwnProperty(e) && !doNotDisplay(groups[g].entries[e])) {
                        entry = groups[g].entries[e];
                        entryMarkup = createEntry(entry);
                        entriesContainer.append(entryMarkup);
                    }
                }
                groupMarkup.append(entriesContainer);
                l.append(groupMarkup);

                createSubGroups(groups[g].subGroups, groupMarkup);
            }
        }

        function opened(e) {
            var container = $('#db-contents'),
                manager = e.manager,
                groups = manager.database.subGroups;

            $('#open').removeAttr('disabled');
            $('#spinner').hide();
            opening = false;

            createSubGroups(groups, container);
            $('#keepassopenform').hide();
            $('#db-contents-wrapper').show();
        }

        document.addEventListener('keePassDatabaseOpen', opened);

        function openFailed(e) {
            var manager = e.manager,
                message = e.exception,
                $errors = $('#errors');

            $('#spinner').hide();
            opening = false;

            manager.status(null);
            $('#open').removeAttr('disabled');
            $errors.text(message);
            $errors.slideDown();
        }

        document.addEventListener('keePassDatabaseOpenError', openFailed);

        function statusCallback(msg) {
            var $status = $('#status'),
                $message = $status.find('p'),
                $progress = $status.find('progress'),
                $spinner = $status.find('img'),
                percentage;
            if (msg===null) {
        	$message.hide();
    	        $progress.hide();
	        $spinner.hide();
            } else {
        	percentage = PERCENT_RE.test(msg) ? PERCENT_RE.exec(msg)[1] : null;
        	if (percentage !== null) {
        	    $progress.attr('value', percentage);
        	    $progress.text(percentage + '%');
        	    $spinner.hide();
        	    $progress.show();
        	} else {
        	    $progress.hide();
        	    $spinner.show();
        	}
        	$message.text(msg);
        	$message.show();
            }
        }

        function process() {
            var key = $('#password').val(),
                diskDrive = !!$('#use_keyfile:checked').length,
                providerName = 'KeePassJS',
                manager = new KeePass.Manager(statusCallback);

            if (opening) {
                return;
            }
            opening = true;
            $('#open').attr('disabled', 'disabled');

            function loadWithKeyFile(keyFile) {
                readFiles($('#keepassfile').get(0).files, function (file) {
                    manager.setMasterKey(
                    key,
                    diskDrive,
                    keyFile,
                    providerName);
                    manager.open(file.data);
                });
            }

            if (diskDrive) {
                readFiles($('#keyfile').get(0).files, function (keyfile) {
                    loadWithKeyFile(keyfile);
                });
            } else {
                loadWithKeyFile(null);
            }
        }

        $('#open').bind('click', function (ev) {
            ev.preventDefault();
            process();
        });
        $('#keepassopenform').bind('submit', function (ev) {
            ev.preventDefault();
            process();
        });

        $('#db-contents').on('click', 'a.group-name', function (ev) {
            ev.preventDefault();
            $('#db-contents table').hide();
            $(this).parent().children('table').show();
        });

        $('#close').bind('click', function (ev) {
            ev.preventDefault();
            $('#db-contents').text('');
            $('#db-contents-wrapper').hide();
            $('#keepassopenform').show();
            $("#keepassopenform input:not([type='button'])").each(function() {$(this).val('');});
            $("#keepassopenform input:first").focus();
        });
    });
}(jQuery));
