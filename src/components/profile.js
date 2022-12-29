import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import { InfoButton } from "./info-button";
import PublicProfileField from './atoms/PublicProfileField';
import PrivateProfileField from './atoms/PrivateProfileField';
import { useLitAuthSig } from "../context/LitAuthSig";
import { 
  getLocalEncryptedUserCredentials,
  getLocalProofMetadata,
  decryptObjectWithLit,
} from '../utils/secrets';
import { 
  idServerUrl,
  primeToCountryCode,
  chainUsedForLit,
} from "../constants/misc";
import { useHoloAuthSig } from "../context/HoloAuthSig";

const credsFieldsToIgnore = [
  'completedAt',
  'issuer',
  'newSecret',
  'secret',
  'signature'
]

function formatCreds(creds) {
  // Note: This flattening approach assumes two issuers will never provide the same field.
  // For example, we will never use BOTH Vouched and Persona to retrieve "countryCode"
  const flattenedCreds = {}
  for (const issuer of Object.keys(creds)) {
    const credsToFlatten = creds[issuer].rawCreds ?? creds[issuer]; // This check is for backwards compatibility with the schema used before 2022-12-12
    Object.assign(flattenedCreds, { 
      ...flattenedCreds,
      ...credsToFlatten,
    })
  }
  const filteredCreds = Object.fromEntries(
    Object.entries(flattenedCreds).filter(([fieldName, value]) => {
      return !credsFieldsToIgnore.includes(fieldName);
    })
  );
  const formattedCreds = Object.fromEntries(
    Object.entries(filteredCreds).map(([fieldName, value]) => {
      if (fieldName === "countryCode") {
        return ['Country', primeToCountryCode[value]]
      } else {
        let formattedFieldName = fieldName.replace(/([A-Z])/g, " $1");
        formattedFieldName =
          formattedFieldName.charAt(0).toUpperCase() + formattedFieldName.slice(1);
        return [formattedFieldName, value];
      }
    })
  );
  return formattedCreds;
}

function populateProofMetadataDisplayDataAndRestructure(proofMetadata) {
  // TODO: Once we submit proofs to multiple chains, we should sort by chain too
  const proofMetadataObj = {}
  for (const metadataItem of proofMetadata) {
    if (metadataItem.proofType === 'uniqueness') {
      metadataItem.displayName = 'Unique Person'
      // metadataItem.fieldValue = `for action ${metadataItem.actionId}`
      metadataItem.fieldValue = 'Yes'
    }
    else if (metadataItem.proofType === 'us-residency') {
      metadataItem.displayName = 'US Resident'
      metadataItem.fieldValue = 'Yes'
    }
    proofMetadataObj[metadataItem.proofType] = metadataItem;
  }
  return proofMetadataObj;
}

