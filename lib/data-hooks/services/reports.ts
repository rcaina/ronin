import type { ReportsRequestQuery, ReportsResponse } from "@/lib/types/reports";
import { parseErrorResponse } from "./http";

export const getReports = async (
  query: ReportsRequestQuery = {},
): Promise<ReportsResponse> => {
  const params = new URLSearchParams();
  if (query.range) params.set("range", query.range);
  if (query.compare) params.set("compare", "true");

  const queryString = params.toString();
  const response = await fetch(
    `/api/reports${queryString ? `?${queryString}` : ""}`,
  );
  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<ReportsResponse>;
};
