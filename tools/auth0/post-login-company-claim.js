# Auth0 Post-Login Action: office web company scope claim (D-049)
#
# Paste this into Auth0 Dashboard -> Actions -> Flows -> Login -> Add Action ->
# Build from scratch, then Deploy and attach it to the Login flow.
#
# Then set the user's app_metadata.company_id in Auth0 (User Management ->
# Users -> open the user -> Metadata -> app_metadata), for example:
#   { "company_id": "aaa" }
#
# Keep this claim namespace stable: the office web defaults
# AUTH0_COMPANY_ID_CLAIM to the same value. A claim only selects the tenant
# scope presented to the API; the API still verifies the token and company
# membership, so a claim alone never grants access.

exports.onExecutePostLogin = async (event, api) => {
  const companyId = event.user.app_metadata && event.user.app_metadata.company_id;
  if (typeof companyId === 'string' && companyId.trim().length > 0) {
    api.accessToken.setCustomClaim(
      'https://height-safety.example/claims/company_id',
      companyId.trim(),
    );
  }
};
