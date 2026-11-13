import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  doc,
  getDoc,
  Timestamp
} from "firebase/firestore";

import {
  getIdTokenResult
} from "firebase/auth";

import {
  getFunctions,
  httpsCallable
} from "firebase/functions";

import { db, auth } from "./firebase.js";

/*
|--------------------------------------------------------------------------
| ADMIN CONFIGURATION
|--------------------------------------------------------------------------
*/

export const ADMIN_CONFIG = {
  FUNCTIONS_REGION: "asia-south1",

  COLLECTIONS: {
    USERS: "users",
    QUESTIONS: "questions",
    EXAMS: "exams",
    SUBJECTS: "subjects",
    ATTEMPTS: "testAttempts",
    REPORTS: "reports",
    SOURCES: "pyqSources",
    AI_JOBS: "aiResearchJobs",
    ANNOUNCEMENTS: "announcements",
    ACTIVITY_LOGS: "activityLogs",
    CURRENT_AFFAIRS: "currentAffairs"
  },

  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100
};

/*
|--------------------------------------------------------------------------
| ADMIN ROLES
|--------------------------------------------------------------------------
*/

export const ADMIN_ROLES = {
  SUPER_ADMIN: "superAdmin",
  ADMIN_EDITOR: "adminEditor",
  USER: "user"
};

/*
|--------------------------------------------------------------------------
| PERMISSIONS
|--------------------------------------------------------------------------
*/

export const ADMIN_PERMISSIONS = {
  VIEW_DASHBOARD: "view_dashboard",
  VIEW_USERS: "view_users",
  VIEW_QUESTIONS: "view_questions",
  CREATE_QUESTIONS: "create_questions",
  EDIT_QUESTIONS: "edit_questions",
  DELETE_QUESTIONS: "delete_questions",
  VERIFY_PYQ: "verify_pyq",
  PUBLISH_CONTENT: "publish_content",
  MANAGE_EXAMS: "manage_exams",
  MANAGE_CURRENT_AFFAIRS: "manage_current_affairs",
  MANAGE_ANNOUNCEMENTS: "manage_announcements",
  REVIEW_REPORTS: "review_reports",
  RUN_AI_RESEARCH: "run_ai_research",
  IMPORT_CONTENT: "import_content",
  EXPORT_CONTENT: "export_content",
  MANAGE_ADMINS: "manage_admins",
  MANAGE_SETTINGS: "manage_settings",
  VIEW_AUDIT_LOGS: "view_audit_logs"
};

/*
|--------------------------------------------------------------------------
| ROLE PERMISSION MAP
|--------------------------------------------------------------------------
| This map controls UI visibility only.
| Backend must independently enforce every permission.
|--------------------------------------------------------------------------
*/

const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: Object.values(
    ADMIN_PERMISSIONS
  ),

  [ADMIN_ROLES.ADMIN_EDITOR]: [
    ADMIN_PERMISSIONS.VIEW_DASHBOARD,
    ADMIN_PERMISSIONS.VIEW_QUESTIONS,
    ADMIN_PERMISSIONS.CREATE_QUESTIONS,
    ADMIN_PERMISSIONS.EDIT_QUESTIONS,
    ADMIN_PERMISSIONS.MANAGE_CURRENT_AFFAIRS,
    ADMIN_PERMISSIONS.MANAGE_ANNOUNCEMENTS,
    ADMIN_PERMISSIONS.REVIEW_REPORTS,
    ADMIN_PERMISSIONS.RUN_AI_RESEARCH,
    ADMIN_PERMISSIONS.IMPORT_CONTENT,
    ADMIN_PERMISSIONS.EXPORT_CONTENT
  ],

  [ADMIN_ROLES.USER]: []
};

/*
|--------------------------------------------------------------------------
| FIREBASE FUNCTIONS
|--------------------------------------------------------------------------
*/

const functions = getFunctions(
  undefined,
  ADMIN_CONFIG.FUNCTIONS_REGION
);

/*
|--------------------------------------------------------------------------
| CURRENT ADMIN STATE
|--------------------------------------------------------------------------
*/

let adminState = {
  initialized: false,
  authenticated: false,
  isAdmin: false,
  role: ADMIN_ROLES.USER,
  permissions: [],
  uid: null,
  email: null,
  displayName: null,
  error: null
};

/*
|--------------------------------------------------------------------------
| BASIC HELPERS
|--------------------------------------------------------------------------
*/

