export const publicApiToken = __ENV.BTH_PUBLIC_API_TOKEN;
export const apiBaseUrl = __ENV.BTH_API_BASE_URL;
export const apiDefaultHeaders = {
  "content-type": "application/json",
  "x-token": publicApiToken,
};
