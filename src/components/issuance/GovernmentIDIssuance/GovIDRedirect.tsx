/**
 * A component for performing redirection, based on app state, to the correct GovID
 * issuance page.
 */
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCreds } from "../../../context/Creds";
import { serverAddress } from "../../../constants";
import VerificationContainer from "../IssuanceContainer";
import useSniffedIPAndCountry from '../../../hooks/useSniffedIPAndCountry'
import usePreferredIDVProvider from '../../../hooks/usePreferredIDVProvider'
import useIdServerSessions from '../../../hooks/useIdServerSessions'
import useCreateIdServerSession from '../../../hooks/useCreateIdServerSession'

const steps = ["Pay", "Verify", "Finalize"];

const GovIDRedirect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const provider = searchParams.get("provider");
  const { sortedCreds, loadingCreds } = useCreds();

  const { data: ipAndCountry, isLoading: ipAndCountryIsLoading } =
    useSniffedIPAndCountry();

  const { data: preferredProvider, isLoading: preferredProviderIsLoading } =
    usePreferredIDVProvider(ipAndCountry, {
      enabled: !ipAndCountryIsLoading,
    });

  const {
    data: idServerSessions,
    isLoading: idServerSessionsIsLoading,
  } = useIdServerSessions();

  const {
    mutateAsync: createSessionAsync
  } = useCreateIdServerSession({
    preferredProvider
  });

  useEffect(
    () => {
      if (loadingCreds || ipAndCountryIsLoading || preferredProviderIsLoading || idServerSessionsIsLoading)
        return;

      // User already has gov id creds. Send them to the confirm reverify page.
      if (sortedCreds?.[serverAddress["idgov-v2"]]) {
        let url = `/issuance/idgov-confirm-reverify`;
        if (provider) {
          url += `?provider=${provider}`;
        }
        navigate(url);
        return;
      }

      // If user already has one or more sessions, redirect them to the correct
      // one. Otherwise, redirect them to the issuance page for the preferred
      // provider (as determined by a function of the country of their IP address).
      // TODO: Each of the following if statements assumes the first item in the
      // array will always be the correct one to use. It's possible, though unlikely,
      // for cases to arise where this assumption doesn't hold. We should rewrite
      // this to handle all possible cases.
      if (Array.isArray(idServerSessions) && idServerSessions.length > 0) {
        // If user has already paid for a session but hasn't completed verification,
        // direct them to the page where they can start verification.
        const inProgressSessions = idServerSessions.filter(
          (session) => session.status === "IN_PROGRESS"
        );
        if (inProgressSessions.length > 0) {
          const provider = inProgressSessions[0].idvProvider;
          navigate(`/issuance/idgov-${provider}?sid=${inProgressSessions[0]._id}`);
          return;
        }

        // If the user has already initiated a session but hasn't paid for it,
        // direct them to the page where they can pay for the session.
        const needsPaymentSessions = idServerSessions.filter(
          (session) => session.status === "NEEDS_PAYMENT"
        );
        if (needsPaymentSessions.length > 0) {
          const provider = needsPaymentSessions[0].idvProvider;
          navigate(`/issuance/idgov-${provider}?sid=${needsPaymentSessions[0]._id}`);
          return;
        }
      }

      createSessionAsync()
        .then((data: { session: { _id: string }}) => {
          // Redirect the user to the issuance page that uses the correct IDV provider
          navigate(`/issuance/idgov-${preferredProvider}?sid=${data.session._id}`);    
        })
        .catch((err) => {
          console.error('Error creating session:', err)
        })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sortedCreds,
      loadingCreds,
      ipAndCountryIsLoading,
      preferredProviderIsLoading,
      idServerSessionsIsLoading,
    ]
  );

  return (
    <VerificationContainer steps={steps} currentIdx={0}>
      <div style={{ textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    </VerificationContainer>
  );
};

export default GovIDRedirect;
