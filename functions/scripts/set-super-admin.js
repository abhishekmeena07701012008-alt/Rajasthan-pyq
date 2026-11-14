/**
 * Super Admin Role Setup
 *
 * Usage:
 * 1. Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path.
 * 2. Set SUPER_ADMIN_EMAIL to the Google account email.
 * 3. Run: node scripts/set-super-admin.js
 *
 * IMPORTANT:
 * Never upload the service account JSON file to GitHub
 * or include it in your public project ZIP.
 */

const admin = require("firebase-admin");

async function setSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();

  if (!email) {
    throw new Error(
      "SUPER_ADMIN_EMAIL environment variable is missing."
    );
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS environment variable is missing."
    );
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.GCLOUD_PROJECT || "rajasthan-pyq-e1803"
    });
  }

  const auth = admin.auth();

  // Find the Firebase Authentication user.
  const user = await auth.getUserByEmail(email);

  if (!user.emailVerified) {
    throw new Error(
      "This account's email is not verified. Verify it before granting Super Admin access."
    );
  }

  // Preserve existing custom claims.
  const existingClaims = user.customClaims || {};

  const updatedClaims = {
    ...existingClaims,
    admin: true,
    role: "super_admin"
  };

  await auth.setCustomUserClaims(user.uid, updatedClaims);

  console.log("----------------------------------");
  console.log("SUPER ADMIN ROLE ASSIGNED");
  console.log("----------------------------------");
  console.log("Project:", "rajasthan-pyq-e1803");
  console.log("Email:", user.email);
  console.log("UID:", user.uid);
  console.log("Role:", "super_admin");
  console.log("----------------------------------");
  console.log(
    "Sign out and sign in again in the app to refresh the ID token."
  );
}

setSuperAdmin().catch((error) => {
  console.error("Super Admin setup failed:", error.message);
  process.exitCode = 1;
});
