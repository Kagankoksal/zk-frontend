// import { render, screen } from '@testing-library/react';
// import React from 'react';

// const App = () => {
//   return <div>App</div>;
// };

// test('renders the landing page', () => {
//   render(<App />);
// });

import { randomBytes } from 'crypto'
// import { renderHook, waitFor, act } from '@testing-library/react'
import { renderHook, waitFor, act } from '@testing-library/react-hooks'
import { useStoreCredentialsState, useAddLeafState } from './FinalStep'

global.crypto = {
  getRandomValues: () => randomBytes(64).toString('hex'),
};

jest.mock('../../utils/proofs', () => {
  const poseidon = require('circomlibjs-old').poseidon;
  return {
    ...jest.requireActual('../../utils/proofs'),
    createLeaf: jest.fn((args) => {
      return poseidon(args);
    }),
  }
});

jest.mock('../../web-workers/proofs.worker.js', () => {
  return {
    postMessage: jest.fn(),
    onmessage: jest.fn(),
  }
});

jest.mock('../../context/HoloKeyGenSig', () => ({
  ...jest.requireActual('../../context/HoloKeyGenSig'),
  useHoloKeyGenSig: () => {
    return {
      holoKeyGenSig: '123',
      holoKeyGenSigDigest: '1111111111111111111111111111111111111111111111111111111111111111',
    };
  }
}));

jest.mock('../../context/HoloAuthSig', () => ({
  ...jest.requireActual('../../context/HoloAuthSig'),
  useHoloAuthSig: () => {
    return {

    }
  }
}));

// jest.mock('../../context/Creds', () => ({
//   ...jest.requireActual('../../context/Creds'),
//   useCreds: () => {
//     return {
//     }
//   }
// }));
// TODO: How can we mock and tear down on a per-test basis?
jest.mock('../../context/Creds', () => ({
  ...jest.requireActual('../../context/Creds'),
  useCreds: () => {
    return {
      reloadCreds: async () => (
        {
          '0xISSUER123': {
            creds: {},
            leaf: "",
            newLeaf: "",
            metadata: {},
            pubkey: {},
            signature: {}
          },
        }
      )
    }
  }
}));

const validCredsFromMockIdServerIssuer = {
  creds: {
     customFields: [
        "0x0000000000000000000000000000000000000000000000000000000000000002",
        "0x157c1cd1baa1b476d697324439e45668c701068235271bc7f1ab41dd8ee73b85"
     ],
     iat: "0x00000000000000000000000000000000000000000000000000000000e7bde8ce",
     issuerAddress: "0x2a4879fe71757462a1a7e103646bbc3349a15bd52b115153791da39b5e376bb0",
     scope: "0x0000000000000000000000000000000000000000000000000000000000000000",
     secret: "0x15d564dba873366c3f0926524d4340bdcac904aab6a0a63ed13e6e2788c7dadd",
     serializedAsPreimage: [
        "0x2a4879fe71757462a1a7e103646bbc3349a15bd52b115153791da39b5e376bb0",
        "0x15d564dba873366c3f0926524d4340bdcac904aab6a0a63ed13e6e2788c7dadd",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
        "0x157c1cd1baa1b476d697324439e45668c701068235271bc7f1ab41dd8ee73b85",
        "0x00000000000000000000000000000000000000000000000000000000e7bde8ce",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
     ]
  },
  leaf: "0x17cc9aa1178d8e6a44c1774a9721f0ed5abce7a6ccf49ad6a03862a2d7ab9f12",
  metadata: {
     derivedCreds: {
        addressHash: {
           derivationFunction: "poseidon",
           inputFields: [
              "rawCreds.city",
              "rawCreds.subdivision",
              "rawCreds.zipCode",
              "derivedCreds.streetHash.value"
           ],
           value: "17213269051117435556051219503291950994606806381770319609350243626357241456114"
        },
        nameDobCitySubdivisionZipStreetExpireHash: {
           derivationFunction: "poseidon",
           inputFields: [
              "derivedCreds.nameHash.value",
              "rawCreds.birthdate",
              "derivedCreds.addressHash.value",
              "rawCreds.expirationDate"
           ],
           value: "9717857759462285186569434641069066147758238358576257073710143504773145901957"
        },
        nameHash: {
           derivationFunction: "poseidon",
           inputFields: [
              "rawCreds.firstName",
              "rawCreds.middleName",
              "rawCreds.lastName"
           ],
           value: "19262609406206667575009933537774132284595466745295665914649892492870480170698"
        },
        streetHash: {
           derivationFunction: "poseidon",
           inputFields: [
              "rawCreds.streetNumber",
              "rawCreds.streetName",
              "rawCreds.streetUnit"
           ],
           value: "17873212585024051139139509857141244009065298068743399015831877928660937058344"
        }
     },
     fieldsInLeaf: [
        "issuer",
        "secret",
        "rawCreds.countryCode",
        "derivedCreds.nameDobCitySubdivisionZipStreetExpireHash.value",
        "rawCreds.completedAt",
        "scope"
     ],
     rawCreds: {
        birthdate: "1950-01-01",
        city: "New York",
        completedAt: "2022-09-16",
        countryCode: 2,
        expirationDate: "2023-09-16",
        firstName: "Satoshi",
        lastName: "Nakamoto",
        middleName: "Bitcoin",
        streetName: "Main St",
        streetNumber: 123,
        streetUnit: "",
        subdivision: "NY",
        zipCode: 12345
     }
  },
  pubkey: {
     x: "0x21ab92e8eab6c3c4769cef7bf4361b3ddb77957d4bbae1fa1caca8f3242ef505",
     y: "0x2c408e3e54b72cc93aa5b5b22e7b05f09bdb1ddbf64fa844b21d7028bb9a430a"
  },
  signature: {
     R8: {
        x: "0x044d557abf4bdfd742d6ec02ddf41b9fbff53d0832de12eb1946bcb0115429b4",
        y: "0x1c493c0f628c96678bbb099e77a5d5f37b67e3202cbae2ad87dad8900872b148"
     },
     S: "0x501e2ffce9f9ad855a9d0315449fcd551cbd80d722f28a79bfb0103d3472527"
  }
}

