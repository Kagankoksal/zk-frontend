/**
 * This provider generates proofs and stores them in context and session storage.
 * NOTE: This provider must be a child of the signature providers because this
 * provider relies on the user's signatures.
 */
import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSessionStorage } from 'usehooks-ts'
import { useAccount } from 'wagmi';
import { serverAddress, defaultActionId } from '../constants';
import { useHoloAuthSig } from './HoloAuthSig';
import { useHoloKeyGenSig } from './HoloKeyGenSig';
import { useProofMetadata } from './ProofMetadata';
import ProofsWorker from "../web-workers/proofs.worker.js"; // Use worker in Webpack 4
import { useCreds } from './Creds';

const Proofs = createContext(null);

// Use worker in Webpack 5
// const proofsWorker = window.Worker ? new Worker(new URL('../web-workers/load-proofs.js', import.meta.url)) : null;

// Use worker in Webpack 4
const proofsWorker = new ProofsWorker();

function ProofsProvider({ children }) {
  const [uniquenessProof, setUniquenessProof] = useSessionStorage('uniqueness-proof', null);
  const [loadingUniquenessProof, setLoadingUniquenessProof] = useState(false);
  const [usResidencyProof, setUSResidencyProof] = useSessionStorage('us-residency-proof', null);
  const [loadingUSResidencyProof, setLoadingUSResidencyProof] = useState(false);
  const [medicalSpecialtyProof, setMedicalSpecialtyProof] = useSessionStorage('medical-specialty-proof', null);
  const [loadingMedicalSpecialtyProof, setLoadingMedicalSpecialtyProof] = useState(false);
  const [govIdFirstNameLastNameProof, setGovIdFirstNameLastNameProof] = useSessionStorage('gov-id-firstname-lastname-proof', null);
  const [loadingGovIdFirstNameLastNameProof, setLoadingGovIdFirstNameLastNameProof] = useState(false);
  const [kolpProof, setKOLPProof] = useSessionStorage('kolp', null);
  const [loadingKOLPProof, setLoadingKOLPProof] = useState(false);
  const { data: account } = useAccount();
  const { holoAuthSigDigest } = useHoloAuthSig();
  const { holoKeyGenSigDigest } = useHoloKeyGenSig();
  const { proofMetadata, loadingProofMetadata } = useProofMetadata();
  const { sortedCreds, loadingCreds } = useCreds();

  // TODO: Load all proofs in here. Need to add onAddLeafProof

  // TODO: Re-load proofs if credentials change

  useEffect(() => {
    proofsWorker.onmessage = (event) => {
      if (event?.data?.proofType === "us-residency") {
        setUSResidencyProof(event.data.proof);
        setLoadingUSResidencyProof(false);
      } else if (event?.data?.proofType === "uniqueness") {
        setUniquenessProof(event.data.proof);
        setLoadingUniquenessProof(false);
      } else if (event?.data?.proofType === "medical-specialty") {
        setMedicalSpecialtyProof(event.data.proof);
        setLoadingMedicalSpecialtyProof(false);
      } else if (event?.data?.proofType === "gov-id-firstname-lastname") {
        setGovIdFirstNameLastNameProof(event.data.proof);
        setLoadingGovIdFirstNameLastNameProof(false);
      } else if (event?.data?.proofType === "kolp") {
        setKOLPProof(event.data.proof);
        setLoadingKOLPProof(false);

      } else if (event?.data?.error) {
        console.error(event.data.error);
      }
    };

    if (loadingProofMetadata || loadingCreds) return;

    // TODO: Use useQuery for this so that you only call this function once
    (async () => {
      // Figure out which proofs the user doesn't already have. Then load them
      // if the user has the credentials to do so.
      const missingProofs = { 
        'uniqueness': !uniquenessProof, 
        'us-residency': !usResidencyProof, 
        'medical-specialty': !medicalSpecialtyProof,
        'gov-id-firstname-lastname': !govIdFirstNameLastNameProof, // Not an SBT. No good way to determine whether user needs it, so always generate
        'kolp': !kolpProof, // Not an SBT. Always needed
      };
      if (proofMetadata) {
        for (const proofMetadataItem of proofMetadata) {
          if (proofMetadataItem?.proofType === "us-residency") {
            missingProofs['us-residency'] = false;
          } else if (proofMetadataItem?.proofType === "uniqueness") {
            missingProofs['uniqueness'] = false;
          } else if (proofMetadataItem?.proofType === "medical-specialty") {
            missingProofs['medical-specialty'] = false;
          }
        }
      }
      console.log('creds', sortedCreds)
      if (!sortedCreds) {
        return;
      }
      // Load proofs requiring gov ID creds
      const govIdCreds = sortedCreds[serverAddress['idgov-v2']]
      if (govIdCreds) {
        if (missingProofs.uniqueness && !loadingUniquenessProof) {
          setLoadingUniquenessProof(true);
          loadUniquenessProof(
            govIdCreds.creds.newSecret, 
            govIdCreds.creds.serializedAsNewPreimage, 
            account.address,
            defaultActionId
          );
        }
        if (missingProofs['us-residency'] && !loadingUSResidencyProof) {
          setLoadingUSResidencyProof(true);
          loadUSResidencyProof(
            govIdCreds.creds.newSecret, 
            govIdCreds.creds.serializedAsNewPreimage, 
            account.address,
          );
        }
        if (!kolpProof && !loadingKOLPProof) {
          setLoadingKOLPProof(true);
          loadKOLPProof(
            govIdCreds.creds.newSecret,
            govIdCreds.creds.serializedAsNewPreimage,
          )
        }
        if (!govIdFirstNameLastNameProof && !loadingGovIdFirstNameLastNameProof) {
          setLoadingGovIdFirstNameLastNameProof(true);
          loadGovIdFirstNameLastNameProof(govIdCreds);
        }
      }
      // Load proofs requiring medical creds
      const medicalCreds = sortedCreds[serverAddress['med']]
      if (medicalCreds) {
        if (missingProofs['medical-specialty'] && !loadingMedicalSpecialtyProof) {
          setLoadingMedicalSpecialtyProof(true);
          loadMedicalSpecialtyProof(
            medicalCreds.creds.newSecret, 
            medicalCreds.creds.serializedAsNewPreimage, 
            account.address,
          );
        }
      }
    })();
  }, [proofMetadata, loadingProofMetadata, sortedCreds, loadingCreds])
  
  /**
   * Use web worker to load anti-sybil proof into context and session storage.
   */
  function loadUniquenessProof(newSecret, serializedAsNewPreimage, userAddress, actionId) {
    if (proofsWorker) {
      proofsWorker.postMessage({ 
        message: "uniqueness", 
        newSecret, 
        serializedAsNewPreimage, 
        userAddress, 
        actionId
      });
    } else {
      // TODO: Call the function directly
    }
  }

  /**
   * Use web worker to load proof of residency proof into context and session storage.
   */
  function loadUSResidencyProof(newSecret, serializedAsNewPreimage, userAddress) {
    if (proofsWorker) {
      proofsWorker.postMessage({ 
        message: "us-residency", 
        newSecret, 
        serializedAsNewPreimage, 
        userAddress
      });
    } else {
      // TODO: Call the function directly
    }
  }

  /**
   * Use web worker to load medical specialty proof into context and session storage.
   */
  function loadMedicalSpecialtyProof(newSecret, serializedAsNewPreimage, userAddress) {
    if (proofsWorker) {
      proofsWorker.postMessage({ 
        message: "medical-specialty", 
        newSecret, 
        serializedAsNewPreimage, 
        userAddress
      });
    } else {
      // TODO: Call the function directly
    }
  }

  function loadGovIdFirstNameLastNameProof(govIdCreds) {
    if (proofsWorker) {
      proofsWorker.postMessage({ 
        message: "gov-id-firstname-lastname", 
        govIdCreds, 
      });
    } else {
      // TODO: Call the function directly
    }
  }

  function loadKOLPProof(newSecret, serializedAsNewPreimage) {
    if (proofsWorker) {
      proofsWorker.postMessage({ 
        message: "kolp", 
        newSecret, 
        serializedAsNewPreimage, 
      });
    } else {
      // TODO: Call the function directly
    }
  }

  return (
    <Proofs.Provider value={{
      uniquenessProof,
      loadUniquenessProof,
      usResidencyProof,
      loadUSResidencyProof,
      medicalSpecialtyProof,
      loadMedicalSpecialtyProof,
      govIdFirstNameLastNameProof,
      loadGovIdFirstNameLastNameProof,
      kolpProof,
      loadKOLPProof,
    }}>
      {children}
    </Proofs.Provider>
  )
}

// Helper hook to access the provider values
const useProofs = () => useContext(Proofs)

export { ProofsProvider, useProofs }
