import { useQuery } from "@tanstack/react-query";
import { useHoloAuthSig } from "../context/HoloAuthSig";
import { idServerUrl } from "../constants";
import { IdServerSessionsResponse } from "../types";

/**
 * @param sessionId ID of the id-server session; NOT a Veriff sessionId.
 * @param options 
 */
const useIdServerSessions = (sessionId?: string, options = {}) => {
  const { holoAuthSigDigest } = useHoloAuthSig();

  const queryKey = sessionId
    ? ["idvSessionStatus", sessionId]
    : ["idvSessionStatus"];

  return useQuery<IdServerSessionsResponse>({
    ...options,
    queryKey,
    queryFn: async () => {
      let url = `${idServerUrl}/sessions?sigDigest=${holoAuthSigDigest}`;
      if (sessionId) {
        url += `&id=${sessionId}`;
      }
      const resp = await fetch(url);
      return await resp.json();
    },
    refetchInterval: 5000,
  });
};

export default useIdServerSessions;
