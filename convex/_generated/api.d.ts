/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as automation from "../automation.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_hmac from "../lib/hmac.js";
import type * as lib_loanStatus from "../lib/loanStatus.js";
import type * as lib_outbox from "../lib/outbox.js";
import type * as lib_retry from "../lib/retry.js";
import type * as lib_toolInput from "../lib/toolInput.js";
import type * as lib_validators from "../lib/validators.js";
import type * as loans from "../loans.js";
import type * as tools from "../tools.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  automation: typeof automation;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/constants": typeof lib_constants;
  "lib/dates": typeof lib_dates;
  "lib/errors": typeof lib_errors;
  "lib/hmac": typeof lib_hmac;
  "lib/loanStatus": typeof lib_loanStatus;
  "lib/outbox": typeof lib_outbox;
  "lib/retry": typeof lib_retry;
  "lib/toolInput": typeof lib_toolInput;
  "lib/validators": typeof lib_validators;
  loans: typeof loans;
  tools: typeof tools;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
