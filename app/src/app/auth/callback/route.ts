import type { NextRequest } from "next/server";

import { handleCodeLink } from "@/modules/access";

export const GET = (request: NextRequest) => handleCodeLink(request);
