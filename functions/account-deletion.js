// functions/account-deletion.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");

function createAccountDeletionFunction(admin) {
  return onCall(
    {
      region: "asia-south1",
      enforceAppCheck: true
    },
    async (request) => {
      // यूज़र का लॉगिन अनिवार्य है
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "अकाउंट डिलीट करने के लिए पहले लॉगिन करें।"
        );
      }

      const uid = request.auth.uid;
      const db = admin.firestore();
      const userRef = db.collection("users").doc(uid);

      try {
        // यूज़र का पूरा Firestore डॉक्यूमेंट और सब-कलेक्शन हटाएँ
        const userSnapshot = await userRef.get();

        if (userSnapshot.exists) {
          await db.recursiveDelete(userRef);
        }

        // Firebase Authentication अकाउंट हटाएँ
        try {
          await admin.auth().deleteUser(uid);
        } catch (authError) {
          if (authError.code !== "auth/user-not-found") {
            throw authError;
          }
        }

        return {
          success: true,
          message: "आपका अकाउंट डिलीट कर दिया गया है।"
        };

      } catch (error) {
        console.error("Account deletion failed:", {
          uid,
          error: error.message
        });

        throw new HttpsError(
          "internal",
          "अकाउंट डिलीट नहीं हो पाया। कृपया सहायता टीम से संपर्क करें।"
        );
      }
    }
  );
}

module.exports = {
  createAccountDeletionFunction
};