export default function Profile(props) {
  const navigate = useNavigate();
  const [creds, setCreds] = useState();
  const [proofMetadata, setProofMetadata] = useState();
  const [readyToLoadCredsAndProofs, setReadyToLoadCredsAndProofs] = useState()
  const { getLitAuthSig, signLitAuthMessage } = useLitAuthSig();
  const {
    signHoloAuthMessage,
    holoAuthSigIsError,
    holoAuthSigIsLoading,
    holoAuthSigIsSuccess,
    getHoloAuthSigDigest
  } = useHoloAuthSig();

  useEffect(() => {
    (async () => {
      if (!getLitAuthSig()) {
        await signLitAuthMessage();
      }
      if (!getHoloAuthSigDigest()) {
        await signHoloAuthMessage();
      }
      setReadyToLoadCredsAndProofs(true);
    })()
  }, [])

  useEffect(() => {
    async function getAndSetCreds() {
      try {
        let encryptedCredsObj = getLocalEncryptedUserCredentials()
        if (!encryptedCredsObj) {
          const resp = await fetch(`${idServerUrl}/credentials?sigDigest=${getHoloAuthSigDigest()}`)
          encryptedCredsObj = await resp.json();
        }
        if (encryptedCredsObj) {
          const plaintextCreds = await decryptObjectWithLit(
            encryptedCredsObj.encryptedCredentials, 
            encryptedCredsObj.encryptedSymmetricKey, 
            getLitAuthSig()
          )
          const formattedCreds = formatCreds(plaintextCreds);
          setCreds(formattedCreds);
        }
      } catch (err) {
        console.log(err)
      }
    }
    async function getAndSetProofMetadata() {
      try {
        let encryptedProofMetadata = getLocalProofMetadata()
        if (!encryptedProofMetadata) {
          const resp = await fetch(`${idServerUrl}/proof-metadata?sigDigest=${getHoloAuthSigDigest()}`)
          encryptedProofMetadata = await resp.json();
        }
        if (encryptedProofMetadata) {
          const decryptedProofMetadata = await decryptObjectWithLit(
            encryptedProofMetadata.encryptedProofMetadata,
            encryptedProofMetadata.encryptedSymmetricKey,
            getLitAuthSig()
          )
          const populatedData = populateProofMetadataDisplayDataAndRestructure(decryptedProofMetadata)
          setProofMetadata(populatedData)
        }
      } catch (err) {
        console.log(err)
      }
    }
    getAndSetCreds()
    getAndSetProofMetadata()
  }, [readyToLoadCredsAndProofs])

  return (
    <>
    <div className="x-section wf-section">
      <div className="x-container dashboard w-container">
        <div className="x-dash-div">
          <h1 className="h1">Public Info</h1>
          <div className="spacer-small"></div>
        </div>
        <div className="spacer-small"></div>
        <div className="x-wrapper dash">
          {/* <PublicProfileField header="Age" fieldValue="24" /> */}
          <PublicProfileField 
            header="Unique Person" 
            description={`This shows whether you have publicly claimed a "Unique person" SBT at a certain address. You can only prove this at one address from one government ID, allowing for robust Sybil resistance`}
            fieldValue={proofMetadata?.['uniqueness']?.fieldValue}
            proofSubmissionAddr={proofMetadata?.['uniqueness']?.address}
            proveButtonCallback={proofMetadata?.['uniqueness']?.address ? null :
              () => navigate('/prove/uniqueness')
            }
          />
          <PublicProfileField 
            header="US Resident" 
            description="This shows whether you've publicly claimed a US residency SBT at a certain address"
            fieldValue={proofMetadata?.['us-residency']?.fieldValue} 
            proofSubmissionAddr={proofMetadata?.['us-residency']?.address}
            proveButtonCallback={proofMetadata?.['us-residency']?.address ? null :
              () => navigate('/prove/us-residency')
            }
          />
        </div>
        <div className="spacer-large"></div>
        <div className="x-dash-div">
          <h1 className="h1">Private Info</h1>
        </div>
        <div className="x-dash-div">
          <p>This is kept locally and privately. Only you can see it.</p>
          <div style={{marginBottom: "12px"}}>
            <InfoButton
                          type="inPlace"
                          text={`Data is stored locally and a backup is encrypted, split up, and stored in multiple locations access-gated by your wallet signature. Part of it is stored in the Lit protocol, and part of it is stored on a server that cannot read any of your data, since all your data is encrypted. This server may be replaced with decentralized storage. Essentially, nobody can see your data except you, even in the backups.`}
                      />
          </div>
          <div className="spacer-small"></div>
        </div>
        <div className="spacer-small"></div>
        <div className="x-wrapper dash">
          {creds?.['Country'] && creds?.['Subdivision'] && creds?.['Birthdate'] ? (
            <>
              <PrivateProfileField 
                header="Name" 
                fieldValue={
                  ((creds?.['First Name'] ? creds['First Name'] + " " : "") +
                  (creds?.['Middle Name'] ? creds['Middle Name'] + " " : "") +
                  (creds?.['Last Name'] ? creds['Last Name'] : ""))
                  || undefined
                }
              />
              {/* <PrivateProfileField 
                header="First Name" 
                fieldValue={creds?.['First Name']}
              />
              <PrivateProfileField 
                header="Middle Name" 
                fieldValue={creds?.['Middle Name']}
              />
              <PrivateProfileField 
                header="Last Name" 
                fieldValue={creds?.['Last Name']}
              /> */}
              <PrivateProfileField 
                header="Birthdate" 
                fieldValue={creds?.['Birthdate']}
              />
              <PrivateProfileField 
                header="Street Address" 
                fieldValue={
                  ((creds?.['Street Number'] ? creds['Street Number'] + " " : "") +
                  (creds?.['Street Name'] ? creds['Street Name'] + " " : "") +
                  (creds?.['Street Unit'] ? creds['Street Unit'] : ""))
                  || undefined
                }
              />
              {/* <PrivateProfileField 
                header="Street Number" 
                fieldValue={creds?.['Street Number']}
              />
              <PrivateProfileField 
                header="Street Name" 
                fieldValue={creds?.['Street Name']}
              />
              <PrivateProfileField 
                header="Street Unit" 
                fieldValue={creds?.['Street Unit']}
              /> */}
              <PrivateProfileField 
                header="City" 
                fieldValue={creds?.['City']}
              />
              <PrivateProfileField 
                header="State" 
                fieldValue={creds?.['Subdivision']}
              />
              <PrivateProfileField 
                header="Zip Code" 
                fieldValue={creds?.['Zip Code']}
              />
              <PrivateProfileField 
                header="Country" 
                fieldValue={creds?.['Country']} 
              />
            </>
          ) : (
            <PrivateProfileField 
              header="Government ID" 
              fieldValue={undefined}
              verifyButtonCallback={() => navigate('/mint/idgov')}
            />
          )}
          <PrivateProfileField 
            header="Phone Number" 
            fieldValue={creds?.['Phone Number']}
            verifyButtonCallback={creds?.['Phone Number'] ?
              null : () => navigate('/mint/phone') 
            }
          />
          </div>
      </div>
    </div>
  </>
  );
}
