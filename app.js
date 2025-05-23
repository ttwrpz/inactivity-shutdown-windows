/* ================================ */
/*   WINDOWS INACTIVITY SHUTDOWN    */
/* ================================ */

export const SETTINGS_VERSION = '5.0.0';

/* ================================ */
/*          PACKAGES IMPORT         */
/* ================================ */
import InactivityShutdownApp from "./src/core/MainApplication.js";
import colors from "@colors/colors";

/* ================================ */
/*       APPLICATION STARTUP       */
/* ================================ */

const app = new InactivityShutdownApp();
app.start().catch(error => {
    console.error(colors.red(`Fatal error: ${error.message}`));
    console.error(colors.gray(error.stack));
    process.exit(1);
});