import type { NextRequest } from "next/server";

import { handleTokenLink } from "@/modules/access";

export const GET = (request: NextRequest) => handleTokenLink(request);
