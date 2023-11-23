import React, { useCallback, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { parsePhoneNumber } from "react-phone-number-input";
import { useMutation } from "@tanstack/react-query";
// import "react-phone-number-input/style.css";
import "../../../react-phone-number-input.css";
import PhoneNumberForm from "../../atoms/PhoneNumberForm";
import { sendCode } from "../../../utils/phone";
import { zkPhoneEndpoint } from "../../../constants";
import FinalStep from "../FinalStep/FinalStep";
import StepSuccess from "../StepSuccess";
import IssuanceContainer from "../IssuanceContainer";
import usePhoneNumberIssuanceState from "../../../hooks/usePhoneNumberIssuanceState";
import PhonePayment from "./PhonePayment";
import { datadogLogs } from "@datadog/browser-logs";

// Add to this when a new issuer is added
// const allowedCredTypes = ["idgov", "phone"];

const StepSuccessWithAnalytics = () => {
  useEffect(() => {
    try {
      datadogLogs.logger.info("SuccPhone", {});
      // @ts-ignore
      window.fathom.trackGoal("MAFS4E70", -0.2); //Fix cost
    } catch (err) {
      console.log(err);
    }
  }, []);
  return <StepSuccess />;
};

const VerifyPhoneNumber = () => {
  useEffect(() => {
    try {
      datadogLogs.logger.info("StartPhone", {});
      // @ts-ignore
      window.fathom.trackGoal("FVI98FRD", 0);
    } catch (err) {
      console.log(err);
    }
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sid = searchParams.get("sid");

  const {
    success,
    setSuccess,
    currentIdx,
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
  } = usePhoneNumberIssuanceState();

  useEffect(() => {
    if (success && window.localStorage.getItem("register-credentialType")) {
      navigate(
        `/register?credentialType=${window.localStorage.getItem(
          "register-credentialType"
        )}&proofType=${window.localStorage.getItem(
          "register-proofType"
        )}&callback=${window.localStorage.getItem("register-callback")}`
      );
    }
  }, [success, navigate]);

  const { mutate: mutateSendCode } = useMutation(
    async ({ phoneNumber, sid }: { phoneNumber: string, sid: string}) => {
      await sendCode(phoneNumber, sid)
    }, 
    {
      onError: (err) => {
        console.log('sendCode err', err)

        if (((err as any)?.response?.data ?? '').includes('Session has reached max attempts')) {
          alert('Error: You have reached the maximum allowed attempts')
          navigate('/issuance/phone')
        }
      }
    }
  )

  const [sentCodeAt, setSentCodeAt] = React.useState<number>(0);

  const setNumberAndSendCode = useCallback((phoneNumber: string | undefined) => {
    if (!phoneNumber) {
      alert("Error: No phone number");
      return;
    }
    if (!sid) {
      alert("Error: No session ID");
      return;
    }

    // The user can send at most one code every 30 seconds
    const remainingSeconds = (30 - (Date.now() - (sentCodeAt))) / 1000;
    if (sentCodeAt && remainingSeconds > 0) {
      alert(`Please wait ${remainingSeconds} seconds before sending another code`);
      return;
    }

    datadogLogs.logger.info("SendPhoneCode", {});

    setPhoneNumber(phoneNumber);
    mutateSendCode({ phoneNumber, sid })
    setSentCodeAt(Date.now());
  }, [sid, sentCodeAt]);

  const onChange = (event: any) => {
    const newCode = event.target.value;
    setCode(newCode);
    if (newCode.length === 6) {
      const country = parsePhoneNumber(phoneNumber!)?.country;
      const retrievalEndpoint = `${zkPhoneEndpoint}/getCredentials/v4/${phoneNumber}/${newCode}/${country}/${sid}`;
      const encodedRetrievalEndpoint = encodeURIComponent(
        window.btoa(retrievalEndpoint)
      );
      datadogLogs.logger.info("EnterPhoneCode", {});
      navigate(
        `/issuance/phone-verify/store?retrievalEndpoint=${encodedRetrievalEndpoint}`
      );
    }
  };

  return (
    <IssuanceContainer steps={steps} currentIdx={currentIdx}>
      {success ? (
        <StepSuccessWithAnalytics />
      ) : currentStep === "Pay" && !paymentSubmissionIsLoading ? (
        <PhonePayment onPaymentSuccess={submitPhonePayment} />
      ) : currentStep === "Pay" && paymentSubmissionIsLoading ? (
        <div>
          <p>Loading...</p>
        </div>
      ) : currentStep === "Phone#" ? (
        <PhoneNumberForm onSubmit={setNumberAndSendCode} />
      ) : currentStep === "Verify" ? (
        <>
          <h2 style={{ marginBottom: "25px" }}>Enter the code sent to you via SMS, WhatsApp, or Viber</h2>
          <input value={code} onChange={onChange} className="text-field" />

          <div className="spacer-medium" />
          <p>Didn't receive a code?</p>
          <p>You can attempt up to 3 times.</p>
          <button
            className="x-button secondary outline"
            style={{
              fontSize: '16px'
            }}
            onClick={() => {
              setPhoneNumber(undefined);
            }}
          >
            Re-enter phone number
          </button>
        </>
      ) : (
        // currentStep === "Finalize" ? (
        <FinalStep onSuccess={() => setSuccess(true)} />
      )}
    </IssuanceContainer>
  );
};

export default VerifyPhoneNumber;