function normalizeRole(claims = {}) {
  if (claims.superAdmin === true) {
    return ADMIN_ROLES.SUPER_ADMIN;
  }

  if (
    claims.adminEditor === true ||
    claims.admin === true
  ) {
    return ADMIN_ROLES.ADMIN_EDITOR;
  }

  if (
    typeof claims.role === "string" &&
    [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.ADMIN_EDITOR
    ].includes(claims.role)
  ) {
    return claims.role;
  }

  return ADMIN_ROLES.USER;
}

function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/*
|--------------------------------------------------------------------------
| GET CURRENT USER CLAIMS
|--------------------------------------------------------------------------
*/

export async function getAdminClaims(options = {}) {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  try {
    const tokenResult = await getIdTokenResult(
      user,
      options.forceRefresh === true
    );

    return {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      claims: tokenResult.claims,
      tokenIssuedAt: tokenResult.issuedAtTime,
      tokenExpiration: tokenResult.expirationTime
    };

  } catch (error) {
    console.error("Admin claims error:", error);
    throw new Error("Admin permissions जाँच नहीं हो पाईं।");
  }
}

/*
|--------------------------------------------------------------------------
| INITIALIZE ADMIN ACCESS
|--------------------------------------------------------------------------
*/

export async function initializeAdminAccess(options = {}) {
  adminState = {
    initialized: true,
    authenticated: false,
    isAdmin: false,
    role: ADMIN_ROLES.USER,
    permissions: [],
    uid: null,
    email: null,
    displayName: null,
    error: null
  };

  const user = auth.currentUser;

  if (!user) {
    return getAdminState();
  }

  try {
    const identity = await getAdminClaims(options);

    if (!identity) {
      return getAdminState();
    }

    const role = normalizeRole(identity.claims);

    const isAdmin = [
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.ADMIN_EDITOR
    ].includes(role);

    adminState = {
      initialized: true,
      authenticated: true,
      isAdmin,
      role,
      permissions: getPermissionsForRole(role),
      uid: identity.uid,
      email: identity.email,
      displayName: identity.displayName,
      error: null
    };

    return getAdminState();

  } catch (error) {
    adminState.error = error.message;

    return getAdminState();
  }
}

/*
|--------------------------------------------------------------------------
| ADMIN STATE
|--------------------------------------------------------------------------
*/

export function getAdminState() {
  return {
    ...adminState,
    permissions: [...adminState.permissions]
  };
}

/*
|--------------------------------------------------------------------------
| CHECK ADMIN ACCESS
|--------------------------------------------------------------------------
*/

export function isAdmin() {
  return adminState.isAdmin;
}

export function isSuperAdmin() {
  return adminState.role === ADMIN_ROLES.SUPER_ADMIN;
}

export function isAdminEditor() {
  return adminState.role === ADMIN_ROLES.ADMIN_EDITOR;
}

export function hasAdminPermission(permission) {
  return (
    adminState.isAdmin &&
    adminState.permissions.includes(permission)
  );
}

/*
|--------------------------------------------------------------------------
| REQUIRE ADMIN ACCESS
|--------------------------------------------------------------------------
*/

export async function requireAdmin(options = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("इस सुविधा के लिए Login आवश्यक है।");
  }

  const identity = await getAdminClaims({
    forceRefresh: options.forceRefresh === true
  });

  if (!identity) {
    throw new Error("User authentication उपलब्ध नहीं है।");
  }

  const role = normalizeRole(identity.claims);

  if (
    role !== ADMIN_ROLES.SUPER_ADMIN &&
    role !== ADMIN_ROLES.ADMIN_EDITOR
  ) {
    throw new Error("आपके पास Admin Access नहीं है।");
  }

  const permissions = getPermissionsForRole(role);

  if (
    options.permission &&
    !permissions.includes(options.permission)
  ) {
    throw new Error("आपको इस काम की अनुमति नहीं है।");
  }

  return {
    uid: identity.uid,
    email: identity.email,
    role,
    permissions
  };
}

/*
|--------------------------------------------------------------------------
| REQUIRE SUPER ADMIN
|--------------------------------------------------------------------------
*/

export async function requireSuperAdmin() {
  const identity = await requireAdmin({
    forceRefresh: true
  });

  if (identity.role !== ADMIN_ROLES.SUPER_ADMIN) {
    throw new Error("यह सुविधा केवल Super Admin के लिए है।");
  }

  return identity;
}

