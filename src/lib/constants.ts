/**
 * Demo user for testing without authentication
 */
export const DEMO_USER = {
  id: "demo-user-id",
  name: "Usuario Demo",
  email: "demo@snpanalyzer.com",
  image: null,
  emailVerified: null,
};

export const DEMO_SESSION = {
  user: DEMO_USER,
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
};
