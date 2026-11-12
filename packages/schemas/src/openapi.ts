// Builds the OpenAPI 3.1 document from the contracts (brief section 5.1). OpenAPI 3.1
// uses JSON Schema 2020-12, which Zod produces itself, so no extra package is needed.
import { z } from "zod"

import {
  IDEMPOTENCY_KEY_HEADER,
  isWrite,
  problemDetailsSchema,
  SCHOOL_HEADER,
  type Contract,
} from "./api"

type JsonSchema = Record<string, unknown>

const toSchema = (schema: z.ZodType, io: "input" | "output"): JsonSchema => {
  const json = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io,
    unrepresentable: "any",
  })
  delete json.$schema
  return json
}

const isOptional = (schema: z.ZodType): boolean =>
  schema.safeParse(undefined).success

const pathParameterNames = (path: string): string[] =>
  [...path.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1] ?? "")

function operation(name: string, contract: Contract): JsonSchema {
  const pathNames = pathParameterNames(contract.path)
  const parameters: JsonSchema[] = pathNames.map((paramName) => ({
    name: paramName,
    in: "path",
    required: true,
    schema: toSchema(contract.input.shape[paramName] as z.ZodType, "input"),
  }))

  let requestBody: JsonSchema | undefined
  if (contract.method === "GET") {
    for (const [field, schema] of Object.entries(contract.input.shape)) {
      if (pathNames.includes(field)) continue
      parameters.push({
        name: field,
        in: "query",
        required: !isOptional(schema as z.ZodType),
        schema: toSchema(schema as z.ZodType, "input"),
      })
    }
  } else {
    requestBody = {
      required: true,
      content: {
        "application/json": { schema: toSchema(contract.input, "input") },
      },
    }
  }

  if (contract.public !== true) {
    parameters.push({
      name: SCHOOL_HEADER,
      in: "header",
      required: false,
      description:
        "The school this request is for. Checked against the caller's memberships.",
      schema: { type: "string", format: "uuid" },
    })
  }
  if (isWrite(contract.method)) {
    parameters.push({
      name: IDEMPOTENCY_KEY_HEADER,
      in: "header",
      required: true,
      description:
        "A random key made by the client. Resending the same key returns the first response instead of repeating the write.",
      schema: { type: "string", pattern: "^[A-Za-z0-9_-]{8,128}$" },
    })
  }

  return {
    operationId: name,
    summary: contract.summary,
    ...(contract.public === true
      ? { security: [] }
      : { "x-akoso-permission": contract.permission }),
    "x-akoso-rate-limit": contract.rateLimit,
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(requestBody ? { requestBody } : {}),
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": { schema: toSchema(contract.output, "output") },
        },
      },
      default: { $ref: "#/components/responses/Problem" },
    },
  }
}

/**
 * The OpenAPI 3.1 document for a set of contracts.
 *
 * @param contracts Contracts by name; the name becomes the operation ID and the
 *   typed client's method name.
 */
export function buildOpenApi(
  contracts: Record<string, Contract>,
  info: { title: string; version: string }
): JsonSchema {
  const paths: Record<string, Record<string, JsonSchema>> = {}
  for (const [name, contract] of Object.entries(contracts).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const methods = (paths[contract.path] ??= {})
    methods[contract.method.toLowerCase()] = operation(name, contract)
  }

  return {
    openapi: "3.1.0",
    info,
    servers: [{ url: "/" }],
    // The mobile app signs in with a bearer token. The web app's own cookie is added
    // here by the sign-in slice (Stage 1, item 5), which names it.
    security: [{ bearer: [] }],
    paths,
    components: {
      securitySchemes: {
        bearer: { type: "http", scheme: "bearer" },
      },
      schemas: { Problem: toSchema(problemDetailsSchema, "output") },
      responses: {
        Problem: {
          description: "An error, in Problem Details form (RFC 9457).",
          content: {
            "application/problem+json": {
              schema: { $ref: "#/components/schemas/Problem" },
            },
          },
        },
      },
    },
  }
}