/*
|--------------------------------------------------------------------------
| SECURE CLOUD FUNCTION CALL
|--------------------------------------------------------------------------
| All privileged mutations must happen on the backend.
|--------------------------------------------------------------------------
*/

const ADMIN_FUNCTIONS = {
  CREATE_QUESTION: "adminCreateQuestion",
  UPDATE_QUESTION: "adminUpdateQuestion",
  DELETE_QUESTION: "adminDeleteQuestion",
  VERIFY_PYQ: "adminVerifyPYQ",
  PUBLISH_QUESTION: "adminPublishQuestion",

  CREATE_CURRENT_AFFAIRS: "adminCreateCurrentAffair",
  UPDATE_CURRENT_AFFAIRS: "adminUpdateCurrentAffair",
  PUBLISH_CURRENT_AFFAIRS: "adminPublishCurrentAffair",

  CREATE_ANNOUNCEMENT: "adminCreateAnnouncement",
  UPDATE_ANNOUNCEMENT: "adminUpdateAnnouncement",
  PUBLISH_ANNOUNCEMENT: "adminPublishAnnouncement",

  IMPORT_QUESTIONS: "adminImportQuestions",
  EXPORT_QUESTIONS: "adminExportQuestions",

  START_AI_RESEARCH: "adminStartAIResearch",
  APPROVE_AI_RESEARCH: "adminApproveAIResearch",

  REVIEW_REPORT: "adminReviewReport",

  ASSIGN_ADMIN_ROLE: "adminAssignRole",
  REVOKE_ADMIN_ROLE: "adminRevokeRole",

  UPDATE_APP_SETTINGS: "adminUpdateAppSettings"
};

/*
|--------------------------------------------------------------------------
| CALL ADMIN CLOUD FUNCTION
|--------------------------------------------------------------------------
*/

export async function callAdminFunction(
  functionName,
  payload = {},
  options = {}
) {
  const allowedFunctions = Object.values(ADMIN_FUNCTIONS);

  if (!allowedFunctions.includes(functionName)) {
    throw new Error("अनुमति नहीं: Invalid admin function.");
  }

  if (options.permission) {
    await requireAdmin({
      permission: options.permission,
      forceRefresh: true
    });
  } else {
    await requireAdmin({
      forceRefresh: true
    });
  }

  try {
    const callable = httpsCallable(
      functions,
      functionName,
      {
        timeout: options.timeout || 60000
      }
    );

    const result = await callable(payload);

    return result.data;

  } catch (error) {
    console.error(
      `Admin function ${functionName} failed:`,
      error
    );

    throw new Error(
      error?.message ||
      "Admin operation पूरा नहीं हो पाया।"
    );
  }
}

/*
|--------------------------------------------------------------------------
| QUESTION MANAGEMENT
|--------------------------------------------------------------------------
*/

export async function getAdminQuestions(filters = {}, options = {}) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.VIEW_QUESTIONS
  });

  const pageSize = Math.min(
    Math.max(
      Number(options.pageSize) ||
        ADMIN_CONFIG.DEFAULT_PAGE_SIZE,
      1
    ),
    ADMIN_CONFIG.MAX_PAGE_SIZE
  );

  const constraints = [];

  if (filters.examId) {
    constraints.push(
      where("examIds", "array-contains", filters.examId)
    );
  }

  if (filters.subjectId) {
    constraints.push(
      where("subjectId", "==", filters.subjectId)
    );
  }

  if (filters.status) {
    constraints.push(
      where("status", "==", filters.status)
    );
  }

  if (filters.type) {
    constraints.push(
      where("type", "==", filters.type)
    );
  }

  if (filters.verificationStatus) {
    constraints.push(
      where(
        "verificationStatus",
        "==",
        filters.verificationStatus
      )
    );
  }

  constraints.push(
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  try {
    const result = await getDocs(
      query(
        collection(db, ADMIN_CONFIG.COLLECTIONS.QUESTIONS),
        ...constraints
      )
    );

    return result.docs.map(snapshot => ({
      id: snapshot.id,
      ...snapshot.data()
    }));

  } catch (error) {
    console.error("Admin questions error:", error);
    throw new Error("Questions लोड नहीं हो पाए।");
  }
}

/*
|--------------------------------------------------------------------------
| GET SINGLE ADMIN QUESTION
|--------------------------------------------------------------------------
*/

