import { json, methodNotAllowed } from "../lib/http";

const templates = [
  {
    id: "support-agent",
    name: "Support Agent",
    description: "Answer support requests from docs and knowledge base"
  },
  {
    id: "research-agent",
    name: "Research Agent",
    description: "Summarize market and product signals"
  },
  {
    id: "ops-agent",
    name: "Ops Agent",
    description: "Automate recurring operational workflows"
  }
];

export async function handleTemplates(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed("GET");
  }

  return json({ templates });
}
