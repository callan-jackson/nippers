// Postgres implementation of the Store interface (used with Neon's free tier
// on Netlify, or any Postgres). Every container is a row set in one table with
// the document held as JSONB; the query DSL compiles to jsonb operators so
// numbers and strings compare correctly.
import { Pool } from "pg";
import type { Store, ContainerName, Query, Where } from "./store";

const FIELD_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const OPS: Record<Where["op"], string> = { "=": "=", "!=": "<>", ">=": ">=", "<=": "<=", ">": ">", "<": "<", in: "in" };

export function compile(container: string, q: Query, mode: "select" | "count" = "select"): { text: string; values: unknown[] } {
  const values: unknown[] = [container];
  const clauses: string[] = [];
  for (const w of q.where ?? []) {
    if (!FIELD_RE.test(w.field)) throw new Error(`Invalid field name: ${w.field}`);
    values.push(JSON.stringify(w.value));
    const p = `$${values.length}::jsonb`;
    if (w.op === "in") clauses.push(`${p} @> (doc->'${w.field}')`);
    else if (w.op === "!=") clauses.push(`(doc->'${w.field}') IS DISTINCT FROM ${p}`);
    else clauses.push(`(doc->'${w.field}') ${OPS[w.op]} ${p}`);
  }
  let text = mode === "count" ? "SELECT count(*)::int AS n FROM docs" : "SELECT doc FROM docs";
  text += " WHERE container = $1";
  if (clauses.length) text += " AND " + clauses.join(" AND ");
  if (mode === "select" && q.orderBy) {
    if (!FIELD_RE.test(q.orderBy.field)) throw new Error(`Invalid field name: ${q.orderBy.field}`);
    text += ` ORDER BY doc->'${q.orderBy.field}' ${q.orderBy.desc ? "DESC" : "ASC"}`;
  }
  if (mode === "select" && q.limit) text += ` LIMIT ${Math.floor(q.limit)}`;
  return { text, values };
}

export class PostgresStore implements Store {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 3, ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false } });
    this.ready = this.migrate();
  }

  // Serialised with an advisory lock: concurrent cold starts would otherwise race
  // on CREATE TABLE IF NOT EXISTS and one of them would fail.
  private async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(7219733)");
      await client.query(`CREATE TABLE IF NOT EXISTS docs (
        container text NOT NULL,
        id text NOT NULL,
        pk text NOT NULL,
        doc jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (container, id)
      )`);
      await client.query("CREATE INDEX IF NOT EXISTS docs_pk ON docs (container, pk)");
      await client.query("CREATE INDEX IF NOT EXISTS docs_doc ON docs USING gin (doc jsonb_path_ops)");
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }

  private async run(q: { text: string; values: unknown[] }) {
    await this.ready;
    return this.pool.query(q.text, q.values);
  }

  async get<T extends object>(c: ContainerName, id: string): Promise<T | null> {
    await this.ready;
    const r = await this.pool.query("SELECT doc FROM docs WHERE container = $1 AND id = $2", [c, id]);
    return (r.rows[0]?.doc as T) ?? null;
  }

  async upsert<T extends { id: string }>(c: ContainerName, doc: T): Promise<T> {
    await this.ready;
    const pkField = PK[c];
    const pk = String((doc as Record<string, unknown>)[pkField] ?? doc.id);
    await this.pool.query(
      `INSERT INTO docs (container, id, pk, doc) VALUES ($1, $2, $3, $4)
       ON CONFLICT (container, id) DO UPDATE SET doc = EXCLUDED.doc, pk = EXCLUDED.pk, updated_at = now()`,
      [c, doc.id, pk, JSON.stringify(doc)],
    );
    return doc;
  }

  async delete(c: ContainerName, id: string): Promise<void> {
    await this.ready;
    await this.pool.query("DELETE FROM docs WHERE container = $1 AND id = $2", [c, id]);
  }

  async query<T extends object>(c: ContainerName, q: Query): Promise<T[]> {
    const r = await this.run(compile(c, q));
    return r.rows.map((row) => row.doc as T);
  }

  async count(c: ContainerName, q: Query): Promise<number> {
    const r = await this.run(compile(c, q, "count"));
    return r.rows[0]?.n ?? 0;
  }
}

const PK: Record<ContainerName, string> = { users: "id", children: "parentId", bookings: "parentId", content: "type", messages: "id", tokens: "id" };
