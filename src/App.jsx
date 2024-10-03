// import { Box } from "@radix-ui/themes";
// import Layout from "./components/Layout";
// import CreateProposalModal from "./components/CreateProposalModal";
// import Proposals from "./components/Proposals";
// import useContract from "./hooks/useContract";
// import { useCallback, useEffect, useState } from "react";
// import { Contract } from "ethers";
// import useRunners from "./hooks/useRunners";
// import { Interface } from "ethers";
// import ABI from "./ABI/proposal.json";

// const multicallAbi = [
//     "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)",
// ];

// function App() {
//     const readOnlyProposalContract = useContract(true);
//     const { readOnlyProvider } = useRunners();
//     const [proposals, setProposals] = useState([]);

//     const fetchProposals = useCallback(async () => {
//         if (!readOnlyProposalContract) return;

//         const multicallContract = new Contract(
//             import.meta.env.VITE_MULTICALL_ADDRESS,
//             multicallAbi,
//             readOnlyProvider
//         );

//         const itf = new Interface(ABI);

//         try {
//             const proposalCount = Number(
//                 await readOnlyProposalContract.proposalCount()
//             );

//             const proposalsIds = Array.from(
//                 { length: proposalCount - 1 },
//                 (_, i) => i + 1
//             );

//             const calls = proposalsIds.map((id) => ({
//                 target: import.meta.env.VITE_CONTRACT_ADDRESS,
//                 callData: itf.encodeFunctionData("proposals", [id]),
//             }));

//             const responses = await multicallContract.tryAggregate.staticCall(
//                 true,
//                 calls
//             );

//             const decodedResults = responses.map((res) =>
//                 itf.decodeFunctionResult("proposals", res.returnData)
//             );

//             const data = decodedResults.map((proposalStruct) => ({
//                 description: proposalStruct.description,
//                 amount: proposalStruct.amount,
//                 minRequiredVote: proposalStruct.minVotesToPass,
//                 votecount: proposalStruct.voteCount,
//                 deadline: proposalStruct.votingDeadline,
//                 executed: proposalStruct.executed,
//             }));

//             setProposals(data);
//         } catch (error) {
//             console.log("error fetching proposals: ", error);
//         }
//     }, [readOnlyProposalContract, readOnlyProvider]);

//     useEffect(() => {
//         fetchProposals();
//     }, [fetchProposals]);

//     return (
//         <Layout>
//             <Box className="flex justify-end p-4">
//                 <CreateProposalModal />
//             </Box>
//             <Proposals proposals={proposals} />
//         </Layout>
//     );
// }

// export default App;


import { Box } from "@radix-ui/themes";
import Layout from "./components/Layout";
import CreateProposalModal from "./components/CreateProposalModal";
import Proposals from "./components/Proposals";
import useContract from "./hooks/useContract";
import { useCallback, useEffect, useState } from "react";
import { Contract } from "ethers";
import useRunners from "./hooks/useRunners";
import { Interface } from "ethers";
import ABI from "./ABI/proposal.json";

const multicallAbi = [
    "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)",
];

function App() {
    const readOnlyProposalContract = useContract(true);
    const { readOnlyProvider } = useRunners();
    const [proposals, setProposals] = useState([]);

    const fetchProposals = useCallback(async () => {
        if (!readOnlyProposalContract || !readOnlyProvider) {
            console.log("Contract or provider not available");
            return;
        }

        const multicallContract = new Contract(
            import.meta.env.VITE_MULTICALL_ADDRESS,
            multicallAbi,
            readOnlyProvider
        );

        const itf = new Interface(ABI);

        try {
            const proposalCount = await readOnlyProposalContract.proposalCount();
            console.log("Proposal count:", proposalCount.toString());

            if (proposalCount.toNumber() <= 1) {
                console.log("No proposals yet");
                setProposals([]);
                return;
            }

            const proposalsIds = Array.from(
                { length: proposalCount.toNumber() - 1 },
                (_, i) => i + 1
            );

            const calls = proposalsIds.map((id) => ({
                target: import.meta.env.VITE_CONTRACT_ADDRESS,
                callData: itf.encodeFunctionData("proposals", [id]),
            }));

            const responses = await multicallContract.tryAggregate.staticCall(
                true,
                calls
            );

            const decodedResults = responses.map((res) =>
                itf.decodeFunctionResult("proposals", res.returnData)
            );

            const data = decodedResults.map((proposalStruct, index) => ({
                id: proposalsIds[index].toString(),
                description: proposalStruct.description || "",
                recipient: proposalStruct.recipient || "",
                amount: proposalStruct.amount?.toString() || "0",
                votecount: proposalStruct.voteCount?.toString() || "0",
                deadline: proposalStruct.votingDeadline?.toString() || "0",
                minRequiredVote: proposalStruct.minVotesToPass?.toString() || "0",
                executed: proposalStruct.executed || false,
            }));

            console.log("Fetched proposals:", data);
            setProposals(data);
        } catch (error) {
            console.error("Error fetching proposals: ", error);
        }
    }, [readOnlyProposalContract, readOnlyProvider]);

    useEffect(() => {
        console.log("Effect running");
        fetchProposals();

        if (readOnlyProposalContract) {
            const filter = readOnlyProposalContract.filters.ProposalCreated();
            
            const handleNewProposal = (proposalId, description, recipient, amount, votingDeadline, minVotesToPass, event) => {
                console.log("New proposal created:", proposalId.toString());
                setProposals(prevProposals => [...prevProposals, {
                    id: proposalId.toString(),
                    description: description || "",
                    recipient: recipient || "",
                    amount: amount?.toString() || "0",
                    deadline: votingDeadline?.toString() || "0",
                    minRequiredVote: minVotesToPass?.toString() || "0",
                    votecount: "0",
                    executed: false
                }]);
            };

            readOnlyProposalContract.on(filter, handleNewProposal);

            return () => {
                readOnlyProposalContract.off(filter, handleNewProposal);
            };
        }
    }, [fetchProposals, readOnlyProposalContract]);

    return (
        <Layout>
            <Box className="flex justify-end p-4">
                <CreateProposalModal onProposalCreated={fetchProposals} />
            </Box>
            <Proposals proposals={proposals} />
        </Layout>
    );
}

export default App;