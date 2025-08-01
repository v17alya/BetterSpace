"use strict";
function _slicedToArray(e, t) {
  return (
    _arrayWithHoles(e) ||
    _iterableToArrayLimit(e, t) ||
    _unsupportedIterableToArray(e, t) ||
    _nonIterableRest()
  );
}
function _nonIterableRest() {
  throw new TypeError(
    "Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
  );
}
function _unsupportedIterableToArray(e, t) {
  if (e) {
    if ("string" == typeof e) return _arrayLikeToArray(e, t);
    var r = Object.prototype.toString.call(e).slice(8, -1);
    return "Map" ===
      (r = "Object" === r && e.constructor ? e.constructor.name : r) ||
      "Set" === r
      ? Array.from(e)
      : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)
      ? _arrayLikeToArray(e, t)
      : void 0;
  }
}
function _arrayLikeToArray(e, t) {
  (null == t || t > e.length) && (t = e.length);
  for (var r = 0, n = new Array(t); r < t; r++) n[r] = e[r];
  return n;
}
function _iterableToArrayLimit(e, t) {
  var r =
    null == e
      ? null
      : ("undefined" != typeof Symbol && e[Symbol.iterator]) || e["@@iterator"];
  if (null != r) {
    var n,
      a,
      i = [],
      o = !0,
      s = !1;
    try {
      for (
        r = r.call(e);
        !(o = (n = r.next()).done) && (i.push(n.value), !t || i.length !== t);
        o = !0
      );
    } catch (e) {
      (s = !0), (a = e);
    } finally {
      try {
        o || null == r.return || r.return();
      } finally {
        if (s) throw a;
      }
    }
    return i;
  }
}
function _arrayWithHoles(e) {
  if (Array.isArray(e)) return e;
}
var Rutube = function () {
  for (
    var e = this,
      t =
        ((this.Player = function (e, t) {
          if (!e) throw new Error("The Player element must be specified.");
          (this.selector = e),
            (this.config = t),
            (this.duration = null),
            (this.videoCurrentDuration = 0),
            this.renderOnPage();
        }),
        (this.renderOnPage = function () {
          var e,
            t = {
              id: "rt-" + this.selector,
              width: this.config.width || 720,
              height: this.config.height || 405,
              src: "//rutube.ru/play/embed/" + this.config.videoId,
              frameBorder: 0,
              allow: "autoplay",
              allowFullScreen: "",
              webkitallowfullscreen: "",
              mozallowfullscreen: "",
            },
            r = document.createElement("iframe");
          for (e in t) r.setAttribute(e, t[e]);
          document.getElementById(this.selector).appendChild(r);
        }),
        (this.triggerEventObserver = function (e) {
          if (this.config.events && this.config.events[e])
            return this.config.events[e](
              1 < arguments.length && void 0 !== arguments[1]
                ? arguments[1]
                : null
            );
        }),
        (this.setPlayerState = function (e) {
          var t,
            r = {
              PLAYING: 0,
              PAUSED: 0,
              STOPPED: 0,
              ENDED: 0,
            };
          for (t in r)
            if (t.toLowerCase() === e.toLowerCase()) {
              r[t] = 1;
              break;
            }
          return {
            playerState: r,
          };
        }),
        (this.currentDuration = function () {
          return this.videoCurrentDuration;
        }),
        0),
      r = Object.entries({
        play: "play",
        pause: "pause",
        stop: "stop",
        seekTo: "setCurrentTime",
        changeVideo: "changeVideo",
        mute: "mute",
        unMute: "unMute",
        setVolume: "setVolume",
      });
    t < r.length;
    t++
  )
    !(function () {
      var n = _slicedToArray(r[t], 2),
        a = n[0],
        i = n[1];
      e[a] = function () {
        var e =
          0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {};
        document
          .getElementById("rt-" + this.selector)
          .contentWindow.postMessage(
            JSON.stringify({
              type: "player:" + i,
              data: e,
            }),
            "*"
          );
      };
    })();
  (this.playerEvent = function (e) {
    switch (e.type) {
      case "player:error":
        this.triggerEventObserver("onError", {
          code: e.data.code,
          text: e.data.text,
        });
        break;
      case "player:durationChange":
        break;
      case "player:ready":
        this.triggerEventObserver("onReady", {
          videoId: e.data.videoId,
          clientId: e.data.clientId,
        });
        break;
      case "player:changeState":
      case "player:playComplete":
        this.triggerEventObserver(
          "onStateChange",
          this.setPlayerState(e.data.state || "ENDED")
        );
        break;
      case "player:currentTime":
        this.videoCurrentDuration = e.data.time;
    }
  }),
    window.addEventListener(
      "message",
      function (e) {
        let data = e.data;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (error) {
            console.error("incorrect JSON:", error);
            return;
          }
        }
        this.playerEvent(data);
      }.bind(this),
      0
    );
};
"undefined" != typeof exports &&
  ((exports =
    "undefined" != typeof module && module.exports
      ? (module.exports = Rutube)
      : exports).Rutube = Rutube);
