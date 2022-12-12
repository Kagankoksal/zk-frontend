import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import LitJsSdk from "@lit-protocol/sdk-browser";

import {
  encryptObject,
  setLocalUserCredentials,
  getLocalEncryptedUserCredentials,
  decryptObjectWithLit,
  generateSecret,
  sha256,
  storeCredentials,
  getIsHoloRegistered,
  requestCredentials,
} from "../utils/secrets";
import { 
  idServerUrl,
  chainUsedForLit,
  zkIdVerifyEndpoint, 
  zkPhoneEndpoint
} from "../constants/misc";
import {
  getDateAsInt,
} from "../utils/proofs";
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
  // const p = useParams();
  // const jobID = p.jobID || props.jobID;
  const { jobID } = useParams();
  const [sortedCreds, setSortedCreds] = useState();
  const [readyToLoadCreds, setReadyToLoadCreds] = useState();
  const [error, setError] = useState();
  const [loading, setLoading] = useState(true);
  const [credsAreStored, setCredsAreStored] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [successScreen, setSuccessScreen] = useState(false);
  const [minting, setMinting] = useState(false);
  // TODO: Check whether user is logged in too
  const [creds, setCreds] = useState();

  const { litAuthSig, setLitAuthSig } = useLitAuthSig();
  const {
    signHoloAuthMessage,
    holoAuthSigIsError,
    holoAuthSigIsLoading,
    holoAuthSigIsSuccess,
    getHoloAuthSigDigest,
  } = useHoloAuthSig();

  async function formatCredsAndCallCb(creds) {
    const formattedCreds = {
      ...creds,
      subdivisionHex: "0x" + Buffer.from(creds.rawCreds.subdivision || "0").toString("hex"),
      completedAtInt: getDateAsInt(creds.rawCreds.completedAt),
      birthdateInt: getDateAsInt(creds.rawCreds.birthdate || "1900-01-01"), //getDateAsInt("1900-01-01") is 0 because the earliest date it accepts is 1900-01-01
    }
    props.onCredsStored && props.onCredsStored(formattedCreds);
  }

  async function loadCredentialsVouched() {
    setError(undefined);
    setLoading(true);
    try {
      const resp = await fetch(
        `${idServerUrl}/registerVouched/vouchedCredentials?jobID=${jobID}`
      );
      const data = await resp.json();
      if (!data || data.error) {
        console.error(`Could not retrieve credentials. Details: ${data.error}`);
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
      // Merge new creds with old creds
      // TODO: Before we add multiple issuers: Need a way to know whether, if !encryptedCurrentCredsResp, 
      // encryptedCurrentCredsResp is empty because user doesn't have creds or because creds have been removed from localStorage
      const encryptedCurrentCredsResp = getLocalEncryptedUserCredentials()
      let sortedCreds_ = {};
      if (encryptedCurrentCredsResp) {
        const { sigDigest, encryptedCredentials, encryptedSymmetricKey } = encryptedCurrentCredsResp;
        const currentSortedCreds = await decryptObjectWithLit(encryptedCredentials, encryptedSymmetricKey, litAuthSig);
        sortedCreds_ = {...currentSortedCreds};
      }
      sortedCreds_[credsTemp.issuer] = credsTemp;
      setSortedCreds(sortedCreds_);

    // Store creds
    const holoAuthSigDigest = getHoloAuthSigDigest();
    if (!holoAuthSigDigest) {
      setError("Error: Could not get user signature");
      return;
    }
    const { encryptedString, encryptedSymmetricKey } = await encryptObject(sortedCreds_, litAuthSig);
    setLocalUserCredentials(holoAuthSigDigest, encryptedString, encryptedSymmetricKey)
    window.localStorage.removeItem('holoPlaintextVouchedCreds')
    formatCredsAndCallCb(sortedCreds_[credsTemp.issuer]);
  }
  // async function loadCredentials2FA() {
  //   setError(undefined);
  //   setLoading(true);
  //   try {
  //     const resp = await fetch(
  //       `${zkPhoneVerifyEndpoint}/getCredentials/${jobID}`
  //     );
  //     // Shape of data == { user: completeUser }
  //     const data = await resp.json();
  //     if (!data || data.error) {
  //       console.error(`Could not retrieve credentials. Details: ${data.error}`);
  //       return;
  //     } else {
  //       setLoading(false);
  //       const credsTemp = data.user;
  //       setCreds(credsTemp);
  //       return credsTemp;
  //     }
  //   } catch (err) {
  //     console.error(`Could not retrieve credentials. Details: ${err}`);
  //   }
  // }

  
  // Steps:
  // Branch a: User is retrying mint
  // Branch a: 1. Get & set litAuthSig and holoAuthSigDigest
  // Branch a: 2. Get and set creds from localStorage
  // Branch a: 3. Call callback with new creds
  // 
  // Branch b: User is not retrying mint
  // Branch b: 1. Get & set litAuthSig and holoAuthSigDigest
  // Branch b: 2. Get creds from server
  // Branch b: 3. Merge new creds with current creds
  // Branch b: 4. Call callback with merged creds
  useEffect(() => {
    (async () => {
      if (!litAuthSig) {
        const authSig = litAuthSig ? litAuthSig : await LitJsSdk.checkAndSignAuthMessage({ chain: chainUsedForLit })
        setLitAuthSig(authSig);
      }
      if (!getHoloAuthSigDigest()) {
        await signHoloAuthMessage();
      }
      setReadyToLoadCreds(true);
    })()
  }, [])

  useEffect(() => {
    if (!readyToLoadCreds) return;
    if (!litAuthSig) return;
    (async () => {
      try {
        if (props.jobID === 'retryMint') {
          console.log('retrying mint')
          const localEncryptedCreds = getLocalEncryptedUserCredentials()
          if (!localEncryptedCreds) {
            throw new Error("Could not retrieve credentials. Are you sure you have minted your Holo?");
          }
          const { sigDigest, encryptedCredentials, encryptedSymmetricKey } = localEncryptedCreds
          const currentSortedCreds = await decryptObjectWithLit(encryptedCredentials, encryptedSymmetricKey, litAuthSig)
          window.localStorage.removeItem('holoPlaintextVouchedCreds')
          formatCredsAndCallCb(currentSortedCreds[props.issuer])
          return;
        }
        else {
          const credsTemp = props.prefilledCreds ?? (await loadCredentialsVouched());
          window.localStorage.setItem('holoPlaintextVouchedCreds', JSON.stringify(credsTemp))
          if (!credsTemp) throw new Error(`Could not retrieve credentials.`);
          await mergeAndSetCreds(credsTemp)
        }
      } catch (err) {
        console.error(err);
        setError(`Error loading credentials: ${err.message}`);
      }
    })()
  }, [readyToLoadCreds, litAuthSig])


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
      {/* // : (
      //   <div>
      //     <div style={{ maxWidth: "600px", fontSize: "16px" }}>
      //         <ol>
      //           <li>
      //             <p>Sign the messages in the wallet popups. This allows you to encrypt and store your credentials</p>
      //           </li>
      //           {/* <li>
      //             <p>Mint your Holo:</p>
      //           </li>*-/}
      //         </ol>
      //       {/* {creds && credsAreStored && <MintButton creds={creds} successCallback={()=>setSuccessScreen(true)} />} *-/}
      //     </div>
      //   </div>
      // ) */}

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
