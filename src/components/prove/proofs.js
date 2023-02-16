import { useNavigate } from "react-router-dom";
// import residencyStoreABI from "../constants/abi/zk-contracts/ResidencyStore.json";
// import antiSybilStoreABI from "../constants/abi/zk-contracts/AntiSybilStore.json";
import { Oval } from "react-loader-spinner";
import { Success } from "../success";
import { truncateAddress } from "../../utils/ui-helpers";
import RoundedWindow from "../RoundedWindow";
import useProofsState from "./useProofsState";

const ErrorScreen = ({ children }) => (
	<div className="x-container w-container">{children}</div>
);

const CustomOval = () => (
	<Oval
		height={10}
		width={10}
		color="#464646"
		wrapperStyle={{ marginLeft: "5px" }}
		wrapperClass=""
		visible={true}
		ariaLabel="oval-loading"
		secondaryColor="#01010c"
		strokeWidth={2}
		strokeWidthSecondary={2}
	/>
)

const LoadingProofsButton = (props) => (
	<button className="x-button" onClick={props.onClick}>
		<div
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			Proof Loading
			<CustomOval />
		</div>
	</button>
);

const Proofs = () => {
	const navigate = useNavigate();
	const {
    params,
    proofs,
    accountReadyAddress,
    sortedCreds,
    proof,
    submissionConsent,
    setSubmissionConsent,
    submitProofThenStoreMetadataQuery,
    proofSubmissionSuccess,
    error,
    customError,
  } = useProofsState();

	if (proofSubmissionSuccess) {
		if (params.callback) window.location.href = `https://${params.callback}`;
		if (window.localStorage.getItem('register-proofType')) {
			navigate(`/register?credentialType=${window.localStorage.getItem('register-credentialType')}&proofType=${window.localStorage.getItem('register-proofType')}&callback=${window.localStorage.getItem('register-callback')}`)
		}
		return <Success title="Success" />;
	}
	if (customError) {
		return <ErrorScreen>{customError}</ErrorScreen>;
	}
	return (
		<RoundedWindow>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<h2>Prove {proofs[params.proofType].name}</h2>
				<div className="spacer-med" />
				<br />
				{error?.message ? (
					<p>Error: {error.message}</p>
				) : sortedCreds ? (
					<p>
						This will give you,
						<code> {truncateAddress(accountReadyAddress)} </code>, a{" "}
						<a
							target="_blank"
							rel="noreferrer"
							href="https://cointelegraph.com/news/what-are-soulbound-tokens-sbts-and-how-do-they-work"
							style={{ color: "#fdc094" }}
						>
							soul-bound token
						</a>{" "}
						(SBT) showing only this one attribute of you:{" "}
						<code>{proofs[params.proofType].name}</code>. It may take 5-15
						seconds to load.
					</p>
				) : (
					<p>
						&nbsp;Note: You cannot generate proofs before minting a holo. If
						you have not already, please{" "}
						<a href="/mint" style={{ color: "#fdc094" }}>
							mint your holo
						</a>
						.
					</p>
				)}
				<div className="spacer-med" />
				<br />
				{sortedCreds ? (
					proof ? (
						<button
							className="x-button"
							onClick={() => setSubmissionConsent(true)}
						>
							{submissionConsent && submitProofThenStoreMetadataQuery.isFetching
								? (
										<div
											style={{
												display: "flex",
												justifyContent: "center",
												alignItems: "center",
											}}
										>
											Submitting
											<CustomOval />
										</div>
									)
								: "Submit proof"}
						</button>
					) : (
						<LoadingProofsButton />
					)
				) : (
					""
				)}
			</div>
		</RoundedWindow>
	);
};

export default Proofs;