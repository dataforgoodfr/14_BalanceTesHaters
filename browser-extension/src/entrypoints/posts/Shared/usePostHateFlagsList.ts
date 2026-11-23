import { useMemo } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  getPostHateFlagsList,
  type PostHateFlags,
} from "@/shared/storage/hate-flags-storage";

export function usePostHateFlagsList(
  postIdList: string[],
  enabled = true,
): UseQueryResult<PostHateFlags[], Error> {
  const queryKey = useMemo(
    () => ["postHateFlags", postIdList.join(",")],
    [postIdList],
  );

  return useQuery({
    queryKey,
    queryFn: () => getPostHateFlagsList(postIdList),
    enabled,
  });
}
