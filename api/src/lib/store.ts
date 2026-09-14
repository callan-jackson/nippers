// Storage abstraction. Production uses Cosmos DB (free tier); local dev and
// tests use a JSON-file store so the whole site runs with zero cloud setup.
// Queries are expressed with a small filter DSL that compiles to parameterised
// Cosmos SQL or is evaluated in-process.

import { CosmosClient, Container, Database } from "@azure/cosmos";
import { promises as fs } from "node:fs";
import path from "node:path";

export type ContainerName = "users" | "children" | "bookings" | "content" | "messages" | "tokens";

// Partition key per container. Everything is keyed so the common access paths
// (parent → their children/bookings, content by type) stay single-partition.
export const PARTITION_KEYS: Record<ContainerName, string> = {
  users: "/id",
  children: "/parentId",
  bookings: "/parentId",
  content: "/type",
  messages: "/id",
  tokens: "/id",
};

export type Op = "=" | "!=" | ">=" | "<=" | ">" | "<" | "in";
export interface Where {
  field: string;
  op: Op;
  value: unknown;
}
export interface Query {
  where?: Where[];
  orderBy?: { field: string; desc?: boolean };
  limit?: number;
}

export interface Store {
  get<T extends object>(c: ContainerName, id: string, pk: string): Promise<T | null>;
  upsert<T extends { id: string }>(c: ContainerName, doc: T): Promise<T>;
  delete(c: ContainerName, id: string, pk: string): Promise<void>;
  query<T extends object>(c: ContainerName, q: Query): Promise<T[]>;
  count(c: ContainerName, q: Query): Promise<number>;
}

const FIELD_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
function assertField(f: string) {
  if (!FIELD_RE.test(f)) throw new Error(`Invalid field name: ${f}`);
}

// ---------------------------------------------------------------------------
// Cosmos DB
// ---------------------------------------------------------------------------
export class CosmosStore implements Store {
  private client: CosmosClient;
  private db: Database;
  private containers = new Map<ContainerName, Container>();
  private ready: Promise<void>;

  constructor(connectionString: string, databaseId: string) {
    this.client = new CosmosClient(connectionString);
    this.db = this.client.database(databaseId);
    this.ready = this.init(databaseId);
  }

  private async init(databaseId: string) {
    // Shared database throughput keeps everything inside the 1000 RU/s free tier.
    await this.client.databases.createIfNotExists({ id: databaseId, throughput: 1000 });
    for (const [name, pk] of Object.entries(PARTITION_KEYS) as [ContainerName, string][]) {
      const opts: Record<string, unknown> = { id: name, partitionKey: { paths: [pk] } };
      if (name === "tokens") opts.defaultTtl = 60 * 60 * 24; // reset tokens expire automatically
      const { container } = await this.db.containers.createIfNotExists(opts as never);
      this.containers.set(name, container);
    }
  }

  private async c(name: ContainerName): Promise<Container> {
    await this.ready;
    return this.containers.get(name)!;
  }

  async get<T extends object>(c: ContainerName, id: string, pk: string): Promise<T | null> {
    const { resource } = await (await this.c(c)).item(id, pk).read<T>();
    return resource ? strip(resource) : null;
  }

  async upsert<T extends { id: string }>(c: ContainerName, doc: T): Promise<T> {
    const { resource } = await (await this.c(c)).items.upsert<T>(doc);
    return strip(resource as T);
  }

  async delete(c: ContainerName, id: string, pk: string): Promise<void> {
    try {
      await (await this.c(c)).item(id, pk).delete();
    } catch (e: any) {
      if (e?.code !== 404) throw e;
    }
  }

  private compile(q: Query, select = "*") {
    const params: { name: string; value: any }[] = [];
    const clauses: string[] = [];
    (q.where ?? []).forEach((w, i) => {
      assertField(w.field);
      const p = `@p${i}`;
      if (w.op === "in") {
        clauses.push(`ARRAY_CONTAINS(${p}, c.${w.field})`);
      } else {
        clauses.push(`c.${w.field} ${w.op} ${p}`);
      }
      params.push({ name: p, value: w.value });
    });
    let sql = `SELECT ${select} FROM c`;
    if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
    if (q.orderBy && select === "*") {
      assertField(q.orderBy.field);
      sql += ` ORDER BY c.${q.orderBy.field} ${q.orderBy.desc ? "DESC" : "ASC"}`;
    }
    if (q.limit && select === "*") sql = sql.replace("SELECT *", `SELECT TOP ${Math.floor(q.limit)} *`);
    return { query: sql, parameters: params };
  }

