export type JsonPrimitive = boolean | null | number | string;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonSchema = { [key: string]: JsonValue };

export type WebMcpToolAnnotations = {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
};

export type WebMcpToolExecutionOptions = {
  signal: AbortSignal;
};

export type SiteToolDefinition = {
  name: string;
  title?: string;
  description: string;
  inputSchema?: JsonSchema;
  annotations?: WebMcpToolAnnotations;
  execute: (
    input: Record<string, unknown>,
    options: WebMcpToolExecutionOptions,
  ) => Promise<JsonValue>;
};

export type WebMcpToolDefinition = SiteToolDefinition;

export type WebMcpRegisterToolOptions = {
  exposedTo?: string[];
  signal?: AbortSignal;
};

export type WebMcpModelContext = {
  registerTool: (tool: SiteToolDefinition, options?: WebMcpRegisterToolOptions) => Promise<void>;
};

export type WebMcpRegistrationSession = {
  ready: Promise<void>;
  signal: AbortSignal;
  dispose: () => void;
};

type DocumentWithOptionalModelContext = {
  modelContext?: unknown;
};

export function getWebMcpModelContext(documentLike: unknown): WebMcpModelContext | null {
  if (!documentLike || typeof documentLike !== "object") {
    return null;
  }

  const modelContext = (documentLike as DocumentWithOptionalModelContext).modelContext;
  if (
    !modelContext ||
    typeof modelContext !== "object" ||
    typeof (modelContext as Partial<WebMcpModelContext>).registerTool !== "function"
  ) {
    return null;
  }

  return modelContext as WebMcpModelContext;
}

export function createWebMcpRegistrationSession(
  modelContext: WebMcpModelContext,
  tools: readonly SiteToolDefinition[],
): WebMcpRegistrationSession {
  const controller = new AbortController();

  const ready = (async () => {
    try {
      assertUniqueToolNames(tools);
      await Promise.all(
        tools.map((tool) =>
          modelContext.registerTool(withExecutionOptionsFallback(tool, controller.signal), {
            signal: controller.signal,
          }),
        ),
      );
    } catch (cause) {
      if (!controller.signal.aborted) {
        controller.abort(cause);
      }
      throw cause;
    }
  })();

  return {
    ready,
    signal: controller.signal,
    dispose() {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    },
  };
}

/**
 * ChatGPT's current Site Tools host may omit the execution options or provide
 * an options object without a signal. Keep cancellation available by falling
 * back to the registration session's lifecycle signal in either case.
 */
function withExecutionOptionsFallback(
  tool: SiteToolDefinition,
  fallbackSignal: AbortSignal,
): SiteToolDefinition {
  return {
    ...tool,
    execute: (input, options) => tool.execute(input, { signal: options?.signal ?? fallbackSignal }),
  };
}

function assertUniqueToolNames(tools: readonly SiteToolDefinition[]) {
  const names = new Set<string>();

  for (const tool of tools) {
    if (names.has(tool.name)) {
      throw new Error(`Duplicate WebMCP tool name: ${tool.name}`);
    }
    names.add(tool.name);
  }
}
