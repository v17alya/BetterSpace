// amplitude.module.js
// ES module for Amplitude event queuing and dispatching

// External imports
import {
  getClientId,
  getSavedClientId,
  getCurrentSessionId,
  AnalyticsState,
} from "./analytics.module.js?v={{{ PRODUCT_VERSION }}}";
import { app_version } from "./app_version.js?v={{{ PRODUCT_VERSION }}}";

// Internal state for request numbering
const AmplitudeState = {
  lastRequestNumber: 0,
  currentRequestNumber: 0,
};

const Build_Name = "Tower";

/**
 * Gets the last sent request number.
 * @returns {number}
 */
export function getLastAmplitudeRequestNumber() {
  return AmplitudeState.lastRequestNumber;
}

/**
 * Sets the last sent request number.
 * @param {number} number
 */
export function setLastAmplitudeRequestNumber(number) {
  AmplitudeState.lastRequestNumber = number;
}

/**
 * Increments the last sent request number by a given value.
 * @param {number} value
 */
export function incrementLastAmplitudeRequestNumber(value) {
  setLastAmplitudeRequestNumber(getLastAmplitudeRequestNumber() + value);
}

/**
 * Gets the current request number.
 * @returns {number}
 */
export function getCurrentAmplitudeRequestNumber() {
  return AmplitudeState.currentRequestNumber;
}

/**
 * Sets the current request number.
 * @param {number} number
 */
export function setCurrentAmplitudeRequestNumber(number) {
  AmplitudeState.currentRequestNumber = number;
}

/**
 * Increments the current request number by a given value.
 * @param {number} value
 */
export function incrementCurrentAmplitudeRequestNumber(value) {
  setCurrentAmplitudeRequestNumber(getCurrentAmplitudeRequestNumber() + value);
}

/**
 * Sends an Amplitude event with optional queuing.
 * @param {string} eventName
 * @param {object} [eventProperty={}]   — event-specific properties
 * @param {object} [userProperties={}]  — user-specific properties
 * @param {boolean} [ignoreOrder=false] — if true, bypass queue ordering
 */
export function sendEvent(
  eventName,
  eventProperty = {},
  userProperties = {},
  ignoreOrder = false
) {
  console.log("sendEvent: " + eventName);
  const requestNumber = getCurrentAmplitudeRequestNumber();
  if (!ignoreOrder) {
    incrementCurrentAmplitudeRequestNumber(1);
  }
  sendEventLogic(
    eventName,
    requestNumber,
    eventProperty,
    userProperties,
    Date.now(),
    ignoreOrder
  );
}

/**
 * Sends a raw JSON payload event, optionally bypassing ordering.
 * @param {string|object} jsonPayload
 * @param {boolean} [ignoreOrder=false]
 */
export function sendRawEvent(jsonPayload, ignoreOrder = false) {
  console.log("sendRawEvent:", jsonPayload);
  const payload =
    typeof jsonPayload === "string" ? JSON.parse(jsonPayload) : jsonPayload;
  const requestNumber = getCurrentAmplitudeRequestNumber();
  const eventsCount = Array.isArray(payload.events) ? payload.events.length : 1;
  if (!ignoreOrder) {
    incrementCurrentAmplitudeRequestNumber(eventsCount);
    if (Array.isArray(payload.events)) {
      payload.events.forEach((ev, idx) => {
        ev.event_id = requestNumber + idx;
      });
    }
  }
  sendRawEventLogic(JSON.stringify(payload), requestNumber, ignoreOrder, eventsCount);
}

// Internal helper functions (not exported)
function dispatchWithQueue(
  requestNumber,
  ignoreOrder,
  buildPayloadFn,
  logLabel,
  eventsCount
) {
  getClientId().then((clientId) => {
    if (!ignoreOrder && getLastAmplitudeRequestNumber() !== requestNumber) {
      setTimeout(
        () =>
          dispatchWithQueue(
            requestNumber,
            ignoreOrder,
            buildPayloadFn,
            logLabel,
            eventsCount
          ),
        100
      );
      return;
    }
    const bodyObj = buildPayloadFn();
    fetch("https://better-space-api.herokuapp.com/api/game/httpApi", {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
        "build-name": Build_Name,
      },
      body: bodyObj,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Status " + response.status);
        console.log(`${logLabel} sent successfully`);
      })
      .catch((err) => console.error(`${logLabel} failed:`, err))
      .finally(() => {
        if (!ignoreOrder) {
          incrementLastAmplitudeRequestNumber(eventsCount);
        }
        console.log(`${logLabel} finished slot ${requestNumber}`);
      });
  });
}

function sendEventLogic(
  eventName,
  requestNumber,
  eventProperty,
  userProperties,
  dateTime,
  ignoreOrder
) {
  dispatchWithQueue(
    requestNumber,
    ignoreOrder,
    () =>
      JSON.stringify({
        events: [
          {
            user_properties: {
              ...AnalyticsState.basedEventProperty,
              ...userProperties,
            },
            event_properties: {
              ...AnalyticsState.basedEventProperty,
              ...eventProperty,
            },
            session_id: getCurrentSessionId(),
            user_id: getSavedClientId(),
            app_version: app_version,
            platform: "HTML",
            insert_id: getUniqueEventId(requestNumber),
            time: dateTime,
            event_type: eventName,
            ...(!ignoreOrder && { event_id: requestNumber }),
          },
        ],
      }),
    `event: ${eventName}`,
    1
  );
}

function sendRawEventLogic(
  jsonPayload,
  requestNumber,
  ignoreOrder,
  eventsCount
) {
  dispatchWithQueue(
    requestNumber,
    ignoreOrder,
    () => jsonPayload,
    `rawEvent`,
    eventsCount
  );
}

function getUniqueEventId(number) {
  const ticks = Date.now() * Math.floor(Math.random() * (10000) + 1);
  return `${ticks}_${number}`;
}
