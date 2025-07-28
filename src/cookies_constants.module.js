// cookies_constants.module.js

const COOKIES_PREFIX = "_mgmst1";

const CookiesConstants = {
  // Storage keys
  ACCESS_TOKEN_PREFS_KEY: `${COOKIES_PREFIX}_p_at`,
  REFRESH_TOKEN_PREFS_KEY: `${COOKIES_PREFIX}_p_rt`,
  XSOLLA_METAFRAME_TOKEN_PREFS_KEY: "xsolla_metaframe_token",
};

export default CookiesConstants;
