importScripts("networkJobHeader.js");

var handleException = function(name, e){

	if(e.code || e.code === ErrorCode.ILLEGAL_ARGUMENT){
		reply(name, e);
	} else {
		CommonException.getInstance().process(e, name);
	}
};

var queryableFunctions = {
	getServerTimeT : function(){
		try{
			var result = TalkClientFactory.getInstance().createNoAuthClient().getServerTime();
			reply('getServerTimeT', result);
		} catch(e){
			handleException('getServerTimeT', e);
		}
	},

	startVerificationT : function(authToken, region, carrier, phoneNumber, deviceId, deviceInfo, networkCode, mid){
		try{
			deviceInfo = new DeviceInfo(deviceInfo);
			var result = TalkClientFactory.getInstance().createNoAuthClient().startVerification(region, carrier, phoneNumber, deviceId, deviceInfo, networkCode, mid);
			reply("startVerificationT", result);

		} catch(e){
			handleException('startVerificationT', e);
		}
	},

	resendPinCodeBySMST : function(authToken, sessionId){
		try{
			var result = TalkClientFactory.getInstance().createNoAuthClient().resendPinCodeBySMS(sessionId);
			reply("resendPinCodeBySMST", result);

		} catch(e){
			handleException('resendPinCodeBySMST', e);
		}
	},

	verifyPhoneT : function(authToken, sessionId, pinCode, deviceId){
		try{
			var result = TalkClientFactory.getInstance().createNoAuthClient().verifyPhone(sessionId, pinCode, deviceId);
			reply("verifyPhoneT", result);

		} catch(e){
			handleException('verifyPhoneT', e);
		}
	},


	registerDeviceT : function(authToken, sessionId){
		try{
			var result = TalkClientFactory.getInstance().createNoAuthClient().registerDevice(sessionId);
			reply("registerDeviceT", result);

		} catch(e){
			handleException('registerDeviceT', e);
		}
	},

	registerDeviceWithIdentityCredentialT : function(authToken, sessionId, identityProvider, key, value){
		try{
			var result = TalkClientFactory.getInstance().createNoAuthClient().registerDeviceWithIdentityCredential(sessionId, identityProvider, key, value);
			reply("registerDeviceWithIdentityCredentialT", result);

		} catch(e){
			handleException('registerDeviceWithIdentityCredentialT', e);
		}
	},

	requestAccountPasswordResetT : function(authToken, provider, identifier, locale){
		try{
			var result = TalkClientFactory.getInstance().createNoAuthClient().requestAccountPasswordReset(provider, identifier, locale);
			reply("requestAccountPasswordResetT", result);

		} catch(e){
			handleException('requestAccountPasswordResetT', e);
		}

	},

	/**
	 * request Email Confirmation
	 * @param authToken
	 * @param {EmailConfirmation} emailConfirmationData
	 */
	requestEmailConfirmationT : function(authToken, emailConfirmationData){
		try{
			var emailConfirmation = new EmailConfirmation(emailConfirmationData);
			var result = TalkClientFactory.getInstance().createAuthClient(authToken).requestEmailConfirmation(emailConfirmation);
			reply("requestEmailConfirmationT", result);

		} catch(e){
			handleException('requestEmailConfirmationT', e);
		}
	},

	verifyIdentityCredentialT : function(authToken, identityProvider, key, value){

		try{
			var result = TalkClientFactory.getInstance().createNoAuthClient().verifyIdentityCredential(identityProvider, key, value);
			reply("verifyIdentityCredentialT", result);

		}catch(e){
			handleException('verifyIdentityCredentialT', e);
		}
	},

	confirmEmailT : function(authToken, verifier, pinCode){
		try{
			console.log(verifier, pinCode);
			var result = TalkClientFactory.getInstance().createAuthClient(authToken).confirmEmail(verifier, pinCode);
			reply("confirmEmailT", result);

		} catch(e){
			handleException('confirmEmailT', e);
		}

	},


	getRSAKeyInfoT : function(authToken, identityProvider){
		try{
			var keys = TalkClientFactory.getInstance().createNoAuthClient().getRSAKeyInfo(identityProvider);

			reply("getRSAKeyInfoT", {
				evalue : keys.evalue,
				keynm : keys.keynm,
				nvalue : keys.nvalue,
				sessionKey : keys.sessionKey
			});

		} catch(e){
			handleException('getRSAKeyInfoT', e);
		}

	}
};

function defaultQuery (vMsg) {

};

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