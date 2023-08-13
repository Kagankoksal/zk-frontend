import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import classNames from "classnames";
import { Oval } from "react-loader-spinner";
import { useQuery } from '@tanstack/react-query'
import { InfoButton } from "../info-button";
import { Modal } from "../atoms/Modal";
import ColoredHorizontalRule from "../atoms/ColoredHorizontalRule";
import { serverAddress, idServerUrl } from "../../constants";
import useIdvSessionStatus from "../../hooks/useIdvSessionStatus"
import { useHoloAuthSig } from "../../context/HoloAuthSig";
import { useHoloKeyGenSig } from "../../context/HoloKeyGenSig";

const issuerAddrToName = Object.fromEntries(
  Object.values(serverAddress).map(addr => [addr, "Holonym"])
);

const govIdCredNames = [
  "First Name",
  "Middle Name",
  "Last Name",
  "Birthdate",
  "Street Number",
  "Street Name",
  "Street Unit",
  "City",
  "Subdivision",
  "Zip Code",
  "Country",
]

const medicalCredNames = [
  'Medical Credentials',
  'Medical Specialty',
  // 'License',
  'NPI Number',
]


const ExportModal = ({ authSigs, visible, setVisible, blur = true, }) => {
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    if (showCopied) {
      const timer = setTimeout(() => {
        setShowCopied(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showCopied]);

  return (
    <>
      <Modal visible={visible} setVisible={setVisible} blur={blur} heavyBlur={true} transparentBackground={true}>
        <div style={{ textAlign: 'center' }}>
          <h3>Export Your Holo</h3>
          <p>Export your private info to the Holonym mobile app.</p>
          <p>Copy to clipboard or scan QR code.</p>
          <hr />
          <h4>Copy to clipboard</h4>
          <button 
            className="x-button secondary outline"
            onClick={() => {
              navigator.clipboard.writeText(authSigs);
              setShowCopied(true)
            }}
          >
            {showCopied ? "\u2713 Copied" : "Copy"}
          </button>
          <hr />
          <h4>Scan QR code</h4>
          <div style={{ margin: "20px" }}>
            <QRCode value={authSigs || ""} />
          </div>
        </div>
      </Modal>
    </>
  )
}

const VerifyButton = ({ onClick, text }) => (
  <button onClick={onClick} className="profile-verify-button">
    {text}
  </button>
)

export default function PrivateInfoCard({ creds, loading }) {
  const navigate = useNavigate();
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [authSigs, setAuthSigs] = useState(null);
  const { holoAuthSig } = useHoloAuthSig();
  const { holoKeyGenSig } = useHoloKeyGenSig();

  useEffect(() => {
    if (!(holoAuthSig && holoKeyGenSig)) return;
    const authSigsTemp = JSON.stringify({ holoAuthSig, holoKeyGenSig });
    setAuthSigs(authSigsTemp);
  }, [holoAuthSig, holoKeyGenSig])

  const exportButtonClasses = classNames({
    "export-private-info-button": true,
    "disabled": !authSigs,
  });

  const { data: idvSessionStatus } = useIdvSessionStatus();
  
  const govIdRetrievalEndpoint = useMemo(() => {
    if (idvSessionStatus?.veriff?.status === 'approved') {
      const retrievalEndpoint = `${idServerUrl}/veriff/credentials?sessionId=${
        idvSessionStatus?.veriff?.sessionId
      }`
      return encodeURIComponent(window.btoa(retrievalEndpoint))
    } else if (idvSessionStatus?.idenfy?.status === 'APPROVED') {
      const retrievalEndpoint = `${idServerUrl}/idenfy/credentials?scanRef=${
        idvSessionStatus?.idenfy?.scanRef
      }`
      return encodeURIComponent(window.btoa(retrievalEndpoint))
    } else if (idvSessionStatus?.onfido?.status === 'complete') {
      const retrievalEndpoint = `${idServerUrl}/onfido/credentials?check_id=${
        idvSessionStatus?.onfido?.check_id
      }`
      return encodeURIComponent(window.btoa(retrievalEndpoint))
    }
  }, [idvSessionStatus])

  const govIdVerificationStatus = useMemo(() => {
    // If there's a retrievalEndpoint, then we just want to display that, not the status
    if (govIdRetrievalEndpoint) return

    // TODO: Update this. Display the most successful verification status. For example,
    // if onfido is 'in_progress', but veriff is 'declined', display the onfido status.
    return idvSessionStatus?.veriff?.status 
      ?? idvSessionStatus?.idenfy?.status 
      ?? idvSessionStatus?.onfido?.status
  }, [idvSessionStatus, govIdRetrievalEndpoint])

  // TODO...
  // - If they have 1 successful session and no other session, simply display a link
  // to finalize verification.
  // - If they have multiple successful sessions, display a button to open a modal
  // to view the successful sessions.
  // - If they have 1 unsuccessful session and no other session, display something
  // like: "Your verification was declined by <provider>. Click here to verify different 
  // provider" which opens a modal to select a different provider. The provider that
  // declined them should be greyed out.
  // - If they have multiple unsuccessful sessions, display a button to open a modal
  // that displays, for each provider, the session status.

  return (
    <>
      <ExportModal authSigs={authSigs} visible={exportModalVisible} setVisible={setExportModalVisible} />
      
      {/* <Modal 
        // visible={confirmationModalVisible} 
        visible={confirmationStatus === 'confirmationRequired'}
        setVisible={() => {}} blur={true} heavyBlur={false} transparentBackground={false} >
        <div style={{ textAlign: 'center' }}>
          <p>Government ID Verification status</p>
          <p>Would you like to overwrite them?</p>
          <div className="confirmation-modal-buttons" style={{ marginTop: "10px", marginBottom: "10px", marginLeft: "auto", marginRight: "auto" }}>
            <button className="confirmation-modal-button-cancel" onClick={onDenyOverwrite}>No</button>
            <button className="confirmation-modal-button-confirm" onClick={onConfirmOverwrite}>Yes</button>
          </div>
          <p>You will not be able to undo this action.</p>
          <p>You would be overwriting...</p>
        </div>
          {JSON.stringify(credsThatWillBeOverwritten?.metadata?.rawCreds ?? credsThatWillBeOverwritten, null, 2)
            ?.replaceAll('}', '')?.replaceAll('{', '')?.replaceAll('"', '')?.split(',')?.map((cred, index) => (
              // rome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              <p key={index}><code>{cred}</code></p>
          ))}
      </Modal> */}

      <div className="profile-info-card">
        {loading ? (
          <Oval
            // height={100}
            // width={100}
            color="white"
            wrapperStyle={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
            wrapperClass=""
            visible={true}
            ariaLabel="oval-loading"
            secondaryColor="#060612" // matches card background
            strokeWidth={2}
            strokeWidthSecondary={2}
          />
        ) : (
          <>
            <div className="card-header" style={{ display: "flex"}}>
              <div>
                <h2 className="card-header-title">Your Holo</h2>
                <div style={{ display: 'flex' }}>
                  <p>This is kept locally and privately. Only you can see it.</p>
                  <div style={{ marginBottom: "12px", position: 'relative', top: '-4px', left: '-4px' }}>
                    <InfoButton
                      type="inPlace"
                      text={"Data is stored locally and a backup is encrypted and stored in a backup server access-gated by your wallet signature. This server may be replaced with decentralized storage. Nobody can see your data except you."}
                    />
                  </div>
                </div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button 
                  className={exportButtonClasses}
                  style={{ padding: "20px" }} 
                  onClick={() => authSigs ? setExportModalVisible(true) : null}
                >
                  Export
                </button>
              </div>
            </div>
            <ColoredHorizontalRule />
            <div className="card-content">
              <div className="private-info-grid">
                <div style={{ fontWeight: 'bold' }} className="private-info-attribute-name">Attribute</div>
                <div style={{ fontWeight: 'bold' }} className="private-info-attribute-value">Value</div>
                <div style={{ fontWeight: 'bold' }} className="private-info-attribute-date-issued">Date issued</div>
                <div style={{ fontWeight: 'bold' }} className="private-info-attribute-issuer">Issuer</div>

                {creds && Object.keys(creds).filter(item => govIdCredNames.includes(item)).length > 0 ? (
                  Object.keys(creds).filter(item => govIdCredNames.includes(item)).map((credName, index) => 
                  // TODO: Fix: Warning: Each child in a list should have a unique "key" prop.
                    (
                      <>
                        <div className="private-info-attribute-name">{credName}</div>
                        <div className="private-info-attribute-value">{creds[credName]?.cred}</div>
                        <div className="private-info-attribute-date-issued">{creds[credName]?.iat}</div>
                        <div className="private-info-attribute-issuer">{issuerAddrToName[creds[credName]?.issuer] ?? creds[credName]?.issuer}</div>
                      </>
                    )
                  )
                ) : govIdRetrievalEndpoint ? (
                  <>
                    <div className="private-info-attribute-name">Government ID</div>
                    <VerifyButton 
                      onClick={() => navigate(`/issuance/idgov-veriff/store?retrievalEndpoint=${govIdRetrievalEndpoint}`)} 
                      text="Your Government ID credentials are ready - Click here to complete issuance" 
                    />
                  </>
                ) : govIdVerificationStatus ? (
                  // TODO: If status is something like "in progress", display it here. If it
                  // is something like "declined" but the user has not tried another provider,
                  // then we should probably display both "declined (<provider>)" AND the
                  // "Verify Government ID" button.
                  <>
                    <div className="private-info-attribute-name">Government ID</div>
                    <VerifyButton onClick={() => navigate('/issuance/idgov')} text="Verify Government ID" />
                  </>
                ) : (
                  <>
                    <div className="private-info-attribute-name">Government ID</div>
                    <VerifyButton onClick={() => navigate('/issuance/idgov')} text="Verify Government ID" />
                  </>
                )}
                
                {creds?.['Phone Number'] ? (
                  <>
                    <div className="private-info-attribute-name">Phone Number</div>
                    <div className="private-info-attribute-value">{creds['Phone Number']?.cred}</div>
                    <div className="private-info-attribute-date-issued">{creds?.['Phone Number']?.iat}</div>
                    <div className="private-info-attribute-issuer">{issuerAddrToName[creds?.['Phone Number']?.issuer] ?? creds?.['Phone Number']?.issuer}</div>
                  </>
                ) : (
                  <>
                    <div className="private-info-attribute-name">Phone Number</div>
                    <VerifyButton onClick={() => navigate('/issuance/phone')} text="Verify Phone Number" />
                  </>
                )}

                {creds && Object.keys(creds).filter(item => medicalCredNames.includes(item)).length > 0 ? (
                  Object.keys(creds).filter(item => medicalCredNames.includes(item)).map((credName, index) => 
                  // TODO: Fix: Warning: Each child in a list should have a unique "key" prop.
                    (
                      <>
                        <div className="private-info-attribute-name">{credName}</div>
                        <div className="private-info-attribute-value">{creds[credName]?.cred}</div>
                        <div className="private-info-attribute-date-issued">{creds[credName]?.iat}</div>
                        <div className="private-info-attribute-issuer">{issuerAddrToName[creds[credName]?.issuer] ?? creds[credName]?.issuer}</div>
                      </>
                    )
                  )
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
