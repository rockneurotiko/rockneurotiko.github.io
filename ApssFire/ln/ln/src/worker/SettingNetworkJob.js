importScripts("networkJobHeader.js");

var handleException = function(name, e){

	if(e.code || e.code === ErrorCode.ILLEGAL_ARGUMENT){
		reply(name, e);
	} else {
		CommonException.getInstance().process(e, name);
	}
};

var queryableFunctions = {
    pushServerInfo: function(authToken, list) {
        var serverObject = JSON.parse(list);

        ServerInfo.serverList = serverObject;
    },

    pushDebugInfo: function(authToken, info) {
        ServerInfo.isDebugMode = info.isDebugMode;
        ServerInfo.DebugHost = info.DebugHost;
        ServerInfo.DebugPort = info.DebugPort;
    },

	updateSettingsT : function (authToken, settings) {
		var newSettings = TalkClientFactory.getInstance().createAuthClient(authToken).getSettings();
		_.extend(newSettings, settings);

		try{
			var result = TalkClientFactory.getInstance().createAuthClient(authToken).updateSettings(0, newSettings);
			reply("updateSettingsT", result);

		} catch(e){
			handleException('updateSettingsT', e);
		}
	},

	getSettingsT : function (authToken) {
		try{
			var settings = TalkClientFactory.getInstance().createAuthClient(authToken).getSettings();
			reply("getSettingsT", settings);

		} catch(e){
			handleException('getSettingsT', e);
		}
	},

	updateSettingsAttributeT : function(authToken, attr, value){
		try{
			var settings = TalkClientFactory.getInstance().createAuthClient(authToken).updateSettingsAttribute(0, attr, value);
			reply("updateSettingsAttributeT", settings);

		} catch(e){
			handleException('updateSettingsAttributeT', e);
		}
	},

	unregisterUserAndDeviceT : function(authToken){
		try{
			var settings = TalkClientFactory.getInstance().createAuthClient(authToken).unregisterUserAndDevice();
			reply("unregisterUserAndDeviceT", settings);

		} catch(e){
			handleException('unregisterUserAndDeviceT', e);
		}
	},


	verifyIdentityCredentialT : function(authToken, identityProvider, key, value){

		try{
			var result = TalkClientFactory.getInstance().createNoAuthClient(authToken).verifyIdentityCredential(identityProvider, key, value);
			reply("verifyIdentityCredentialT", result);

		}catch(e){
			handleException('verifyIdentityCredentialT', e);
		}
	},

	setIdentityCredentialT : function(authToken, identityProvider, identifier, verifier){
		try{
			var result = TalkClientFactory.getInstance().createAuthClient(authToken).setIdentityCredential(identityProvider, identifier, verifier);
			reply("setIdentityCredentialT", result);

		} catch(e){
			handleException('setIdentityCredentialT', e);
		}
	},

	clearIdentityCredentialT : function(authToken){
		try{
			var result = TalkClientFactory.getInstance().createAuthClient(authToken).clearIdentityCredential();
			reply("clearIdentityCredentialT", result);

		} catch(e){
			handleException('clearIdentityCredentialT', e);
		}
	},

	updateNotificationTokenT : function(authToken, endPoint){
        try{
            var result = TalkClientFactory.getInstance().createAuthClient(authToken).updateNotificationToken(NotificationType.MOZILLA_SIMPLE, endPoint);
            reply("updateNotificationTokenT", result);

        } catch(e){
	        handleException('updateNotificationTokenT', e);

        }
    },

    verifyQrcodeT: function(authToken, verifier, pinCode) {
        try{
            var result = TalkClientFactory.getInstance().createAuthClient(authToken).verifyQrcode(verifier, pinCode);
            reply("verifyQrcodeT", result);

        } catch(e){
            handleException('verifyQrcodeT', e);
        }
    },

    getSessionsT: function(authToken) {
        try{
            var result = TalkClientFactory.getInstance().createAuthClient(authToken).getSessions();
            reply("getSessionsT", result);

        } catch(e){
            handleException('getSessionsT', e);
        }
    },

    logoutSessionT: function(authToken, tokenKey) {
        try{
            var result = TalkClientFactory.getInstance().createAuthClient(authToken).logoutSession(tokenKey);
            reply("logoutSessionT", result);

        } catch(e){
            handleException('logoutSessionT', e);
        }
    },

    getLastOpRevisionT : function(authToken){
        try{
            var rev = TalkClientFactory.getInstance().createAuthClient(authToken).getLastOpRevision();
            reply("getLastOpRevisionT", rev);
        }catch(e){
            handleException('getLastOpRevisionT', e);
        }
    },

    getServerTimeT : function(authToken, uniqueKey){
        if(!uniqueKey) {
            uniqueKey = "";
        }

        try{
            var time = TalkClientFactory.getInstance().createNoAuthClient().getServerTime();
            reply("getServerTimeT" + uniqueKey, time);
        }catch(e){
            handleException('getServerTimeT' + uniqueKey, e);
        }
    }

};

function defaultQuery (vMsg) {

}

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
}
