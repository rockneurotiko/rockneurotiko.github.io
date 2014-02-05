importScripts("networkJobHeader.js");

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
    createGroupT: function(authToken, groupName, mids) {
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).createGroup(0, groupName, mids);

            reply("createGroupT", req);
        } catch(ex){
            CommonException.getInstance().process(ex, "createGroupT");
        }
    },
    getGroupT: function(authToken, groupId, uniqueKey) {
        if(!uniqueKey) {
            uniqueKey = "";
        }

        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).getGroup(groupId);

            reply("getGroupT" + uniqueKey, req);
        } catch(ex){
            CommonException.getInstance().process(ex, "getGroupT" + uniqueKey);
        }
    },
    rejectGroupInvitationT: function(authToken, groupId) {
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).rejectGroupInvitation(0, groupId);

            reply("rejectGroupInvitationT", req);
        } catch(ex){
            CommonException.getInstance().process(ex, "rejectGroupInvitationT");
        }
    },
    acceptGroupInvitationT: function(authToken, groupId) {
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).acceptGroupInvitation(0, groupId);

            reply("acceptGroupInvitationT", req);
        } catch(ex){
            CommonException.getInstance().process(ex, "acceptGroupInvitationT");
        }
    },
    inviteIntoGroupT: function(authToken, groupId, mids) {
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).inviteIntoGroup(0, groupId, mids);

            reply("inviteIntoGroupT", req);
        } catch(ex){
            CommonException.getInstance().process(ex, "inviteIntoGroupT");
        }
    },
    leaveGroupT: function(authToken, groupId) {
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).leaveGroup(0, groupId);

            reply("leaveGroupT", req);
        } catch(ex){
            CommonException.getInstance().process(ex, "leaveGroupT");
        }
    },
    updateGroupT: function(authToken, groupInfo) {
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).updateGroup(0, groupInfo);

            reply("updateGroupT", req);
        } catch(ex){
            CommonException.getInstance().process(ex, "updateGroupT");
        }
    },
    kickoutFromGroupT: function(authToken, groupId, mids) {
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).kickoutFromGroup(0, groupId, mids);

            reply("kickoutFromGroupT", req);
        } catch(ex){
            CommonException.getInstance().process(ex, "kickoutFromGroupT");
        }
    },
    cancelGroupInvitationT: function(authToken, groupId, mids) {
        try {
            var req = TalkClientFactory.getInstance().createAuthClient(authToken).cancelGroupInvitation(0, groupId, mids);

            reply("cancelGroupInvitationT", req);
        } catch(ex){
            CommonException.getInstance().process(ex, "cancelGroupInvitationT");
        }
    },

	getGroupIdsJoinedT : function(authToken){
		try {
			var req = TalkClientFactory.getInstance().createAuthClient(authToken).getGroupIdsJoined();
			reply("getGroupIdsJoinedT", req);
		} catch(ex){
			CommonException.getInstance().process(ex, "getGroupIdsJoinedT");
		}
	},

	getGroupIdsInvitedT : function(authToken){
		try {
			var req = TalkClientFactory.getInstance().createAuthClient(authToken).getGroupIdsInvited();
			reply("getGroupIdsInvitedT", req);
		} catch(ex){
			CommonException.getInstance().process(ex, "getGroupIdsInvitedT");
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