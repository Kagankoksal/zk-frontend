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
} from "../utils/secrets";
import {
  idServerUrl,
  serverAddress,
  chainUsedForLit,
} from "../constants/misc";
import {
  getDateAsInt,
} from "../utils/proofs";
import { useLitAuthSig } from '../context/LitAuthSig';
import { useHoloAuthSig } from "../context/HoloAuthSig";
import { ThreeDots } from "react-loader-spinner";
import { Success } from "./success";
import MintButton from "./atoms/mint-button";

// For test credentials, see id-server/src/main/utils/constants.js

// Display success message, and retrieve user credentials to store in browser
const Verified = (props) => {
  // const p = useParams();
  // const jobID = p.jobID || props.jobID;
  const { jobID } = useParams();
  const [sortedCreds, setSortedCreds] = useState();
  const [readyToLoadCreds, setReadyToLoadCreds] = useState();
  const [error, setError] = useState();
  const [loading, setLoading] = useState(true);
  const [successScreen, setSuccessScreen] = useState(false);
  const [minting, setMinting] = useState(false);
  const { litAuthSig, setLitAuthSig } = useLitAuthSig();
  const {
    signHoloAuthMessage,
    holoAuthSig,
    holoAuthSigDigest,
    holoAuthSigIsError,
    holoAuthSigIsLoading,
    holoAuthSigIsSuccess,
  } = useHoloAuthSig();

  async function formatCredsAndCallCb(creds) {
    const formattedCreds = {
      ...creds,
      subdivisionHex: "0x" + Buffer.from(creds.subdivision).toString("hex"),
      completedAtHex: getDateAsInt(creds.completedAt),
      birthdateHex: getDateAsInt(creds.birthdate),
    }
    console.log(formattedCreds, props.onCredsStored);
    props.onCredsStored && props.onCredsStored(formattedCreds);
  }

  async function loadCredentials() {
    setError(undefined);
    setLoading(true);
    try {
      const resp = await fetch(
        `${idServerUrl}/registerVouched/vouchedCredentials?jobID=${jobID}`
      );
      // Shape of data == { user: completeUser }
      const data = await resp.json();
      if (!data || data.error) {
        console.error(`Could not retrieve credentials. Details: ${data.error}`);
        return;
      } else {
        setLoading(false);
        return data.user;
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
    const encryptedCurrentCredsResp = await getLocalEncryptedUserCredentials()
    if (encryptedCurrentCredsResp) {
      const { sigDigest, encryptedCredentials, encryptedSymmetricKey } = encryptedCurrentCredsResp
      const currentSortedCreds = await decryptObjectWithLit(encryptedCredentials, encryptedSymmetricKey, litAuthSig)
      setSortedCreds({ ...currentSortedCreds, [serverAddress]: credsTemp })
    } else {
      setSortedCreds({ [serverAddress]: credsTemp })
    }

    // Set creds
    const { encryptedString, encryptedSymmetricKey } = await encryptObject(sortedCreds, litAuthSig);
    const storageSuccess = setLocalUserCredentials(holoAuthSigDigest, encryptedString, encryptedSymmetricKey)
    if (!storageSuccess) {
      console.log('Failed to store user credentials in localStorage')
      setError("Error: There was a problem in storing your credentials");
    }
    formatCredsAndCallCb(sortedCreds[serverAddress])
  }

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
    console.log("props", props)
    (async () => {
      if (!litAuthSig) {
        const authSig = litAuthSig ? litAuthSig : await LitJsSdk.checkAndSignAuthMessage({ chain: chainUsedForLit })
        setLitAuthSig(authSig);
      }
      if (!holoAuthSigDigest) signHoloAuthMessage();
      setReadyToLoadCreds(true);
    })()
  }, [])

  useEffect(() => {
    if (!readyToLoadCreds) return;
    if (!litAuthSig) return;
    if (!holoAuthSigDigest) return;
    (async () => {
      try {
        if (props.jobID === 'retryMint') {
          console.log('retrying mint')
          const localEncryptedCreds = await getLocalEncryptedUserCredentials()
          if (!localEncryptedCreds) {
            throw new Error("Could not retrieve credentials. Are you sure you have minted your Holo?");
          }
          const { sigDigest, encryptedCredentials, encryptedSymmetricKey } = localEncryptedCreds
          const currentSortedCreds = await decryptObjectWithLit(encryptedCredentials, encryptedSymmetricKey, litAuthSig)
          formatCredsAndCallCb(currentSortedCreds[serverAddress])
          return;
        }
        else {
          const credsTemp = await loadCredentials();
          if (!credsTemp) throw new Error(`Could not retrieve credentials.`);
          await mergeAndSetCreds(credsTemp)
        }
      } catch (err) {
        console.log(err);
        setError(`Error: ${err.message}`);
      }
    })()
  }, [readyToLoadCreds, litAuthSig, holoAuthSigDigest])


  if (successScreen) {
    return <Success />;
  }
  // console.log(creds, credsAreStored, registered)
  return (
    <>
      {loading ? (
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
        
      ) : (
        <div>
          <div style={{ maxWidth: "600px", fontSize: "16px" }}>
              <ol>
                <li>
                  <p>Sign the messages in the wallet popups. This allows you to encrypt and store your credentials</p>
                </li>
                {/* <li>
                  <p>Mint your Holo:</p>
                </li> */}
              </ol>
            {/* {creds && credsAreStored && <MintButton creds={creds} successCallback={()=>setSuccessScreen(true)} />} */}
          </div>
        </div>
      )}
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
