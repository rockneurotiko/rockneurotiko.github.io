importScripts("networkJobHeader.js");

var queryableFunctions = {
    pushServerInfo: function(authToken, list) {
        console.log("in worker......" + list);
        var serverObject = JSON.parse(list);

        ServerInfo.serverList = serverObject;
    },

    pushDebugInfo: function(authToken, info) {
        ServerInfo.isDebugMode = info.isDebugMode;
        ServerInfo.DebugHost = info.DebugHost;
        ServerInfo.DebugPort = info.DebugPort;
    },

    getContactT: function(authToken, mid) {
        try {
            var contact = TalkClientFactory.getInstance().createAuthClient(authToken).getContact(mid);

            if(contact[mid]) {
                contact = contact[mid];
            }
            reply("getContactT", contact);
        } catch(ex){
            CommonException.getInstance().process(ex, "getContactT");
        }
    },

	getContactsT : function(authToken, ids){
		try {
			var contact = TalkClientFactory.getInstance().createAuthClient(authToken).getContacts(ids);
			reply("getContactsT", contact);
		} catch(ex){
            CommonException.getInstance().process(ex, "getContactsT");
        }
	},

	getAllContactIdsT : function(authToken){
		try{
			var contactIds = TalkClientFactory.getInstance().createAuthClient(authToken).getAllContactIds();
			reply("getAllContactIdsT", contactIds);
		} catch(ex){
            CommonException.getInstance().process(ex, "getAllContactIdsT");
        }

	},

	getBlockedContactIdsT : function(authToken){
		try{
			var contactIds = TalkClientFactory.getInstance().createAuthClient(authToken).getBlockedContactIds();
			reply("getBlockedContactIdsT", contactIds);
		} catch(ex){
			CommonException.getInstance().process(ex, "getBlockedContactIdsT");
		}
	},

	getRecommendationIdsT : function(authToken){
		try{
			var contactIds = TalkClientFactory.getInstance().createAuthClient(authToken).getRecommendationIds();
			reply("getRecommendationIdsT", contactIds);
		} catch(ex){
			CommonException.getInstance().process(ex, "getRecommendationIdsT");
		}
	},

	getBlockedRecommendationIdsT : function(authToken){
		try{
			var contactIds = TalkClientFactory.getInstance().createAuthClient(authToken).getBlockedRecommendationIds();
			reply("getBlockedRecommendationIdsT", contactIds);
		} catch(ex){
			CommonException.getInstance().process(ex, "getBlockedRecommendationIdsT");
		}
	},

    findContactByUseridT : function(authToken, userId){
        try{
            var contact = TalkClientFactory.getInstance().createAuthClient(authToken).findContactByUserid(userId);
            reply("findContactByUseridT", contact);
        } catch(ex){
            reply("findContactByUseridT", ex);
            if(ex.code || ex.code === ErrorCode.ILLEGAL_ARGUMENT) {
            } else {
                CommonException.getInstance().process(ex, "findContactByUseridT");
            }
        }
    },

    findAndAddContactsByMidT : function(authToken, mid){
        try{
            var contact = TalkClientFactory.getInstance().createAuthClient(authToken).findAndAddContactsByMid(0, mid);
            if(contact[mid]) {
                contact = contact[mid];
            }
            reply("findAndAddContactsByMidT", contact);
        } catch(ex){
            CommonException.getInstance().process(ex, "findAndAddContactsByMidT");
        }
    },

    blockContactT: function(authToken, mid, uniqueKey) {
        if(!uniqueKey) {
            uniqueKey = "";
        }
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).blockContact(0, mid);
            reply("blockContactT" + uniqueKey, req);
        } catch(ex){
            CommonException.getInstance().process(ex, "blockContactT" + uniqueKey);
        }
    },

    unBlockContactT: function(authToken, mid) {
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).unblockContact(0, mid);
            reply("unBlockContactT", req);
        } catch(ex){
            CommonException.getInstance().process(ex, "unBlockContactT");
        }
    },

    hideContactT: function(authToken, mid, uniqueKey) {
        if(!uniqueKey) {
            uniqueKey = "";
        }
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).updateContactSetting(0, mid, ContactSetting.CONTACT_SETTING_CONTACT_HIDE, "true");
            reply("hideContactT" + uniqueKey, req);
        } catch(ex){
            CommonException.getInstance().process(ex, "hideContactT" + uniqueKey);
        }
    },

    unHideContactT: function(authToken, mid) {
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).updateContactSetting(0, mid, ContactSetting.CONTACT_SETTING_CONTACT_HIDE, "false");
            reply("unHideContactT", req);
        } catch(ex){
            CommonException.getInstance().process(ex, "unHideContactT");
        }
    },

    deleteContactT: function(authToken, mid) {
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).updateContactSetting(0, mid, ContactSetting.CONTACT_SETTING_DELETE, "true");
            reply("deleteContactT", req);
        } catch(ex){
            CommonException.getInstance().process(ex, "deleteContactT");
        }
    },

    syncContactsT: function(authToken, localContacts) {
        var contactModificationList = _.map(localContacts, function(contactObject) {
            return new ContactModification(contactObject);
        });
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).syncContacts(0, contactModificationList);
            reply("syncContactsT", req);
        } catch(ex) {
            if(ex.code || ex.code === ErrorCode.ILLEGAL_ARGUMENT) {
                reply("syncContactsT", ex);
            } else {
                CommonException.getInstance().process(ex, "syncContactsT");
            }
        }
    },

    updateSettingsT: function(authToken, mid, flag, value) {
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).updateContactSetting(0, mid, flag, value);
            reply("updateSettingsT", req);
        } catch(ex){
            CommonException.getInstance().process(ex, "updateSettingsT");
        }
    }
};

function defaultQuery (vMsg) {};

onmessage = function (oEvent) {
    if (oEvent.data instanceof Object && oEvent.data.hasOwnProperty("method") && oEvent.data.hasOwnProperty("arguments")) {
        var args = Array.prototype.slice.call(oEvent.data.arguments);
        args.unshift(oEvent.data.authToken);
        queryableFunctions[oEvent.data.method].apply(self, args);
    } else {
        defaultQuery(oEvent.data);
    }
};

function reply () {
    if (arguments.length < 1) {
        throw new TypeError("reply - not enough arguments");
    }

    postMessage({ "method": arguments[0], "arguments": Array.prototype.slice.call(arguments, 1) });
};