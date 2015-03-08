importScripts("networkJobHeader.js");
var Utility = {
	timerId : null,
	/**
	 * Serialize instance's properties in order to save in indexedDB
	 * @param object
	 * @returns object
	 */
	serialize : function(object){
		var retObj = {};
		for(var key in object){
			if(object[key] instanceof Function !== true){
				if(object[key] instanceof Object === true && object[key] instanceof Array === false && object[key] instanceof ArrayBuffer === false) {
					retObj[key] = Utility.serialize(object[key]);
				} else {
					retObj[key] = object[key];
				}
			}
		}

		return retObj;
	}
};

var NETWORK_ERR = 19;
var RESPONSE_ERR = 0;

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

    sendMessageT : function(authToken, serializedData){
        try{
            var messageT = new Message(serializedData.message);
            var message = TalkClientFactory.getInstance().createAuthClient(authToken).sendMessage(serializedData.localId, messageT);
            console.log("~~~~~~~~~~~~~~~~~ ############### send message localId="+serializedData.localId+", time="+message.createdTime+", id="+message.id);
            reply("sendMessageT", serializedData.localId, message);
        }catch(ex){

            if(ex.code == ErrorCode.NOT_A_MEMBER){
                reply("sendMessageT", ex);
            }else{

	            if(serializedData.message.contentType === ContentType.IMAGE){
		            if(ex.code === NETWORK_ERR || !ex.code){
			            reply("sendMessageT", NETWORK_ERR);
			            return;
		            }
	            }

                CommonException.getInstance().process(ex, "sendMessageT");
            }
        }
    },

    aSyncSendMessageT : function(authToken, serializedData){
        try{
            var messageT = new Message(serializedData.message);
            TalkClientFactory.getInstance().createAsyncAuthClient(authToken).aSyncSendMessage(serializedData.localId, messageT,
                function(){
                    console.log("[SP] async middle");

                    reply("aSyncSendMessageT", serializedData.localId, messageT);
                },

                function(message){
                    console.log("[SP] async send message localId="+serializedData.localId+", time="+message.createdTime+", id="+message.id);
                    reply("aSyncSendMessageT", serializedData.localId, message);
                }
            );

        }catch(ex){

            if(ex.code == ErrorCode.NOT_A_MEMBER){
                reply("aSyncSendMessageT", ex);
            }else{

                if(serializedData.message.contentType === ContentType.IMAGE){
                    if(ex.code === NETWORK_ERR || !ex.code){
                        reply("aSyncSendMessageT", NETWORK_ERR);
                        return;
                    }
                }

                CommonException.getInstance().process(ex, "aSyncSendMessageT");
            }
        }
    },

    sendChatCheckedT : function(authToken, chatId, lastMessageId){
        try{
            TalkClientFactory.getInstance().createAuthClient(authToken).sendChatChecked(0, chatId, lastMessageId);
            reply("sendChatCheckedT", null);
        }catch(ex){
            CommonException.getInstance().process(ex, "sendChatCheckedT");
        }
    },

    sendChatRemovedT : function(authToken, chatId, lastMessageId, uniqueKey){
        if(!uniqueKey) {
            uniqueKey = "";
        }
        try{
            TalkClientFactory.getInstance().createAuthClient(authToken).sendChatRemoved(0, chatId, lastMessageId);
            reply("sendChatRemovedT"+uniqueKey, null);
        }catch(ex){
            CommonException.getInstance().process(ex, "sendChatRemovedT"+uniqueKey);
        }
    },

    leaveRoomT : function(authToken, chatId){
        try{
            TalkClientFactory.getInstance().createAuthClient(authToken).leaveRoom(0, chatId);
            reply("leaveRoomT", null);
        }catch(ex){
            CommonException.getInstance().process(ex, "leaveRoomT");
        }
    },

    createRoomT : function(authToken, contactIds){
        try{
            var room = TalkClientFactory.getInstance().createAuthClient(authToken).createRoom(0, contactIds);
            reply("createRoomT", room);
        }catch(ex){
            CommonException.getInstance().process(ex, "createRoomT");
        }
    },

    inviteIntoRoomT : function(authToken, roomId, contactIds){
        try{
            TalkClientFactory.getInstance().createAuthClient(authToken).inviteIntoRoom(0, roomId, contactIds);
            reply("inviteIntoRoomT", null);
        }catch(ex){
            CommonException.getInstance().process(ex, "inviteIntoRoomT");
        }
    },

    getRoomT : function(authToken, roomId){
        try{
            var room = TalkClientFactory.getInstance().createAuthClient(authToken).getRoom(roomId);
            reply("getRoomT", room);
        }catch(ex){
            CommonException.getInstance().process(ex, "getRoomT");
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