export async function getAdminQuestionById(questionId) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.VIEW_QUESTIONS
  });

  if (!questionId) {
    throw new Error("Question ID आवश्यक है।");
  }

  const snapshot = await getDoc(
    doc(
      db,
      ADMIN_CONFIG.COLLECTIONS.QUESTIONS,
      questionId
    )
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

/*
|--------------------------------------------------------------------------
| CREATE QUESTION
|--------------------------------------------------------------------------
*/

export async function createAdminQuestion(questionData) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.CREATE_QUESTIONS
  });

  if (!questionData || typeof questionData !== "object") {
    throw new Error("Question data आवश्यक है।");
  }

  return callAdminFunction(
    ADMIN_FUNCTIONS.CREATE_QUESTION,
    { question: questionData },
    {
      permission: ADMIN_PERMISSIONS.CREATE_QUESTIONS
    }
  );
}

/*
|--------------------------------------------------------------------------
| UPDATE QUESTION
|--------------------------------------------------------------------------
*/

export async function updateAdminQuestion(
  questionId,
  updates
) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.EDIT_QUESTIONS
  });

  if (!questionId || !updates) {
    throw new Error("Question ID और updates आवश्यक हैं।");
  }

  return callAdminFunction(
    ADMIN_FUNCTIONS.UPDATE_QUESTION,
    {
      questionId,
      updates
    },
    {
      permission: ADMIN_PERMISSIONS.EDIT_QUESTIONS
    }
  );
}

/*
|--------------------------------------------------------------------------
| DELETE QUESTION
|--------------------------------------------------------------------------
*/

export async function deleteAdminQuestion(questionId) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.DELETE_QUESTIONS
  });

  if (!questionId) {
    throw new Error("Question ID आवश्यक है।");
  }

  return callAdminFunction(
    ADMIN_FUNCTIONS.DELETE_QUESTION,
    { questionId },
    {
      permission: ADMIN_PERMISSIONS.DELETE_QUESTIONS
    }
  );
}

/*
|--------------------------------------------------------------------------
| VERIFY PREVIOUS YEAR QUESTION
|--------------------------------------------------------------------------
*/

export async function verifyAdminPYQ(
  questionId,
  verificationData
) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.VERIFY_PYQ
  });

  if (!questionId || !verificationData) {
    throw new Error("PYQ verification details आवश्यक हैं।");
  }

  return callAdminFunction(
    ADMIN_FUNCTIONS.VERIFY_PYQ,
    {
      questionId,
      verificationData
    },
    {
      permission: ADMIN_PERMISSIONS.VERIFY_PYQ
    }
  );
}

/*
|--------------------------------------------------------------------------
| PUBLISH QUESTION
|--------------------------------------------------------------------------
*/

export async function publishAdminQuestion(questionId) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.PUBLISH_CONTENT
  });

  return callAdminFunction(
    ADMIN_FUNCTIONS.PUBLISH_QUESTION,
    { questionId },
    {
      permission: ADMIN_PERMISSIONS.PUBLISH_CONTENT
    }
  );
}

/*
|--------------------------------------------------------------------------
| CURRENT AFFAIRS MANAGEMENT
|--------------------------------------------------------------------------
*/

export async function createAdminCurrentAffair(data) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.MANAGE_CURRENT_AFFAIRS
  });

  return callAdminFunction(
    ADMIN_FUNCTIONS.CREATE_CURRENT_AFFAIRS,
    { data },
    {
      permission: ADMIN_PERMISSIONS.MANAGE_CURRENT_AFFAIRS
    }
  );
}

export async function updateAdminCurrentAffair(id, updates) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.MANAGE_CURRENT_AFFAIRS
  });

  return callAdminFunction(
    ADMIN_FUNCTIONS.UPDATE_CURRENT_AFFAIRS,
    {
      id,
      updates
    },
    {
      permission: ADMIN_PERMISSIONS.MANAGE_CURRENT_AFFAIRS
    }
  );
}

export async function publishAdminCurrentAffair(id) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.MANAGE_CURRENT_AFFAIRS
  });

  return callAdminFunction(
    ADMIN_FUNCTIONS.PUBLISH_CURRENT_AFFAIRS,
    { id },
    {
      permission: ADMIN_PERMISSIONS.MANAGE_CURRENT_AFFAIRS
    }
  );
}

/*
|--------------------------------------------------------------------------
| ANNOUNCEMENT MANAGEMENT
|--------------------------------------------------------------------------
*/

