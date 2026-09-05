// One place that knows how to open Chromium: the Playwright-managed browser (CI, a fresh
// checkout after `npx playwright install chromium`), or a path from CHROMIUM_PATH, or the
// sandbox's preinstalled build when it is there.
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
const SANDBOX = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(SANDBOX) ? SANDBOX : undefined);
export { chromium };
export function launch(opts = {}) { return chromium.launch({ executablePath, ...opts }); }
