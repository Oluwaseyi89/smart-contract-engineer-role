"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, zeroAddress } from "viem";
import { QUEST_ESCROW_ADDRESS } from "@/lib/contracts/addresses";
import { questEscrowAbi, QUEST_STATUS_LABELS } from "@/lib/contracts/questEscrowAbi";

type QuestTuple = readonly [
  `0x${string}`,
  `0x${string}`,
  string,
  string,
  bigint,
  `0x${string}`,
  bigint,
  bigint,
  bigint,
  number,
  string,
];

export type QuestView = {
  id: bigint;
  poster: string;
  worker: string;
  title: string;
  description: string;
  reward: bigint;
  token: string;
  acceptDeadline: bigint;
  reviewPeriod: bigint;
  reviewDeadline: bigint;
  status: number;
  statusLabel: (typeof QUEST_STATUS_LABELS)[number];
  deliverableUri: string;
  isEth: boolean;
};

export function useQuestCount() {
  return useReadContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: questEscrowAbi,
    functionName: "questCount",
  });
}

export function useQuest(questId: bigint | undefined) {
  const { data, refetch, isLoading } = useReadContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: questEscrowAbi,
    functionName: "getQuest",
    args: questId !== undefined ? [questId] : undefined,
    query: { enabled: questId !== undefined },
  });

  const row = data as QuestTuple | undefined;
  const quest: QuestView | null =
    row && questId !== undefined
      ? {
          id: questId,
          poster: row[0],
          worker: row[1],
          title: row[2],
          description: row[3],
          reward: row[4],
          token: row[5],
          acceptDeadline: row[6],
          reviewPeriod: row[7],
          reviewDeadline: row[8],
          status: row[9],
          statusLabel: QUEST_STATUS_LABELS[row[9]] ?? "Open",
          deliverableUri: row[10],
          isEth: row[5].toLowerCase() === zeroAddress,
        }
      : null;

  return { quest, refetch, isLoading };
}

export function useQuestList() {
  const { data: count } = useQuestCount();
  const publicClient = usePublicClient();
  const [quests, setQuests] = useState<QuestView[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const total = count as bigint | undefined;
    if (!publicClient || !total || total === 0n) {
      setQuests([]);
      return;
    }
    setLoading(true);
    try {
      const items: QuestView[] = [];
      for (let id = 1n; id <= total; id++) {
        const data = (await publicClient.readContract({
          address: QUEST_ESCROW_ADDRESS,
          abi: questEscrowAbi,
          functionName: "getQuest",
          args: [id],
        })) as QuestTuple;
        items.push({
          id,
          poster: data[0],
          worker: data[1],
          title: data[2],
          description: data[3],
          reward: data[4],
          token: data[5],
          acceptDeadline: data[6],
          reviewPeriod: data[7],
          reviewDeadline: data[8],
          status: data[9],
          statusLabel: QUEST_STATUS_LABELS[data[9]] ?? "Open",
          deliverableUri: data[10],
          isEth: data[5].toLowerCase() === zeroAddress,
        });
      }
      setQuests(items.reverse());
    } finally {
      setLoading(false);
    }
  }, [publicClient, count]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { quests, loading, refresh };
}

function useWriteAndConfirm() {
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const pendingRef = useRef<{
    resolve: () => void;
    reject: (err: Error) => void;
  } | null>(null);

  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  useEffect(() => {
    if (!pendingRef.current) return;
    if (isSuccess) {
      pendingRef.current.resolve();
      pendingRef.current = null;
      setHash(undefined);
      return;
    }
    if (error) {
      pendingRef.current.reject(error instanceof Error ? error : new Error("Transaction failed"));
      pendingRef.current = null;
      setHash(undefined);
    }
  }, [isSuccess, error]);

  const sendAndConfirm = useCallback(
    async (request: Parameters<typeof writeContractAsync>[0]) => {
      const txHash = await writeContractAsync(request);
      setHash(txHash);
      return new Promise<void>((resolve, reject) => {
        pendingRef.current = { resolve, reject };
      });
    },
    [writeContractAsync]
  );

  return {
    sendAndConfirm,
    isPending: isWriting || isConfirming,
  };
}

export function useCreateQuest() {
  const { isConnected } = useAccount();
  const { sendAndConfirm, isPending } = useWriteAndConfirm();

  const createEthQuest = async (input: {
    title: string;
    description: string;
    rewardEth: string;
    acceptDeadline: Date;
    reviewPeriodHours: number;
  }) => {
    if (!isConnected) throw new Error("Connect MetaMask or another Web3 wallet first");

    const title = input.title.trim();
    const description = input.description.trim();
    if (!title) throw new Error("Title is required");
    if (!description) throw new Error("Description is required");

    const reward = parseEther(input.rewardEth);
    const acceptDeadline = BigInt(Math.floor(input.acceptDeadline.getTime() / 1000));
    const reviewPeriod = BigInt(Math.floor(input.reviewPeriodHours * 3600));

    await sendAndConfirm({
      address: QUEST_ESCROW_ADDRESS,
      abi: questEscrowAbi,
      functionName: "createQuest",
      args: [title, description, reward, acceptDeadline, reviewPeriod, zeroAddress],
      value: reward,
    });
  };

  return { createEthQuest, isPending };
}

export function useQuestActions(questId: bigint) {
  const { sendAndConfirm, isPending } = useWriteAndConfirm();

  const accept = async () => {
    await sendAndConfirm({
      address: QUEST_ESCROW_ADDRESS,
      abi: questEscrowAbi,
      functionName: "acceptQuest",
      args: [questId],
    });
  };
  const submit = async (deliverableUri: string) => {
    const value = deliverableUri.trim();
    if (!value) throw new Error("Deliverable URI is required");
    await sendAndConfirm({
      address: QUEST_ESCROW_ADDRESS,
      abi: questEscrowAbi,
      functionName: "submitWork",
      args: [questId, value],
    });
  };
  const approve = async () => {
    await sendAndConfirm({
      address: QUEST_ESCROW_ADDRESS,
      abi: questEscrowAbi,
      functionName: "approveAndPay",
      args: [questId],
    });
  };
  const claimTimeout = async () => {
    await sendAndConfirm({
      address: QUEST_ESCROW_ADDRESS,
      abi: questEscrowAbi,
      functionName: "claimTimeoutPayout",
      args: [questId],
    });
  };
  const cancel = async () => {
    await sendAndConfirm({
      address: QUEST_ESCROW_ADDRESS,
      abi: questEscrowAbi,
      functionName: "cancelQuest",
      args: [questId],
    });
  };
  const refund = async () => {
    await sendAndConfirm({
      address: QUEST_ESCROW_ADDRESS,
      abi: questEscrowAbi,
      functionName: "refundPoster",
      args: [questId],
    });
  };

  return { accept, submit, approve, claimTimeout, cancel, refund, isPending };
}
