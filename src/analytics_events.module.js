// SRC/Analytics_events.module.js
// Updated List of Events Events for Detailed Tracing

const PREFIX = "Games_";
const HTML_PREFIX = PREFIX + "HTML-";

const Events = {
  // ================================
  // HTML/Browser Events
  // ================================
  HTML_No_Mobile_Version_Screen_Showed: `${PREFIX}HTML-No_Mobile_Version-Screen-Showed`,
  HTML_Detect_Incorrect_Browser: `${PREFIX}HTML-Detect_Incorrect_Browser`,
  HTML_Click_Start: `${PREFIX}HTML_Click_Start`,
  HTML_Window_Error: `${PREFIX}HTML_Window_Error`,
  HTML_Window_UnhandledRejection: `${PREFIX}HTML_Window_UnhandledRejection`,
  HTML_Critical_Error: `${PREFIX}HTML_Critical_Error`, // New
  HTML_Button_Start_Showed: `${PREFIX}HTML_Button_Start_Showed`,
  HTML_FocusLost_Started: `${HTML_PREFIX}FocusLost_Started`,
  HTML_FocusLost_Ended: `${HTML_PREFIX}FocusLost_Ended`,
  HTML_WebGL_Context_Lost: `${HTML_PREFIX}WebGL_Context_Lost`, // New
  HTML_WebGL_Context_Recovered: `${HTML_PREFIX}WebGL_Context_Recovered`, // New

  // ================================
  // Application Lifecycle
  // ================================
  Hello_World: `${PREFIX}Hello_World`,
  Build_Hello_World: `${PREFIX}Client_Initialization`,
  Unity_WebGL_Hello_world: `${PREFIX}Unity_WebGL-Hello_world`,
  Games_NewUser: `${PREFIX}NewUser`,
  Page_Unload: `${PREFIX}Page_Unload`, // New

  // =====================================================body
  // Splash screen & ui
  // =====================================================body
  Splash_Screen_Loading_Started: `${PREFIX}Splash-Screen-Loading-Started`,
  Splash_Screen_Loading_Progress: `${PREFIX}Splash-Screen-Loading-Progress`, // New
  Splash_Screen_Loading_Success: `${PREFIX}Splash-Screen-Loading-Success`, // New
  Splash_Screen_Loading_Error: `${PREFIX}Splash-Screen-Loading-Error`, // New
  Splash_Screen_Loading_Finished: `${PREFIX}Splash-Screen_Loading_Finished`,
  Splash_Screen_Showed: `${PREFIX}Splash-Screen-Showed`,

  // ================================
  // Resource Download & Loading
  // ================================
  Client_Download: `${PREFIX}Client_Download`,
  Client_Download_Started: `${PREFIX}Client_Download_Started`, // New
  Client_Download_Progress: `${PREFIX}Client_Download_Progress`, // New
  Client_Download_Success: `${PREFIX}Client_Download_Success`, // New
  Client_Download_Error: `${PREFIX}Client_Download_Error`,
  Client_Download_Full: `${PREFIX}Client_Download_Full`,
  Client_Download_Full_All: `${PREFIX}Client_Download_Full_All`,

  // Resource-specific events
  Resource_Load_Started: `${PREFIX}Resource_Load_Started`, // New
  Resource_Load_Progress: `${PREFIX}Resource_Load_Progress`, // New
  Resource_Load_Success: `${PREFIX}Resource_Load_Success`, // New
  Resource_Load_Error: `${PREFIX}Resource_Load_Error`, // New

  // =====================================================body
  // Unity Build Loading
  // =====================================================body
  Client_Build_Load_Started: `${PREFIX}Client_Build_Load_Started`,
  Client_Build_Load_Progress: `${PREFIX}Client_Build_Load_Progress`, // New
  Client_Build_Load_Success: `${PREFIX}Client_Build_Load_Success`, // New
  Client_Build_Load_Error: `${PREFIX}Client_Build_Load_Error`, // New
  Client_Build_Load_Finished: `${PREFIX}Client_Build_Load_Finished`,

  // Unity Instance Creation
  Game_Create_Unity_Instance: `${PREFIX}Create_Unity_Instance`,
  Unity_Instance_Creation_Started: `${PREFIX}Unity_Instance_Creation_Started`, // New
  Unity_Instance_Creation_Progress: `${PREFIX}Unity_Instance_Creation_Progress`, // New
  Unity_Instance_Creation_Success: `${PREFIX}Unity_Instance_Creation_Success`, // New
  Unity_Instance_Creation_Error: `${PREFIX}Unity_Instance_Creation_Error`, // New

  // =====================================================body
  // Webgl & Graphics
  // =====================================================body
  WebGL_Check_Started: `${PREFIX}WebGL_Check_Started`, // New
  WebGL_Check_Success: `${PREFIX}WebGL_Check_Success`, // New
  WebGL_Check_Error: `${PREFIX}WebGL_Check_Error`, // New
  WebGL_Context_Creation_Started: `${PREFIX}WebGL_Context_Creation_Started`, // New
  WebGL_Context_Creation_Success: `${PREFIX}WebGL_Context_Creation_Success`, // New
  WebGL_Context_Creation_Error: `${PREFIX}WebGL_Context_Creation_Error`, // New

  // =====================================================body
  // Error Handling & Maintenance
  // =====================================================body
  Game_Error_Initialization: `${PREFIX}Error_Initialization`,
  Client_MaintenanceBreak_TryAgain_Click: `${PREFIX}Client_MaintenanceBreak_TryAgain_Click`,
  Main_Script_Loading_Started: `${PREFIX}Main_Script_Loading_Started`, // New
  Main_Script_Loading_Progress: `${PREFIX}Main_Script_Loading_Progress`, // New
  Main_Script_Loading_Success: `${PREFIX}Main_Script_Loading_Success`, // New
  Main_Script_Loading_Failed: `${PREFIX}Main_Script_Loading_Failed`,

  // ================================
  // Mobile Browser
  // ================================
  Games_Mobile_Browser_Opened: `${PREFIX}Mobile_Browser_Opened`,
  Games_Mobile_Browser_GooglePlay_Clicked: `${PREFIX}Mobile_Browser_GooglePlay_Clicked`,

  // =====================================================body
  // Analytics & Geo
  // =====================================================body
  Analytics_Init_Started: `${PREFIX}Analytics_Init_Started`, // New
  Analytics_Init_Success: `${PREFIX}Analytics_Init_Success`, // New
  Analytics_Init_Error: `${PREFIX}Analytics_Init_Error`, // New

  Geo_Detection_Started: `${PREFIX}Geo_Detection_Started`, // New
  Geo_Detection_Success: `${PREFIX}Geo_Detection_Success`, // New
  Geo_Detection_Error: `${PREFIX}Geo_Detection_Error`, // New

  // ================================
  // Video Player Events
  // ================================
  Games_Video_Load_API_Started: `${HTML_PREFIX}Video_Player_Load_API_Started`,
  Games_Video_Load_API_Progress: `${HTML_PREFIX}Video_Player_Load_API_Progress`, // New
  Games_Video_Load_API_Success: `${HTML_PREFIX}Video_Player_Load_API_Success`, // New
  Games_Video_Load_API_Error: `${HTML_PREFIX}Video_Player_Load_API_Error`,
  Games_Video_Load_API_Finished: `${HTML_PREFIX}Video_Player_Load_API_Finished`,

  Games_Video_Init_Started: `${HTML_PREFIX}Video_Player_Init_Started`,
  Games_Video_Init_Progress: `${HTML_PREFIX}Video_Player_Init_Progress`, // New
  Games_Video_Init_Success: `${HTML_PREFIX}Video_Player_Init_Success`, // New
  Games_Video_Init_Error: `${HTML_PREFIX}Video_Player_Init_Error`, // New

  Games_Video_Player_Ready: `${HTML_PREFIX}Video_Player_Ready`,
  Games_Video_Player_State_Changed: `${HTML_PREFIX}Video_State_Changed`,
  Games_Video_Playback_Allow_Status_Changed: `${HTML_PREFIX}Video_Playback_Allow_Status_Changed`,

  Games_Video_Try_Change: `${HTML_PREFIX}Video_Try_Change`,
  Games_Video_Try_Load: `${HTML_PREFIX}Video_Try_Load`,
  Games_Video_Try_Play: `${HTML_PREFIX}Video_Try_Play`,
  Games_Video_Try_Stop: `${HTML_PREFIX}Video_Try_Stop`,
  Games_Video_Try_Pause: `${HTML_PREFIX}Video_Try_Pause`,

  Games_Video_Error: `${HTML_PREFIX}Video_Error`,
  Games_Video_Geo_Fetch_Started: `${HTML_PREFIX}Video_Geo_Fetch_Started`,
  Games_Video_Geo_Fetch_Finished: `${HTML_PREFIX}Video_Geo_Fetch_Finished`,
  Games_Video_Geo_Fetch_Failed: `${HTML_PREFIX}Video_Geo_Fetch_Failed`,
  Games_Video_API_Fetch_Started: `${HTML_PREFIX}Video_API_Fetch_Started`,
  Games_Video_API_Fetch_Finished: `${HTML_PREFIX}Video_API_Fetch_Finished`,
  Games_Video_API_Fetch_Failed: `${HTML_PREFIX}Video_API_Fetch_Failed`,

  // =====================================================body
  // Audio Events
  // =====================================================body
  Audio_Init_Started: `${PREFIX}Audio_Init_Started`, // New
  Audio_Init_Success: `${PREFIX}Audio_Init_Success`, // New
  Audio_Init_Error: `${PREFIX}Audio_Init_Error`, // New
  Audio_Play_Started: `${PREFIX}Audio_Play_Started`, // New
  Audio_Play_Success: `${PREFIX}Audio_Play_Success`, // New
  Audio_Play_Error: `${PREFIX}Audio_Play_Error`, // New
  Audio_Load_Started: `${PREFIX}Audio_Load_Started`, // New
  Audio_Load_Success: `${PREFIX}Audio_Load_Success`, // New
  Audio_Load_Error: `${PREFIX}Audio_Load_Error`, // New

  // =====================================================body
  // Xsolla Integration Events
  // =====================================================body
  Xsolla_Init_Started: `${PREFIX}Xsolla_Init_Started`, // New
  Xsolla_Init_Success: `${PREFIX}Xsolla_Init_Success`, // New
  Xsolla_Init_Error: `${PREFIX}Xsolla_Init_Error`, // New

  Xsolla_Auth_Started: `${PREFIX}Xsolla_Auth_Started`, // New
  Xsolla_Auth_Success: `${PREFIX}Xsolla_Auth_Success`, // New
  Xsolla_Auth_Error: `${PREFIX}Xsolla_Auth_Error`, // New

  Xsolla_Payment_Started: `${PREFIX}Xsolla_Payment_Started`, // New
  Xsolla_Payment_Success: `${PREFIX}Xsolla_Payment_Success`, // New
  Xsolla_Payment_Error: `${PREFIX}Xsolla_Payment_Error`, // New

  Xsolla_Metaframe_Init_Started: `${PREFIX}Xsolla_Metaframe_Init_Started`, // New
  Xsolla_Metaframe_Init_Success: `${PREFIX}Xsolla_Metaframe_Init_Success`, // New
  Xsolla_Metaframe_Init_Error: `${PREFIX}Xsolla_Metaframe_Init_Error`, // New

  // =====================================================body
  // Firebase Integration Events
  // =====================================================body
  Firebase_Init_Started: `${PREFIX}Firebase_Init_Started`, // New
  Firebase_Init_Success: `${PREFIX}Firebase_Init_Success`, // New
  Firebase_Init_Error: `${PREFIX}Firebase_Init_Error`, // New
  Firebase_Auth_Started: `${PREFIX}Firebase_Auth_Started`, // New
  Firebase_Auth_Success: `${PREFIX}Firebase_Auth_Success`, // New
  Firebase_Auth_Error: `${PREFIX}Firebase_Auth_Error`, // New
  Firebase_Log_Sent: `${PREFIX}Firebase_Log_Sent`, // New
  Firebase_Log_Error: `${PREFIX}Firebase_Log_Error`, // New

  // ================================
  // Performance & System Events
  // ================================
  Performance_Metrics_Collected: `${PREFIX}Performance_Metrics_Collected`, // New
  Performance_Warning: `${PREFIX}Performance_Warning`, // New
  Performance_Critical: `${PREFIX}Performance_Critical`, // New

  System_Memory_Warning: `${PREFIX}System_Memory_Warning`, // New
  System_Memory_Critical: `${PREFIX}System_Memory_Critical`, // New
  System_Network_Status_Changed: `${PREFIX}System_Network_Status_Changed`, // New
  System_Visibility_Changed: `${PREFIX}System_Visibility_Changed`, // New

  // ================================
  // User Interaction Events
  // ================================
  User_First_Interaction: `${PREFIX}User_First_Interaction`, // New
  User_Input_Started: `${PREFIX}User_Input_Started`, // New
  User_Input_Success: `${PREFIX}User_Input_Success`, // New
  User_Input_Error: `${PREFIX}User_Input_Error`, // New
  User_Session_Started: `${PREFIX}User_Session_Started`, // New
  User_Session_Ended: `${PREFIX}User_Session_Ended`, // New

  // =====================================================body
  // Debug & Development Events
  // =====================================================body
  Debug_Mode_Enabled: `${PREFIX}Debug_Mode_Enabled`, // New
  Debug_Command_Executed: `${PREFIX}Debug_Command_Executed`, // New
  Console_Command_Executed: `${PREFIX}Console_Command_Executed`, // New

  // ================================
  // Legacy Events (for backwards compatibility)
  // ================================
  Client_Addressables_Initializtion: `${PREFIX}Client_Addressables_Initializtion`,
  Client_Register_Services: `${PREFIX}Client_Register_Services`,

  // ================================
  // Utility Functions
  // ================================

  /**
   * Returns Analytics Event Key to start action
   * @param {string} baseKey -the base key of the event
   * @returns {string} The event key to start
   */
  GetAnalyticsEventStartKey: (baseKey) => `${baseKey}_Started`,

  /**
   * Returns Analytics Event Key to complete the action
   * @param {string} baseKey -the base key of the event
   * @returns {string} The event key to complete
   */
  GetAnalyticsEventFinishKey: (baseKey) => `${baseKey}_Finished`,

  /**
   * Returns Analytics Event Key to progress action
   * @param {string} baseKey -the base key of the event
   * @returns {string} The key to the event to progress
   */
  GetAnalyticsEventProgressKey: (baseKey) => `${baseKey}_Progress`,

  /**
   * Returns Analytics Event Key for successful completion
   * @param {string} baseKey -the base key of the event
   * @returns {string} The event key to success
   */
  GetAnalyticsEventSuccessKey: (baseKey) => `${baseKey}_Success`,

  /**
   * Returns Analytics Event Key for Error
   * @param {string} baseKey -the base key of the event
   * @returns {string} The event key to an error
   */
  GetAnalyticsEventErrorKey: (baseKey) => `${baseKey}_Error`,

  /**
   * Creates a set of events for full Lifecycle Tracking
   * @param {string} baseName -Basic Operation Name
   * @returns {Object} Object with keys for all stages of Lifecycle
   */
  CreateLifecycleEvents: (baseName) => ({
    Started: `${PREFIX}${baseName}_Started`,
    Progress: `${PREFIX}${baseName}_Progress`,
    Success: `${PREFIX}${baseName}_Success`,
    Error: `${PREFIX}${baseName}_Error`,
    Finished: `${PREFIX}${baseName}_Finished`,
  }),

  /**
   * Checks whether the event is critical
   * @param {string} eventName -the name of the event
   * @returns {boolean} TRUE If the event is critical
   */
  IsCriticalEvent: (eventName) => {
    const criticalPatterns = [
      /_Error$/,
      /_Critical$/,
      /HTML_Window_Error/,
      /HTML_Critical_Error/,
      /WebGL.*Error/,
      /Unity.*Error/,
      /System.*Critical/,
    ];

    return criticalPatterns.some((pattern) => pattern.test(eventName));
  },

  /**
   * Gets the event category by its name
   * @param {string} eventName -the name of the event
   * @returns {string} Category of the event
   */
  GetEventCategory: (eventName) => {
    if (eventName.includes("HTML_")) return "Browser";
    if (eventName.includes("Unity_")) return "Unity";
    if (eventName.includes("Video_")) return "Video";
    if (eventName.includes("Audio_")) return "Audio";
    if (eventName.includes("Xsolla_")) return "Payment";
    if (eventName.includes("Firebase_")) return "Analytics";
    if (eventName.includes("Performance_")) return "Performance";
    if (eventName.includes("System_")) return "System";
    if (eventName.includes("User_")) return "User";
    if (eventName.includes("Debug_")) return "Debug";
    return "General";
  },

  /**
   * Creates an event with standard metadata
   * @param {string} eventName -the name of the event
   * @param {Object} data -Event data
   * @returns {Object} Enriched event
   */
  EnrichEvent: (eventName, data = {}) => ({
    event_name: eventName,
    event_category: Events.GetEventCategory(eventName),
    is_critical: Events.IsCriticalEvent(eventName),
    timestamp: Date.now(),
    session_time: performance.now(),
    ...data,
  }),
};

// Export Constants for convenience
export const EVENT_CATEGORIES = {
  BROWSER: "Browser",
  UNITY: "Unity",
  VIDEO: "Video",
  AUDIO: "Audio",
  PAYMENT: "Payment",
  ANALYTICS: "Analytics",
  PERFORMANCE: "Performance",
  SYSTEM: "System",
  USER: "User",
  DEBUG: "Debug",
  GENERAL: "General",
};

export const EVENT_TYPES = {
  STARTED: "Started",
  PROGRESS: "Progress",
  SUCCESS: "Success",
  ERROR: "Error",
  FINISHED: "Finished",
};

export default Events;
