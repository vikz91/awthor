import { describe, expect, test } from "bun:test";
import {
  createWebMcpRegistrationSession,
  getWebMcpModelContext,
  type WebMcpModelContext,
  type WebMcpRegisterToolOptions,
  type WebMcpToolDefinition,
} from "./runtime";

function createTool(name: string): WebMcpToolDefinition {
  return {
    name,
    description: `Run ${name}.`,
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    execute: async () => ({ ok: true }),
  };
}

class FakeModelContext implements WebMcpModelContext {
  readonly activeTools = new Map<string, WebMcpToolDefinition>();
  readonly calls: Array<{
    tool: WebMcpToolDefinition;
    options: WebMcpRegisterToolOptions | undefined;
  }> = [];

  constructor(private readonly failingToolName?: string) {}

  async registerTool(tool: WebMcpToolDefinition, options?: WebMcpRegisterToolOptions) {
    this.calls.push({ tool, options });

    if (tool.name === this.failingToolName) {
      throw new Error(`Could not register ${tool.name}`);
    }
    if (this.activeTools.has(tool.name)) {
      throw new Error(`Already registered ${tool.name}`);
    }

    this.activeTools.set(tool.name, tool);
    options?.signal?.addEventListener(
      "abort",
      () => {
        this.activeTools.delete(tool.name);
      },
      { once: true },
    );
  }
}

describe("WebMCP runtime", () => {
  test("detects unsupported documents without requiring native WebMCP", () => {
    expect(getWebMcpModelContext(undefined)).toBeNull();
    expect(getWebMcpModelContext({})).toBeNull();
    expect(getWebMcpModelContext({ modelContext: {} })).toBeNull();
    expect(getWebMcpModelContext({ modelContext: { registerTool: "unsupported" } })).toBeNull();

    const modelContext = new FakeModelContext();
    expect(getWebMcpModelContext({ modelContext })).toBe(modelContext);
  });

  test("registers unique tools with one shared lifecycle signal", async () => {
    const modelContext = new FakeModelContext();
    const session = createWebMcpRegistrationSession(modelContext, [
      createTool("list_books"),
      createTool("create_book"),
      createTool("open_book"),
    ]);

    await session.ready;

    expect(modelContext.calls.map(({ tool }) => tool.name)).toEqual([
      "list_books",
      "create_book",
      "open_book",
    ]);
    expect(new Set(modelContext.calls.map(({ tool }) => tool.name)).size).toBe(3);
    expect(modelContext.calls.every(({ options }) => options?.signal === session.signal)).toBe(
      true,
    );
    expect(session.signal.aborted).toBe(false);
  });

  test("supplies a lifecycle signal when the host omits execution options or its signal", async () => {
    const modelContext = new FakeModelContext();
    const receivedSignals: AbortSignal[] = [];
    const tool: WebMcpToolDefinition = {
      ...createTool("list_books"),
      execute: async (_input, options) => {
        receivedSignals.push(options.signal);
        return { ok: true };
      },
    };
    const session = createWebMcpRegistrationSession(modelContext, [tool]);

    await session.ready;
    const registeredTool = modelContext.activeTools.get("list_books");
    expect(registeredTool).toBeDefined();

    await registeredTool?.execute({}, undefined as never);

    expect(receivedSignals[0]).toBe(session.signal);
    expect(receivedSignals[0]?.aborted).toBe(false);

    await registeredTool?.execute({}, {} as never);

    expect(receivedSignals[1]).toBe(session.signal);
    expect(receivedSignals[1]?.aborted).toBe(false);
  });

  test("rejects duplicate tool names before registering anything", async () => {
    const modelContext = new FakeModelContext();
    const session = createWebMcpRegistrationSession(modelContext, [
      createTool("create_chapter"),
      createTool("create_chapter"),
    ]);

    await expect(session.ready).rejects.toThrow("Duplicate WebMCP tool name: create_chapter");
    expect(modelContext.calls).toHaveLength(0);
    expect(session.signal.aborted).toBe(true);
  });

  test("disposing a session unregisters every tool and is idempotent", async () => {
    const modelContext = new FakeModelContext();
    const session = createWebMcpRegistrationSession(modelContext, [
      createTool("go_home"),
      createTool("go_to_library"),
    ]);

    await session.ready;
    expect(modelContext.activeTools.size).toBe(2);

    session.dispose();
    session.dispose();

    expect(session.signal.aborted).toBe(true);
    expect(modelContext.activeTools.size).toBe(0);
  });

  test("rolls back successful registrations when one registration fails", async () => {
    const modelContext = new FakeModelContext("broken_tool");
    const session = createWebMcpRegistrationSession(modelContext, [
      createTool("first_tool"),
      createTool("broken_tool"),
      createTool("last_tool"),
    ]);

    await expect(session.ready).rejects.toThrow("Could not register broken_tool");

    expect(modelContext.calls).toHaveLength(3);
    expect(session.signal.aborted).toBe(true);
    expect(modelContext.activeTools.size).toBe(0);
  });
});
