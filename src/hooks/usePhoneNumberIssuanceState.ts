import { useState, useMemo, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { zkPhoneEndpoint } from "../constants";
import usePhoneServerSessions from "./usePhoneServerSessions";

const steps = ["Pay", "Phone#", "Verify", "Finalize"];

function usePhoneNumberIssuanceState() {
  const { store } = useParams();
  const [searchParams] = useSearchParams();
  const sid = searchParams.get("sid");
  const [success, setSuccess] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>();
  const [code, setCode] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);

  const {
    data: phoneServerSessions,
    isLoading: phoneServerSessionsIsLoading,
    refetch: refetchPhoneServerSessions
  } = usePhoneServerSessions(sid ?? undefined);

  const currentStep = useMemo(() => {
    if (sid && (phoneServerSessions?.[0]?.sessionStatus?.S === "NEEDS_PAYMENT")) return "Pay";
    if (!phoneNumber && !store) return "Phone#";
    if (phoneNumber && !store) return "Verify";
    else return "Finalize";
  }, [phoneNumber, store]);

  useEffect(() => {
    setCurrentIdx(steps.indexOf(currentStep));
  }, [currentStep]);

  const {
    data: paymentResponse,
    isLoading: paymentSubmissionIsLoading,
    isError: paymentSubmissionIsError,
    mutate: submitPhonePayment
  } = useMutation(
    async (data: { chainId?: number, txHash?: string }) => {
      if (!sid) throw new Error("No session ID");
      if (!data?.chainId) throw new Error("No chain ID");
      if (!data?.txHash) throw new Error("No transaction hash");

      const resp = await fetch(`${zkPhoneEndpoint}/sessions/${sid}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: sid,
          chainId: data.chainId,
          txHash: data.txHash,
        }),
      })
      return resp.json()
    },
    {
      onSuccess: () => {
        refetchPhoneServerSessions();
      }
    }
  )

  return {
    success,
    setSuccess,
    currentIdx,
    setCurrentIdx,
    steps,
    currentStep,
    phoneNumber,
    setPhoneNumber,
    code,
    setCode,
    paymentResponse,
    paymentSubmissionIsLoading,
    paymentSubmissionIsError,
    submitPhonePayment,
  };
}

export default usePhoneNumberIssuanceState;