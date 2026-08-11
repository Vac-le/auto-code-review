export function isAllowedDesktopPage(value, welcomeUrl, dashboardBaseUrl) {
  if (value === welcomeUrl) return true;
  if (!dashboardBaseUrl) return false;
  try { return new URL(value).origin === dashboardBaseUrl; }
  catch { return false; }
}
