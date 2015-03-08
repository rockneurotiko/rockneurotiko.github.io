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

	/**
	 * Update Profile To Thrift
	 * @param authToken
	 * @param profile
	 */
	updateProfileT : function (authToken, data) {
		try{
			var profile = new Profile(data);
			var result = TalkClientFactory.getInstance().createAuthClient(authToken).updateProfile(0, profile);
			reply("updateProfileT", result);

		} catch(e){
			handleException('updateProfileT', e);
		}
	},

	updateProfileAttributeT : function(authToken, seq, attr, value){
		try{
			var profile = TalkClientFactory.getInstance().createAuthClient(authToken).updateProfileAttribute(seq, attr, value);
			reply("updateProfileAttributeT", profile);

		} catch(e){
			handleException('updateProfileAttributeT', e);
		}
	},
	isUseridAvailableT : function(authToken, userId){
		try{
			var result = TalkClientFactory.getInstance().createAuthClient(authToken).isUseridAvailable(userId);
			reply("isUseridAvailableT", result);
		} catch(e){
			handleException('isUseridAvailableT', e);
		}
	},

	registerUseridT : function(authToken, seq, userId){

		try{
			var profile = TalkClientFactory.getInstance().createAuthClient(authToken).registerUserid(seq, userId);
			reply("registerUseridT", profile);
		} catch(e){
			handleException('registerUseridT', e);
		}
	},

	/**
	 * get Profile From Thrift
	 * @param authToken
	 */
	getProfileT : function(authToken, uniqueKey) {
        if(!uniqueKey) {
            uniqueKey = "";
        }

		try{
			var profile = TalkClientFactory.getInstance().createAuthClient(authToken).getProfile();
			reply("getProfileT" + uniqueKey, profile);

		} catch(e){
			handleException('getProfileT' + uniqueKey, e);
		}

	}
};

function defaultQuery (vMsg) {}

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