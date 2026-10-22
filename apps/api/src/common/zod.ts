import { applyDecorators, Body, Query, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { ApiBody, ApiQuery } from '@nestjs/swagger';
import type { ZodTypeAny, z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

function openApiSchema(schema: ZodTypeAny): Record<string, unknown> {
  // Typed loosely on purpose: zodToJsonSchema's generic signature makes the checker recurse through every schema.
  const json = (zodToJsonSchema as (s: unknown, o: object) => unknown)(schema, {
    target: 'openApi3',
    $refStrategy: 'none',
  }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/** Validated JSON body. Also documents the schema in OpenAPI. */
export function ZodBody<T extends ZodTypeAny>(schema: T) {
  return (target: object, key: string | symbol | undefined, index: number) => {
    Body({ transform: (value: unknown) => schema.parse(value ?? {}) })(target, key as string, index);
    if (key)
      applyDecorators(ApiBody({ schema: openApiSchema(schema) }))(
        target,
        key,
        Object.getOwnPropertyDescriptor(target, key)!,
      );
  };
}

/** Validated query string. */
export function ZodQuery<T extends ZodTypeAny>(schema: T) {
  return (target: object, key: string | symbol | undefined, index: number) => {
    Query({ transform: (value: unknown) => schema.parse(value ?? {}) })(target, key as string, index);
    const json = openApiSchema(schema) as { properties?: Record<string, unknown>; required?: string[] };
    if (key && json.properties) {
      for (const [name, prop] of Object.entries(json.properties)) {
        applyDecorators(
          ApiQuery({ name, required: json.required?.includes(name) ?? false, schema: prop as object }),
        )(target, key, Object.getOwnPropertyDescriptor(target, key)!);
      }
    }
  };
}

export type Infer<T extends ZodTypeAny> = z.infer<T>;

/** Raw access to a request property (used by guards that attach context). */
export const ReqProp = createParamDecorator((prop: string, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req[prop];
});
