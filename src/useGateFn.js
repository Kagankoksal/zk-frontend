export function useGateFn(gate) {
	const { data: account } = useAccount();
	const {
		litAuthSig, litAuthSigIsError, litAuthSigIsLoading, litAuthSigIsSuccess, signLitAuthMessage, clearLitAuthSig,
	} = useLitAuthSig();
	const {
		signHoloAuthMessage, holoAuthSigIsError, holoAuthSigIsLoading, holoAuthSigIsSuccess, holoAuthSig, holoAuthSigDigest, clearHoloAuthSig,
	} = useHoloAuthSig();
	const {
		signHoloKeyGenMessage, holoKeyGenSigIsError, holoKeyGenSigIsLoading, holoKeyGenSigIsSuccess, holoKeyGenSig, holoKeyGenSigDigest, clearHoloKeyGenSig,
	} = useHoloKeyGenSig();

	useEffect(
		() => {
			if (!account?.address || !account?.connector)
				return;
			if (!litAuthSig && !litAuthSigIsLoading && !litAuthSigIsSuccess) {
				signLitAuthMessage().catch((err) => console.error(err));
			}
			if (!litAuthSigIsLoading &&
				!holoAuthSig &&
				!holoAuthSigIsLoading &&
				!holoAuthSigIsSuccess) {
				signHoloAuthMessage().catch((err) => console.error(err));
			}
			if (!holoAuthSigIsLoading &&
				!litAuthSigIsLoading &&
				!holoKeyGenSig &&
				!holoKeyGenSigIsLoading &&
				!holoKeyGenSigIsSuccess) {
				signHoloKeyGenMessage().catch((err) => console.error(err));
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			account,
			litAuthSigIsError,
			litAuthSigIsLoading,
			litAuthSigIsSuccess,
			holoAuthSigIsError,
			holoAuthSigIsLoading,
			holoAuthSigIsSuccess,
			holoKeyGenSigIsError,
			holoKeyGenSigIsLoading,
			holoKeyGenSigIsSuccess,
		]
	);

	useEffect(() => {
		if (!account?.address || !account?.connector)
			return;
		// Check that sigs are from account. If they aren't, re-request them
		if (litAuthSig && litAuthSig.address !== account.address) {
			console.log("account changed. Re-retrieving litAuthSig");
			clearLitAuthSig();
			signLitAuthMessage().catch((err) => console.error(err));
		}
		if (holoAuthSig &&
			ethers.utils.verifyMessage(holonymAuthMessage, holoAuthSig) !==
			account.address) {
			console.log("account changed. Re-retrieving holoAuthSig");
			clearHoloAuthSig();
			signHoloAuthMessage().catch((err) => console.error(err));
		}
		if (holoKeyGenSig &&
			ethers.utils.verifyMessage(holonymKeyGenMessage, holoKeyGenSig) !==
			account.address) {
			console.log("account changed. Re-retrieving holoKeyGenSig");
			clearHoloKeyGenSig();
			signHoloKeyGenMessage().catch((err) => console.error(err));
		}
	}, [account]);

	const mainDivStyles = {
		position: "relative",
		paddingTop: "100px",
		width: "100%",
		height: "90%",
		display: "flex",
		alignItems: "center",
		justifyContent: "start",
		flexDirection: "column",
	};
	return gate(mainDivStyles);
}
