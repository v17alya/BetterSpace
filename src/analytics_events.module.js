// analytics_events.module.js
// ES module exporting a single namespace object with all analytics/game event constants

/**
 * Centralized map of all event names and utility functions.
 */

// Dynamic prefixes
const PREFIX = "Games_";
const HTML_PREFIX = PREFIX + "HTML-";

const Events = {
  // HTML events
  HTML_No_Mobile_Version_Screen_Showed: `${PREFIX}HTML-No_Mobile_Version-Screen-Showed`,
  HTML_Detect_Incorrect_Browser:      `${PREFIX}HTML-Detect_Incorrect_Browser`,
  HTML_Click_Start:                  `${PREFIX}HTML_Click_Start`,
  HTML_Window_Error:                 `${PREFIX}HTML_Window_Error`,
  HTML_Window_UnhandledRejection:    `${PREFIX}HTML_Window_UnhandledRejection`,
  HTML_Button_Start_Showed:          `${PREFIX}HTML_Button_Start_Showed`,
  HTML_FocusLost_Started:            `${HTML_PREFIX}FocusLost_Started`,
  HTML_FocusLost_Ended:              `${HTML_PREFIX}FocusLost_Ended`,

  // Unity/WebGL events
  Unity_WebGL_Hello_world:           `${PREFIX}Unity_WebGL-Hello_world`,
  Hello_World:                       `${PREFIX}Hello_World`,
  Build_Hello_World:                 `${PREFIX}Client_Initialization`,

  // Generic game events
  Games_NewUser:                     `${PREFIX}NewUser`,

  // Splash screen events
  Splash_Screen_Loading_Started:     `${PREFIX}Splash-Screen-Loading-Started`,
  Splash_Screen_Loading_Finished:    `${PREFIX}Splash-Screen_Loading_Finished`,
  Splash_Screen_Showed:              `${PREFIX}Splash-Screen-Showed`,

  // Client download events
  Client_Download:                   `${PREFIX}Client_Download`,
  Client_Download_Error:             `${PREFIX}Client_Download_Error`,
  Client_Download_Full:              `${PREFIX}Client_Download_Full`,
  Client_Download_Full_All:          `${PREFIX}Client_Download_Full_All`,

  // Build load events
  Client_Build_Load_Started:         `${PREFIX}Client_Build_Load_Started`,
  Client_Build_Load_Finished:        `${PREFIX}Client_Build_Load_Finished`,

  // Maintenance and error events
  Client_MaintenanceBreak_TryAgain_Click: `${PREFIX}Client_MaintenanceBreak_TryAgain_Click`,
  Main_Script_Loading_Failed:        `${PREFIX}Main_Script_Loading_Failed`,

  // Game progress enum values
  Game_Error_Initialization:         `${PREFIX}Error_Initialization`,
  Game_Create_Unity_Instance:        `${PREFIX}Create_Unity_Instance`,

  // Mobile browser events
  Games_Mobile_Browser_Opened:       `${PREFIX}Mobile_Browser_Opened`,
  Games_Mobile_Browser_GooglePlay_Clicked: `${PREFIX}Mobile_Browser_GooglePlay_Clicked`,

  // Video player events
  Games_Video_Load_API_Started:      `${HTML_PREFIX}Video_Player_Load_API_Started`,
  Games_Video_Load_API_Error:        `${HTML_PREFIX}Video_Player_Load_API_Error`,
  Games_Video_Load_API_Finished:     `${HTML_PREFIX}Video_Player_Load_API_Finished`,
  Games_Video_Init_Started:          `${HTML_PREFIX}Video_Player_Init_Started`,
  Games_Video_Player_Ready:          `${HTML_PREFIX}Video_Player_Ready`,
  Games_Video_Player_State_Changed:  `${HTML_PREFIX}Video_State_Changed`,
  Games_Video_Playback_Allow_Status_Changed: `${HTML_PREFIX}Video_Playback_Allow_Status_Changed`,
  Games_Video_Try_Change:            `${HTML_PREFIX}Video_Try_Change`,
  Games_Video_Try_Load:              `${HTML_PREFIX}Video_Try_Load`,
  Games_Video_Try_Play:              `${HTML_PREFIX}Video_Try_Play`,
  Games_Video_Try_Stop:              `${HTML_PREFIX}Video_Try_Stop`,
  Games_Video_Try_Pause:             `${HTML_PREFIX}Video_Try_Pause`,
  Games_Video_Error:                 `${HTML_PREFIX}Video_Error`,
  Games_Video_Geo_Fetch_Started:     `${HTML_PREFIX}Video_Geo_Fetch_Started`,
  Games_Video_Geo_Fetch_Finished:    `${HTML_PREFIX}Video_Geo_Fetch_Finished`,
  Games_Video_Geo_Fetch_Failed:      `${HTML_PREFIX}Video_Geo_Fetch_Failed`,
  Games_Video_API_Fetch_Started:     `${HTML_PREFIX}Video_API_Fetch_Started`,
  Games_Video_API_Fetch_Finished:    `${HTML_PREFIX}Video_API_Fetch_Finished`,
  Games_Video_API_Fetch_Failed:      `${HTML_PREFIX}Video_API_Fetch_Failed`,

  // Addressables and services
  Client_Addressables_Initializtion:  `${PREFIX}Client_Addressables_Initializtion`,
  Client_Register_Services:           `${PREFIX}Client_Register_Services`,

  /**
   * Returns the analytics event key for a start action.
   * @param {string} key - Base event key.
   * @returns {string} The start event key.
   */
  GetAnalyticsEventStartKey: (key) => `${key}_Started`,

  /**
   * Returns the analytics event key for a finish action.
   * @param {string} key - Base event key.
   * @returns {string} The finish event key.
   */
  GetAnalyticsEventFinishKey: (key) => `${key}_Finished`,
};

export default Events;
