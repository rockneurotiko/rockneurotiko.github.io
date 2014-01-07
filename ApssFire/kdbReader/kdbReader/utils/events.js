(function() {
    "use strict";

    var KeePass = window.KeePass || {},
        E = KeePass.events = {};

    E.fireDatabaseOpened = function (manager) {
	var event = document.createEvent('Event');
	event.initEvent('keePassDatabaseOpen', true, true);
	event.manager = manager;
	document.dispatchEvent(event);
    };
    E.fireDatabaseOpenError = function (manager, exc) {
	var event = document.createEvent('Event');
	event.initEvent('keePassDatabaseOpenError', true, true);
	event.manager = manager;
	event.exception = exc;
	document.dispatchEvent(event);
    };

}());