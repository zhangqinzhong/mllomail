import { getRequestContext } from "@cloudflare/next-on-pages"
import { DrizzleD1Database, SQLiteD1Session } from "drizzle-orm/d1"
import { SQLiteAsyncDialect } from "drizzle-orm/sqlite-core"
import { createTableRelationsHelpers, extractTablesRelationalConfig, type ExtractTablesWithRelations } from "drizzle-orm"
import * as schema from "./schema"

// Schema metadata is immutable. Compute it once per isolate; never retain a
// request's binding, prepared statements, identity or query results globally.
const tables = extractTablesRelationalConfig<ExtractTablesWithRelations<typeof schema>>(schema, createTableRelationsHelpers)
const schemaConfig = { fullSchema:schema, schema:tables.tables, tableNamesMap:tables.tableNamesMap }
const dialect = new SQLiteAsyncDialect()
export const createDb = () => {
  const session = new SQLiteD1Session<typeof schema, ExtractTablesWithRelations<typeof schema>>(getRequestContext().env.DB, dialect, schemaConfig)
  return new DrizzleD1Database<typeof schema>('async', dialect, session, schemaConfig)
}
export type Db = ReturnType<typeof createDb>
