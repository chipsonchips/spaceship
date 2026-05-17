import { useCallback, useEffect, useState } from "react";
import { useWalletClient, usePublicClient, useChainId } from "wagmi";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { getChainConfig } from "@/lib/chains";
import ERC20_ABI from "@/abis/usdc.json";

export default function useUSDC() {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const [balance, setBalance] = useState<number | null>(null);

  const chainConfig = getChainConfig(chainId);
  const usdcAddress = chainConfig.usdcAddress;
  const houseAddress = chainConfig.gameContractAddress;
  const decimals = 6;

  const approveUSDC = useCallback(
    async (spender: string, amount: number | bigint) => {
      if (!walletClient?.account?.address || !publicClient) {
        throw new Error("Wallet not connected");
      }
      const amountInWei =
        typeof amount === "bigint"
          ? amount
          : parseUnits(amount.toString(), decimals);

      const hash = await walletClient.writeContract({
        address: usdcAddress,
        abi: ERC20_ABI as any,
        functionName: "approve",
        args: [spender, amountInWei],
        account: walletClient.account.address,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      return hash;
    },
    [walletClient, publicClient, usdcAddress, decimals]
  );

  const checkAllowance = useCallback(
    async (owner: string, spender: string) => {
      if (!publicClient) return 0;
      try {
        const allowance = await publicClient.readContract({
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [owner, spender],
        });
        return Number(allowance) / 10 ** decimals;
      } catch {
        return 0;
      }
    },
    [publicClient, usdcAddress, decimals]
  );

  const fetchBalance = useCallback(async () => {
    if (!address || !publicClient) return null;
    try {
      const raw = await publicClient.readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      return Number(raw) / 10 ** decimals;
    } catch (err) {
      console.error("Error fetching balance:", err);
      return null;
    }
  }, [address, publicClient, usdcAddress, decimals]);

  useEffect(() => {
    if (!address || !publicClient) {
      setBalance(null);
      return;
    }

    let isMounted = true;

    const updateBalance = async () => {
      try {
        const raw = await publicClient.readContract({
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address],
        });
        if (isMounted) {
          setBalance(Number(raw) / 10 ** decimals);
        }
      } catch (err) {
        console.error("Error in balance update loop:", err);
        if (isMounted) {
          setBalance(null);
        }
      }
    };

    updateBalance();

    const interval = setInterval(updateBalance, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [address, publicClient, usdcAddress, decimals]);

  const transferUSDC = useCallback(
    async (to: string, amount: number) => {
      if (!walletClient) throw new Error("No wallet client available");
      const value = parseUnits(String(amount), decimals);
      const hash = await walletClient.writeContract({
        address: usdcAddress,
        abi: ERC20_ABI as any,
        functionName: "transfer",
        args: [to, value],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        fetchBalance().then((b) => setBalance(b));
      }
      return hash as `0x${string}`;
    },
    [walletClient, publicClient, usdcAddress, decimals, fetchBalance]
  );

  return {
    walletBalance: balance,
    walletAddress: address,
    refreshBalance: fetchBalance,
    approveUSDC,
    checkAllowance,
    usdcAddress,
    houseAddress,
    transferUSDC,
    decimals,
    chainConfig,
  };
}
