import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAccount } from "wagmi";

import {
  encryptObject,
  setLocalUserCredentials,
  getLocalEncryptedUserCredentials,
  decryptObjectWithLit,
  generateSecret,
  storeCredentials,
  getIsHoloRegistered,
  requestCredentials,
} from "../utils/secrets";
import { 
  idServerUrl,
} from "../constants/misc";
import { ThreeDots } from "react-loader-spinner";
import { Success } from "./success";
import { useLitAuthSig } from '../context/LitAuthSig';
import { useHoloAuthSig } from "../context/HoloAuthSig";
import MintButton from "./atoms/mint-button";

// For test credentials, see id-server/src/main/utils/constants.js

// Comment:
// LitJsSdk.disconnectWeb3()

// Display success message, and retrieve user credentials to store in browser
const Verified = (props) => {
  // const { jobID } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [readyToLoadCreds, setReadyToLoadCreds] = useState();
  const [error, setError] = useState();
  const [loading, setLoading] = useState(true);
  const [successScreen, setSuccessScreen] = useState(false);
  const { data: account } = useAccount();

  const { getLitAuthSig, signLitAuthMessage } = useLitAuthSig();
  const {
    signHoloAuthMessage,
    holoAuthSigIsError,
    holoAuthSigIsLoading,
    holoAuthSigIsSuccess,
    getHoloAuthSigDigest,
  } = useHoloAuthSig();

  async function loadCredentials() {
    setError(undefined);
    setLoading(true);
    try {
      // const resp = await fetch(
      //   `${idServerUrl}/registerVouched/vouchedCredentials?jobID=${jobID}`
      // );
      const resp = await fetch(searchParams.get('retrievalEndpoint'))
      const data = await resp.json();
      if (!data) {
        console.error(`Could not retrieve credentials.`);
        return;
      } else {
        setLoading(false);
        return data;
      }
    } catch (err) {
      console.error(`Could not retrieve credentials. Details: ${err}`);
    }
  }

  async function mergeAndSetCreds(credsTemp) {
    credsTemp.newSecret = generateSecret();
    const litAuthSig = getLitAuthSig();
    // Merge new creds with old creds
    // TODO: Before we add multiple issuers: Need a way to know whether, if !encryptedCurrentCredsResp, 
    // encryptedCurrentCredsResp is empty because user doesn't have creds or because creds have been removed from localStorage
    const encryptedCurrentCredsResp = getLocalEncryptedUserCredentials()
    let sortedCreds = {};
    if (encryptedCurrentCredsResp) {
      const { sigDigest, encryptedCredentials, encryptedSymmetricKey } = encryptedCurrentCredsResp;
      const currentSortedCreds = await decryptObjectWithLit(encryptedCredentials, encryptedSymmetricKey, litAuthSig);
      sortedCreds = {...currentSortedCreds};
    }
    sortedCreds[credsTemp.issuer] = credsTemp;

    // Store creds
    const holoAuthSigDigest = getHoloAuthSigDigest();
    if (!holoAuthSigDigest) {
      setError("Error: Could not get user signature");
      return;
    }
    const { encryptedString, encryptedSymmetricKey } = await encryptObject(sortedCreds, litAuthSig);
    setLocalUserCredentials(holoAuthSigDigest, encryptedString, encryptedSymmetricKey)
    window.localStorage.removeItem('holoPlaintextVouchedCreds')
    if (props.onCredsStored) props.onCredsStored(sortedCreds[credsTemp.issuer])
  }
  
  // Steps:
  // 1. Get & set litAuthSig and holoAuthSigDigest
  // 2. Get creds from server
  // 3. Merge new creds with current creds
  // 4. Call callback with merged creds
  useEffect(() => {
    if (!account.address) return;
    (async () => {
      if (!getLitAuthSig()) {
        await signLitAuthMessage();
      }
      if (!getHoloAuthSigDigest()) {
        await signHoloAuthMessage();
      }
      setReadyToLoadCreds(true);
    })()
  }, [account])

  useEffect(() => {
    if (!readyToLoadCreds) return;
    (async () => {
      try {
        const credsTemp = props.prefilledCreds ?? (await loadCredentials());
        window.localStorage.setItem('holoPlaintextVouchedCreds', JSON.stringify(credsTemp))
        if (!credsTemp) throw new Error(`Could not retrieve credentials.`);
        await mergeAndSetCreds(credsTemp)
      } catch (err) {
        console.error(err);
        setError(`Error loading credentials: ${err.message}`);
      }
    })()
  }, [readyToLoadCreds])


  if (successScreen) {
    return <Success />;
  }
  return (
    <>
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
      }}>
        <h3 style={{ textAlign: "center", paddingRight:"10px"}}>Loading credentials</h3>
        <ThreeDots 
          height="20" 
          width="40" 
          radius="2"
          color="#FFFFFF" 
          ariaLabel="three-dots-loading"
          wrapperStyle={{marginBottom:"-20px"}}
          wrapperClassName=""
          visible={true}
          />

      </div>
      <p>Please sign the new messages in your wallet</p>
      <p>{error}</p>
      {error && (
        <p>
          Please email Holonym support at{" "}
          <a href="mailto:help@holonym.id">help@holonym.id</a> with a description of
          the error.
        </p>
      )}
    </>
  );
};

export default Verified;