export async function createAdminAnnouncement(data) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.MANAGE_ANNOUNCEMENTS
  });

  return callAdminFunction(
    ADMIN_FUNCTIONS.CREATE_ANNOUNCEMENT,
    { data },
    {
      permission: ADMIN_PERMISSIONS.MANAGE_ANNOUNCEMENTS
    }
  );
}

export async function updateAdminAnnouncement(id, updates) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.MANAGE_ANNOUNCEMENTS
  });

  return callAdminFunction(
    ADMIN_FUNCTIONS.UPDATE_ANNOUNCEMENT,
    {
      id,
      updates
    },
    {
      permission: ADMIN_PERMISSIONS.MANAGE_ANNOUNCEMENTS
    }
  );
}

export async function publishAdminAnnouncement(id) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.MANAGE_ANNOUNCEMENTS
  });

  return callAdminFunction(
    ADMIN_FUNCTIONS.PUBLISH_ANNOUNCEMENT,
    { id },
    {
      permission: ADMIN_PERMISSIONS.MANAGE_ANNOUNCEMENTS
    }
  );
}

/*
|--------------------------------------------------------------------------
| REPORT MANAGEMENT
|--------------------------------------------------------------------------
*/

export async function getAdminReports(options = {}) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.REVIEW_REPORTS
  });

  const pageSize = Math.min(
    Math.max(
      Number(options.pageSize) ||
        ADMIN_CONFIG.DEFAULT_PAGE_SIZE,
      1
    ),
    ADMIN_CONFIG.MAX_PAGE_SIZE
  );

  const constraints = [
    orderBy("createdAt", "desc"),
    limit(pageSize)
  ];

  if (options.status) {
    constraints.unshift(
      where("status", "==", options.status)
    );
  }

  const snapshot = await getDocs(
    query(
      collection(db, ADMIN_CONFIG.COLLECTIONS.REPORTS),
      ...constraints
    )
  );

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function reviewAdminReport(
  reportId,
  decision,
  note = ""
) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.REVIEW_REPORTS
  });

  if (!reportId || !decision) {
    throw new Error("Report ID और decision आवश्यक हैं।");
  }

  return callAdminFunction(
    ADMIN_FUNCTIONS.REVIEW_REPORT,
    {
      reportId,
      decision,
      note
    },
    {
      permission: ADMIN_PERMISSIONS.REVIEW_REPORTS
    }
  );
}

/*
|--------------------------------------------------------------------------
| AI RESEARCH MANAGEMENT
|--------------------------------------------------------------------------
*/

export async function startAdminAIResearch(request) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.RUN_AI_RESEARCH
  });

  if (!request || typeof request !== "object") {
    throw new Error("AI research request आवश्यक है।");
  }

  return callAdminFunction(
    ADMIN_FUNCTIONS.START_AI_RESEARCH,
    { request },
    {
      permission: ADMIN_PERMISSIONS.RUN_AI_RESEARCH,
      timeout: 120000
    }
  );
}

export async function approveAdminAIResearch(jobId, approval) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.RUN_AI_RESEARCH
  });

  if (!jobId || !approval) {
    throw new Error("Research job और approval आवश्यक हैं।");
  }

  return callAdminFunction(
    ADMIN_FUNCTIONS.APPROVE_AI_RESEARCH,
    {
      jobId,
      approval
    },
    {
      permission: ADMIN_PERMISSIONS.RUN_AI_RESEARCH
    }
  );
}

/*
|--------------------------------------------------------------------------
| ADMIN ROLE MANAGEMENT
|--------------------------------------------------------------------------
*/

export async function assignAdminRole(
  userId,
  role
) {
  await requireSuperAdmin();

  if (!userId) {
    throw new Error("User ID आवश्यक है।");
  }

  if (
    ![
      ADMIN_ROLES.ADMIN_EDITOR,
      ADMIN_ROLES.USER
    ].includes(role)
  ) {
    throw new Error("Invalid role.");
  }

  return callAdminFunction(
    ADMIN_FUNCTIONS.ASSIGN_ADMIN_ROLE,
    {
      userId,
      role
    }
  );
}

export async function revokeAdminRole(userId) {
  await requireSuperAdmin();

  if (!userId) {
    throw new Error("User ID आवश्यक है।");
  }

  return callAdminFunction(
    ADMIN_FUNCTIONS.REVOKE_ADMIN_ROLE,
    { userId }
  );
}

