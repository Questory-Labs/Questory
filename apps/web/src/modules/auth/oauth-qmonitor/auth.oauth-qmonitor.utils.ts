import {
  QMONITOR_CLIENT_ID,
  QMONITOR_REDIRECT_URI,
  QMONITOR_SCOPE,
} from "@questorylabs/shared";

export type QmonitorAuthorizeQuery = {
  client_id: string;
  redirect_uri: string;
  state: string;
  scope: string;
  code_challenge: string;
  code_challenge_method: string;
  device_id: string;
  response_type: string;
};

type ParamsLike = { get(name: string): string | null };

export const readAuthorizeQuery = (
  search: ParamsLike,
): QmonitorAuthorizeQuery => ({
  client_id: search.get("client_id") || "",
  redirect_uri: search.get("redirect_uri") || "",
  state: search.get("state") || "",
  scope: search.get("scope") || "",
  code_challenge: search.get("code_challenge") || "",
  code_challenge_method: search.get("code_challenge_method") || "",
  device_id: search.get("device_id") || "",
  response_type: search.get("response_type") || "code",
});

export const isAuthorizeQueryValid = (query: QmonitorAuthorizeQuery) =>
  query.client_id === QMONITOR_CLIENT_ID &&
  query.redirect_uri === QMONITOR_REDIRECT_URI &&
  query.scope.split(/\s+/).includes(QMONITOR_SCOPE) &&
  query.code_challenge_method === "S256" &&
  query.state.length >= 8 &&
  query.code_challenge.length >= 43 &&
  query.device_id.length >= 16;

export function safeLoginNext(pathWithQuery: string): string {
  if (!pathWithQuery.startsWith("/oauth/qmonitor/authorize")) {
    return "/oauth/qmonitor/authorize";
  }
  return pathWithQuery;
}
