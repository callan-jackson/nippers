// Side-effect import that registers every route (used by non-Azure entrypoints).
import "./functions/auth";
import "./functions/public";
import "./functions/children";
import "./functions/bookings";
import "./functions/admin";
export { routes, dispatch } from "./lib/router";