  async query<T extends object>(c: ContainerName, q: Query): Promise<T[]> {
    const { resources } = await (await this.c(c)).items.query<T>(this.compile(q)).fetchAll();
    return resources.map(strip);
  }

  async count(c: ContainerName, q: Query): Promise<number> {
    const { resources } = await (await this.c(c)).items
      .query<number>(this.compile(q, "VALUE COUNT(1)"))
      .fetchAll();
    return resources[0] ?? 0;
  }
}

function strip<T extends object>(doc: T): T {
  const { _rid, _self, _etag, _attachments, _ts, ...rest } = doc as any;
  return rest as T;
}

// ---------------------------------------------------------------------------
// File store (dev / tests / Docker without Cosmos)
// ---------------------------------------------------------------------------
export class FileStore implements Store {
  private data = new Map<ContainerName, Map<string, any>>();
  private loaded: Promise<void>;
  private writing: Promise<void> = Promise.resolve();

  constructor(private dir: string | null) {
    this.loaded = this.load();
  }

  private async load() {
    for (const name of Object.keys(PARTITION_KEYS) as ContainerName[]) {
      const m = new Map<string, any>();
      if (this.dir) {
        try {
          const raw = await fs.readFile(path.join(this.dir, `${name}.json`), "utf8");
          for (const doc of JSON.parse(raw) as any[]) m.set(doc.id, doc);
        } catch {
          /* first run */
        }
      }
      this.data.set(name, m);
    }
  }

  private persist(name: ContainerName) {
    if (!this.dir) return;
    const dir = this.dir;
    this.writing = this.writing.then(async () => {
      await fs.mkdir(dir, { recursive: true });
      const docs = [...this.data.get(name)!.values()];
      await fs.writeFile(path.join(dir, `${name}.json`), JSON.stringify(docs, null, 2));
    });
  }

  async flush() {
    await this.writing;
  }

  private async m(name: ContainerName) {
    await this.loaded;
    return this.data.get(name)!;
  }

  async get<T extends object>(c: ContainerName, id: string, _pk: string): Promise<T | null> {
    const doc = (await this.m(c)).get(id);
    return doc ? structuredClone(doc) : null;
  }

  async upsert<T extends { id: string }>(c: ContainerName, doc: T): Promise<T> {
    (await this.m(c)).set(doc.id, structuredClone(doc));
    this.persist(c);
    return structuredClone(doc);
  }

  async delete(c: ContainerName, id: string): Promise<void> {
    (await this.m(c)).delete(id);
    this.persist(c);
  }

  async query<T extends object>(c: ContainerName, q: Query): Promise<T[]> {
    let docs = [...(await this.m(c)).values()].filter((d) => matches(d, q.where ?? []));
    if (q.orderBy) {
      const { field, desc } = q.orderBy;
      docs.sort((a, b) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0) * (desc ? -1 : 1));
    }
    if (q.limit) docs = docs.slice(0, q.limit);
    return docs.map((d) => structuredClone(d));
  }

  async count(c: ContainerName, q: Query): Promise<number> {
    return (await this.query(c, { where: q.where })).length;
  }
}

function matches(doc: any, where: Where[]): boolean {
  return where.every((w) => {
    const v = doc[w.field];
    switch (w.op) {
      case "=":
        return v === w.value;
      case "!=":
        return v !== w.value;
      case ">=":
        return v >= (w.value as any);
      case "<=":
        return v <= (w.value as any);
      case ">":
        return v > (w.value as any);
      case "<":
        return v < (w.value as any);
      case "in":
        return (w.value as unknown[]).includes(v);
    }
  });
}

// ---------------------------------------------------------------------------
let instance: Store | null = null;
export function getStore(): Store {
  if (instance) return instance;
  const mode = process.env.STORE ?? (process.env.COSMOS_CONNECTION_STRING ? "cosmos" : "file");
  if (mode === "cosmos") {
    const cs = process.env.COSMOS_CONNECTION_STRING;
    if (!cs) throw new Error("COSMOS_CONNECTION_STRING is not set");
    instance = new CosmosStore(cs, process.env.COSMOS_DATABASE ?? "nippers");
  } else if (mode === "memory") {
    instance = new FileStore(null);
  } else {
    instance = new FileStore(process.env.DATA_DIR ?? path.join(process.cwd(), ".data"));
  }
  return instance;
}

export function setStore(s: Store | null) {
  instance = s;
}
