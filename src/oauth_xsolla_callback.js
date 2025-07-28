// oauth_xsolla_callback.js
const channel = new BroadcastChannel('app-data');
const token = getToken();
channel.postMessage(token);
// if (window.MegaMod?.myGameInstance?.SendMessage) window.MegaMod.myGameInstance.SendMessage("XsollaAuthProvider", "XsollaAuthProvider_BabkaAuthTokenGot", code);
//console.log("token: " + token);
window.close();

function getToken(){
	const params = new URLSearchParams(window.location.search);
	if (params.has("token")){
		return params.get("token");
	}
	return null;
}