/*
|--------------------------------------------------------------------------
| DASHBOARD COUNTS
|--------------------------------------------------------------------------
| Counts are based on server-side Firestore queries.
|--------------------------------------------------------------------------
*/

async function getCollectionCount(
  collectionName,
  filters = []
) {
  const constraints = [...filters];

  const countQuery = query(
    collection(db, collectionName),
    ...constraints
  );

  const result = await getCountFromServer(countQuery);

  return result.data().count;
}

export async function getAdminDashboardStatistics() {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.VIEW_DASHBOARD
  });

  const C = ADMIN_CONFIG.COLLECTIONS;

  try {
    const [
      totalUsers,
      totalQuestions,
      publishedQuestions,
      pendingPYQ,
      totalAttempts,
      pendingReports,
      publishedCurrentAffairs
    ] = await Promise.all([
      getCollectionCount(C.USERS),

      getCollectionCount(C.QUESTIONS),

      getCollectionCount(C.QUESTIONS, [
        where("status", "==", "published")
      ]),

      getCollectionCount(C.QUESTIONS, [
        where("verificationStatus", "==", "pending")
      ]),

      getCollectionCount(C.ATTEMPTS),

      getCollectionCount(C.REPORTS, [
        where("status", "==", "pending")
      ]),

      getCollectionCount(C.CURRENT_AFFAIRS, [
        where("status", "==", "published")
      ])
    ]);

    return {
      totalUsers,
      totalQuestions,
      publishedQuestions,
      pendingPYQ,
      totalAttempts,
      pendingReports,
      publishedCurrentAffairs,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error("Admin statistics error:", error);
    throw new Error("Admin Dashboard Statistics लोड नहीं हुए।");
  }
}

/*
|--------------------------------------------------------------------------
| RECENT ADMIN ACTIVITY
|--------------------------------------------------------------------------
*/

export async function getRecentAdminActivity(options = {}) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS
  });

  const pageSize = Math.min(
    Math.max(Number(options.pageSize) || 20, 1),
    ADMIN_CONFIG.MAX_PAGE_SIZE
  );

  const activityQuery = query(
    collection(db, ADMIN_CONFIG.COLLECTIONS.ACTIVITY_LOGS),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  const snapshot = await getDocs(activityQuery);

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

/*
|--------------------------------------------------------------------------
| RECENT AI RESEARCH JOBS
|--------------------------------------------------------------------------
*/

export async function getAdminAIResearchJobs(options = {}) {
  await requireAdmin({
    permission: ADMIN_PERMISSIONS.RUN_AI_RESEARCH
  });

  const pageSize = Math.min(
    Math.max(Number(options.pageSize) || 20, 1),
    ADMIN_CONFIG.MAX_PAGE_SIZE
  );

  const jobsQuery = query(
    collection(db, ADMIN_CONFIG.COLLECTIONS.AI_JOBS),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  const snapshot = await getDocs(jobsQuery);

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

/*
|--------------------------------------------------------------------------
| APP SETTINGS
|--------------------------------------------------------------------------
*/

export async function updateAdminAppSettings(settings) {
  await requireSuperAdmin();

  if (!settings || typeof settings !== "object") {
    throw new Error("Settings आवश्यक हैं।");
  }

  return callAdminFunction(
    ADMIN_FUNCTIONS.UPDATE_APP_SETTINGS,
    { settings }
  );
}

/*
|--------------------------------------------------------------------------
| ADMIN STATE RESET
|--------------------------------------------------------------------------
*/

export function resetAdminState() {
  adminState = {
    initialized: false,
    authenticated: false,
    isAdmin: false,
    role: ADMIN_ROLES.USER,
    permissions: [],
    uid: null,
    email: null,
    displayName: null,
    error: null
  };
}

/*
|--------------------------------------------------------------------------
| ADMIN UTILITIES
|--------------------------------------------------------------------------
*/

export function getAdminRoleName(role, language = "hi") {
  const names = {
    superAdmin: {
      hi: "सुपर एडमिन",
      en: "Super Admin"
    },

    adminEditor: {
      hi: "एडमिन एडिटर",
      en: "Admin Editor"
    },

    user: {
      hi: "सामान्य यूजर",
      en: "Regular User"
    }
  };

  return names[role]?.[
    language === "en" ? "en" : "hi"
  ] || names.user[language === "en" ? "en" : "hi"];
}

export function getAdminPermissionList(role) {
  return [...getPermissionsForRole(role)];
}
