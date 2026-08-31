import { describe, expect, test } from "bun:test";
import { resolveMongoConfiguration } from "./config";

describe("optional MongoDB configuration", () => {
  test("keeps sync storage disabled without a connection string", () => {
    expect(resolveMongoConfiguration({})).toEqual({
      databaseName: "awthor",
      enabled: false,
      uri: null,
    });
  });

  test("enables sync storage only when an explicit URI is supplied", () => {
    expect(
      resolveMongoConfiguration({
        MONGODB_DB: "awthor-sync",
        MONGODB_URI: " mongodb+srv://example.mongodb.net ",
      }),
    ).toEqual({
      databaseName: "awthor-sync",
      enabled: true,
      uri: "mongodb+srv://example.mongodb.net",
    });
  });
});