// TODO: The test that must be written involves testing that, even if the FinalStep component
// renders multiple times within a short period of time (i.e., less than ~500ms)--resulting
// in the useEffect(() => ..., []) being called multiple times--only a single leaf and secret
// are computed, added to creds, and submitted to the relayer.

// TODO: Test that, if fetch(<retrievalEndpoint>) returns creds that are also returned by
// reloadCreds(), then credsThatWillBeOverwritten and confirmationModalVisible are all set 
// to the correct values and that calling onConfirmOverwrite or onDenyOverwrite results in
// the correct state changes.

// TODO: Test that, if fetch(<retrievalEndpoint>) returns creds that are NOT returned by
// reloadCreds(), then credsThatWillBeOverwritten and confirmationModalVisible are not
// changed.

describe('useStoreCredentialsState', () => {
  test('Calls setCredsForAddLeaf with new credentials, without updating confirmation-related variables, if all dependency hooks and APIs return expected values', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() => {
      return Promise.resolve({
        status: 200,
        json: async () => Promise.resolve(validCredsFromMockIdServerIssuer),
        text: () => Promise.resolve(''),
      });
    });

    const searchParams = new URLSearchParams({ retrievalEndpoint: 'MTIz' });
    let setCredsForAddLeafCalled = false;
    const setCredsForAddLeaf = (creds) => {
      setCredsForAddLeafCalled = true;
    };
    const { result, waitForNextUpdate } = renderHook(() => useStoreCredentialsState({ 
      searchParams,
      setCredsForAddLeaf
    }));

    // assert initial state
    expect(result.current.credsThatWillBeOverwritten).toBe(undefined);
    expect(result.current.declinedToStoreCreds).toBe(false);
    expect(result.current.confirmationModalVisible).toBe(false);
    expect(result.current.error).toBe(undefined);
    expect(result.current.status).toBe('loading');

    await waitForNextUpdate();

    // assert new state
    expect(setCredsForAddLeafCalled).toBe(true);
    expect(result.current.credsThatWillBeOverwritten).toBe(undefined);
    expect(result.current.declinedToStoreCreds).toBe(false);
    expect(result.current.confirmationModalVisible).toBe(false);
    expect(result.current.error).toBe(undefined);
    expect(result.current.status).toBe('success');

    // // add second value
    // act(() => {
    //   result.current.set('two')
    // })

    // assert new state
    // expect(setCredsForAddLeafCalled).toBe(true);
    // expect(status).toBe('success');

    // // add third value
    // act(() => {
    //   result.current.set('three')
    // })

    // // assert new state
    // expect(result.current.canUndo).toBe(true)
    // expect(result.current.canRedo).toBe(false)
    // expect(result.current.past).toEqual(['one', 'two'])
    // expect(result.current.present).toEqual('three')
    // expect(result.current.future).toEqual([])

    // // undo
    // act(() => {
    //   result.current.undo()
    // })

    // // assert "undone" state
    // expect(result.current.canUndo).toBe(true)
    // expect(result.current.canRedo).toBe(true)
    // expect(result.current.past).toEqual(['one'])
    // expect(result.current.present).toEqual('two')
    // expect(result.current.future).toEqual(['three'])

    // // undo again
    // act(() => {
    //   result.current.undo()
    // })

    // // assert "double-undone" state
    // expect(result.current.canUndo).toBe(false)
    // expect(result.current.canRedo).toBe(true)
    // expect(result.current.past).toEqual([])
    // expect(result.current.present).toEqual('one')
    // expect(result.current.future).toEqual(['two', 'three'])

    // // redo
    // act(() => {
    //   result.current.redo()
    // })

    // // assert undo + undo + redo state
    // expect(result.current.canUndo).toBe(true)
    // expect(result.current.canRedo).toBe(true)
    // expect(result.current.past).toEqual(['one'])
    // expect(result.current.present).toEqual('two')
    // expect(result.current.future).toEqual(['three'])

    // // add fourth value
    // act(() => {
    //   result.current.set('four')
    // })

    // // assert final state (note the lack of "third")
    // expect(result.current.canUndo).toBe(true)
    // expect(result.current.canRedo).toBe(false)
    // expect(result.current.past).toEqual(['one', 'two'])
    // expect(result.current.present).toEqual('four')
    // expect(result.current.future).toEqual([])
  })
})