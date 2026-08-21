const mongoose = require("mongoose");

/**
 * An admin-added, calendar-only entry on the /schedule page — a title plus
 * a date range, with no link to any Event or Scholarship. These are the
 * only records this module actually stores; Event/Scholarship dates are
 * read live from their own collections (see schedule.controller.js) rather
 * than duplicated here.
 *
 * `category` is required: every manual entry must be categorized (see
 * ScheduleCategory) before it can be created, since its category is what
 * determines the entry's pill color on the calendar.
 */
const ScheduleEntrySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "ScheduleCategory", required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ScheduleEntry", ScheduleEntrySchema);
