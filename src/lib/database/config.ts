export type MongoConfiguration = {
  databaseName: string;
  enabled: boolean;
  uri: string | null;
};

type Environment = Record<string, string | undefined>;

/**
 * Sync infrastructure stays opt-in during the local-first transition. This
 * config intentionally exposes no database credentials to client code.
 */
export function resolveMongoConfiguration(environment: Environment): MongoConfiguration {
  const uri = environment.MONGODB_URI?.trim() || null;
  const databaseName = environment.MONGODB_DB?.trim() || "awthor";

  return {
    databaseName,
    enabled: Boolean(uri),
    uri,
  };
}

export const mongoConfiguration = resolveMongoConfiguration(process.env);
