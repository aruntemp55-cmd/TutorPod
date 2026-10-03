/** Login-first student app: logout always returns to Login, never guest Home. */
export const SETTINGS_LOGOUT_ROUTE = "Login" as const;

export function settingsLogoutReset() {
  return {
    index: 0 as const,
    routes: [{ name: SETTINGS_LOGOUT_ROUTE }],
  };
}

/** Settings actions for signed-in students (R030). Logout is always present. */
export function settingsActionVisibility(mandatory: boolean) {
  return {
    saveOrContinue: true,
    backToMain: !mandatory,
    logout: true,
  } as const;
}
