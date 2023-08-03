import { useEffect } from "react";
import { useNetwork } from "wagmi";
import { desiredChainId } from '../constants'

export default function useNetworkGate(gate) {
	const {
    activeChain,
    chains,
    data,
    error,
    isError,
    isIdle,
    isLoading,
    isSuccess,
    switchNetwork,
    switchNetworkAsync,
  } = useNetwork({
    chainId: desiredChainId
  });

	return gate({ activeChain });
}
