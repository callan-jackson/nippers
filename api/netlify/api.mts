// Netlify Functions (v2) entrypoint: one function serves the whole /api/* surface.
import { dispatch } from "../src/routes";

export default async (request: Request) => dispatch(request, console);

export const config = { path: "/api/*" };
