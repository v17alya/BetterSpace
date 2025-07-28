// others.js

function getPlayerInfo() {
  console.log("getPlayerInfo");
  if (window.MegaMod?.myGameInstance?.SendMessage)
    window.MegaMod.myGameInstance.SendMessage("JSManager", "GetPlayerInfo");
}

function setPlayerInfo(info) {
  console.log("setPlayerInfo: " + info);
  const json = JSON.parse(info);
  window.unity_player_info = json;
}