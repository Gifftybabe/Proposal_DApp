import { useCallback, useState, useEffect, useMemo } from "react";
// import { toast } from "react-toastify";
import useContract from "./useContract";
// import { useAppKitAccount } from "@reown/appkit/react";
// import { useAppKitNetwork } from "@reown/appkit/react";
// import { liskSepoliaNetwork } from "../connection";
// import { parseEther } from "ethers";
import { Contract, Interface } from "ethers";
import ABI from "../ABI/proposal.json"
import useRunners from "./useRunners";

const multicallAbi = [
    "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)",
];

const useFetchProposals = () => {
    const contract = useContract();
    const { readOnlyProvider } = useRunners()

    const [proposals, setProposals] = useState([]);


    const itf = useMemo(() => new Interface(ABI), []);
    const fetchProposals = useCallback(async () => {
        if (!contract) return;
        const proposalCount = Number(
            await contract.proposalCount()
        );
        const multicallContract = new Contract(
            import.meta.env.VITE_MULTICALL_ADDRESS,
            multicallAbi,
            readOnlyProvider
        );


        try {
            

            const proposalsIds = Array.from(
                { length: proposalCount - 1 },
                (_, i) => i + 1
            );

            const calls = proposalsIds.map((id) => ({
                target: import.meta.env.VITE_CONTRACT_ADDRESS,
                callData: itf.encodeFunctionData("proposals", [id]),
            }));

            console.log("Calls:::",calls)

            const responses = await multicallContract.tryAggregate.staticCall(
                true,
                calls
            );

            const decodedResults = responses.map((res) =>
                itf.decodeFunctionResult("proposals", res.returnData)
            );

            const data = decodedResults.map((proposalStruct, index) => ({
                proposalId:proposalsIds[index],
                description: proposalStruct.description,
                amount: proposalStruct.amount,
                minRequiredVote: proposalStruct.minVotesToPass,
                votecount: proposalStruct.voteCount,
                deadline: proposalStruct.votingDeadline,
                executed: proposalStruct.executed,
            }));

            setProposals(data);
        } catch (error) {
            console.log("error fetching proposals: ", error);
        }
    }, [contract, readOnlyProvider]);

    useEffect(() => {
        fetchProposals();

        const proposalFilter = contract.filters.ProposalCreated();
        const votedFilter = contract.filters.Voted();

        // contract.on(proposalFilter, (event) => {
        //     console.log("EVENT", event)
        //     console.log("Args", event.args)
        // })
        contract.on(proposalFilter, fetchProposals)
        contract.on(votedFilter, fetchProposals)

        return () => {
            contract.removeAllListeners(proposalFilter, fetchProposals )
            contract.removeAllListeners(votedFilter, fetchProposals)
        }
    }, [itf, contract]);

    return { proposals }
};

export default useFetchProposals;