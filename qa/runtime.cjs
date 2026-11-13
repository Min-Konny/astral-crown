// A managed runtime can supply Playwright without changing production dependencies.
module.exports = require(process.env.ASTRAL_PLAYWRIGHT || '@playwright/test');
