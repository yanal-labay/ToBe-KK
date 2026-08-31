const express = require("express");
const { requireAuth } = require("../userManagement/auth.middleware");
const { getSummary, markSeen, getStats, setFlag } = require("./activity.controller");

const router = express.Router();

// Every route here is admin-only: the summary counts and the stats feed both
// expose visitor-submitted personal details.
router.get("/summary", requireAuth, getSummary);
router.post("/seen", requireAuth, markSeen);
router.get("/stats", requireAuth, getStats);
router.patch("/flag", requireAuth, setFlag);

module.exports = router;
