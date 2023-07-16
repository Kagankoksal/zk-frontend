import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HoloAuthSigProvider } from "./context/HoloAuthSig";
import { HoloKeyGenSigProvider } from "./context/HoloKeyGenSig";
import { ProofMetadataProvider } from "./context/ProofMetadata";
import { CredsProvider } from "./context/Creds";
import { ProofsProvider } from "./context/Proofs";
import { Provider as WagmiProvider } from "wagmi";
import { wagmiClient } from "./wagmiClient";
import AccountConnectGate from "./gate/AccountConnectGate";
import SignatureGate from "./gate/SignatureGate";
import NetworkGate from "./gate/NetworkGate";
import { desiredChainId } from './constants'

export const queryClient = new QueryClient();

const connectWalletGateFn = (data) => {
	return !!data?.account?.address && !!data?.account?.connector;
};

const networkGateFn = (data) => {
	return data?.activeChain?.id === desiredChainId;
};

const signMessagesGateFn = (data) => {
	return !!data?.holoAuthSig && !!data?.holoAuthSigDigest && !!data?.holoKeyGenSig && !!data?.holoKeyGenSigDigest;
};

export function RootProvider({ children, connectWalletFallback, networkGateFallback, signMessagesFallback }) {
	return (
		<QueryClientProvider client={queryClient}>
			<WagmiProvider client={wagmiClient}>
				<HoloAuthSigProvider>
					<HoloKeyGenSigProvider>
						<AccountConnectGate gate={connectWalletGateFn} fallback={connectWalletFallback}>
							<NetworkGate gate={networkGateFn} fallback={networkGateFallback} >
								<SignatureGate gate={signMessagesGateFn} fallback={signMessagesFallback}>
									<CredsProvider>
										<ProofMetadataProvider>
											<ProofsProvider>
												{children}
											</ProofsProvider>
										</ProofMetadataProvider>
									</CredsProvider>
								</SignatureGate>
							</NetworkGate>
						</AccountConnectGate>
					</HoloKeyGenSigProvider>
				</HoloAuthSigProvider>
			</WagmiProvider>
		</QueryClientProvider>
	);
}
