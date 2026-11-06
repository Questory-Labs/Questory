export type DemoRequestContext = {
  exp: number;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
};

export type DemoRoute = {
  method: "GET" | "POST";
  pattern: string;
  respond: (ctx: DemoRequestContext) => unknown;
};
