import { handleAssistantRequest } from "@/modules/assistant";

// Ο Βοηθός (A9): μία ερώτηση → ροή απάντησης (NDJSON). Όλη η λογική ζει στο module assistant.
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  return handleAssistantRequest(request);
}
