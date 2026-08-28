import type { ZodType } from "zod";
import type { AwthorRepository, ScopedCollectionRepository, ValueRepository } from "./contract";
import {
  appSettingsSchema,
  bookSchema,
  chapterSchema,
  characterSchema,
  noteSchema,
  onboardingDetailsSchema,
  plotThreadSchema,
  type Theme,
  themeSchema,
} from "./models";

const schemaVersion = 1;
const repositoryPrefix = `awthor:repository:v${schemaVersion}`;

export const themeStorageKey = "awthor-theme";
const legacyProfileStorageKey = "awthor:onboarding:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type StoredEnvelope = {
  schemaVersion: number;
  savedAt: string;
  payload: unknown;
};

export class RepositoryStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RepositoryStorageError";
  }
}

function browserStorage(): StorageLike {
  if (typeof window === "undefined") {
    throw new RepositoryStorageError("The local repository is only available in the browser.");
  }

  return window.localStorage;
}

function envelope(payload: unknown): StoredEnvelope {
  return {
    schemaVersion,
    savedAt: new Date().toISOString(),
    payload,
  };
}

function parseStoredValue<Value>(raw: string, schema: ZodType<Value>, key: string): Value {
  try {
    const parsed: unknown = JSON.parse(raw);
    const candidate =
      parsed && typeof parsed === "object" && "schemaVersion" in parsed && "payload" in parsed
        ? (parsed as StoredEnvelope).payload
        : parsed;
    const result = schema.safeParse(candidate);

    if (!result.success) {
      throw new RepositoryStorageError(`Stored data for ${key} does not match its schema.`, {
        cause: result.error,
      });
    }

    return result.data;
  } catch (error) {
    if (error instanceof RepositoryStorageError) {
      throw error;
    }

    throw new RepositoryStorageError(`Stored data for ${key} could not be read.`, { cause: error });
  }
}

class LocalValueRepository<Value> implements ValueRepository<Value> {
  constructor(
    private readonly key: string,
    private readonly schema: ZodType<Value>,
    private readonly getStorage: () => StorageLike,
    private readonly legacyKey?: string,
  ) {}

  async get(): Promise<Value | null> {
    const storage = this.getStorage();
    const current = storage.getItem(this.key);

    if (current) {
      return parseStoredValue(current, this.schema, this.key);
    }

    if (!this.legacyKey) {
      return null;
    }

    const legacy = storage.getItem(this.legacyKey);
    if (!legacy) {
      return null;
    }

    const migrated = parseStoredValue(legacy, this.schema, this.legacyKey);
    await this.save(migrated);
    storage.removeItem(this.legacyKey);
    return migrated;
  }

  async save(value: Value): Promise<void> {
    const parsed = this.schema.parse(value);
    this.getStorage().setItem(this.key, JSON.stringify(envelope(parsed)));
  }

  async clear(): Promise<void> {
    const storage = this.getStorage();
    storage.removeItem(this.key);
    if (this.legacyKey) {
      storage.removeItem(this.legacyKey);
    }
  }
}

class LocalThemeRepository implements ValueRepository<Theme> {
  constructor(private readonly getStorage: () => StorageLike) {}

  async get(): Promise<Theme | null> {
    const raw = this.getStorage().getItem(themeStorageKey);
    const result = themeSchema.safeParse(raw);
    return result.success ? result.data : null;
  }

  async save(value: Theme): Promise<void> {
    this.getStorage().setItem(themeStorageKey, themeSchema.parse(value));
  }

  async clear(): Promise<void> {
    this.getStorage().removeItem(themeStorageKey);
  }
}

class LocalScopedCollectionRepository<Entity extends { id: string }>
  implements ScopedCollectionRepository<Entity>
{
  constructor(
    private readonly namespace: string,
    private readonly schema: ZodType<Entity[]>,
    private readonly getStorage: () => StorageLike,
  ) {}

  async list(scopeId: string): Promise<Entity[] | null> {
    const key = this.key(scopeId);
    const raw = this.getStorage().getItem(key);
    return raw ? parseStoredValue(raw, this.schema, key) : null;
  }

  async replaceAll(scopeId: string, entities: readonly Entity[]): Promise<void> {
    const parsed = this.schema.parse(entities);
    this.getStorage().setItem(this.key(scopeId), JSON.stringify(envelope(parsed)));
  }

  async clear(scopeId: string): Promise<void> {
    this.getStorage().removeItem(this.key(scopeId));
  }

  private key(scopeId: string) {
    return `${repositoryPrefix}:${this.namespace}:${encodeURIComponent(scopeId)}`;
  }
}

export function createLocalAwthorRepository(
  getStorage: () => StorageLike = browserStorage,
): AwthorRepository {
  return {
    profile: new LocalValueRepository(
      `${repositoryPrefix}:profile`,
      onboardingDetailsSchema,
      getStorage,
      legacyProfileStorageKey,
    ),
    theme: new LocalThemeRepository(getStorage),
    books: new LocalValueRepository(`${repositoryPrefix}:books`, bookSchema.array(), getStorage),
    settings: new LocalValueRepository(
      `${repositoryPrefix}:settings`,
      appSettingsSchema,
      getStorage,
    ),
    chapters: new LocalScopedCollectionRepository("chapters", chapterSchema.array(), getStorage),
    characters: new LocalScopedCollectionRepository(
      "characters",
      characterSchema.array(),
      getStorage,
    ),
    plots: new LocalScopedCollectionRepository("plots", plotThreadSchema.array(), getStorage),
    notes: new LocalScopedCollectionRepository("notes", noteSchema.array(), getStorage),
  };
}
