"use client";

import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Identity,
  Avatar,
  Name,
  Address,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useGameContext } from "@/context/GameContext";
import ChainSwitcher from "@/components/ChainSwitcher";
import useChainInfo from "@/hooks/useChainInfo";
import { useEnvironment } from "@/hooks/useEnvironment";

const isMobile = () => {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 500;
};

const formatAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const Nav = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { roundData } = useGameContext();
  const { address, isConnected } = useAccount();
  const { chainLabel, usdcBalance } = useChainInfo();
  const env = useEnvironment();
  const { connect } = useConnect();

  useEffect(() => {
    setMounted(true);
  }, []);

  // MiniPay Auto-Connect Logic
  useEffect(() => {
    if (env === "minipay" && !isConnected) {
      connect({ connector: injected({ target: "metaMask" }) });
    }
  }, [env, isConnected, connect]);

  const isFlying = roundData?.phase === "FLYING";

  const hasActiveBets = useMemo(() => {
    if (!address || !roundData?.players) return false;
    return roundData.players.some(
      (player) => player.address.toLowerCase() === address.toLowerCase(),
    );
  }, [address, roundData?.players]);

  const shouldHide = isFlying && !isConnected && !hasActiveBets;

  // Don't render wallet-dependent content until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <header className="px-4 py-3 relative z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Plane"
              width={48}
              height={48}
              className="w-12 h-12 hidden sm:block"
            />
            {isMobile() ? null : (
              <span className="font-bold text-xl text-red-800 font-orbitron uppercase tracking-wider">
                Aviator
              </span>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Component to render Wallet based on Environment
  const renderWalletControls = () => {
    if (env === "minipay") {
      // In MiniPay, display native UI instead of OnchainKit to resolve dependency usage conditions
      if (!isConnected || !address) {
        return (
          <div className="px-4 py-2 rounded-lg bg-slate-800/50 border border-green-500/30 transition-colors text-sm font-medium text-white">
            Connecting MiniPay...
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-green-500/30 text-sm font-medium text-white shadow shadow-green-500/10">
          <div className="h-6 w-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 mr-1" />
          <span>{formatAddress(address)}</span>
        </div>
      );
    }

    // Default Desktop/Base OnchainKit controls
    return (
      <Wallet>
        <ConnectWallet className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-green-500/30 hover:bg-green-500/10 hover:border-green-400/50 transition-colors text-sm font-medium text-white h-auto leading-none">
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address />
            <EthBalance />
          </Identity>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    );
  };

  return (
    <header
      className={`px-4 py-3 relative z-50 transition-all duration-500 ease-in-out ${
        shouldHide ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Plane"
            width={48}
            height={48}
            className="w-12 h-12 hidden sm:block"
          />
          {isMobile() ? null : (
            <span className="font-bold text-xl text-red-800 font-orbitron uppercase tracking-wider">
              Aviator
            </span>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-green-500/30 hover:border-green-400/50 transition-colors text-sm font-medium text-white font-orbitron uppercase tracking-wide"
          >
            Leaderboard
          </Link>
          {isConnected && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-green-500/30 text-sm font-courier">
              <span className="text-gray-400">Balance:</span>
              <span className="text-green-400 font-medium">
                {usdcBalance.toFixed(2)} USDC
              </span>
            </div>
          )}
          <ChainSwitcher />
          {renderWalletControls()}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-gray-300 hover:text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-black/90 border-b border-red-500/30 p-4 flex flex-col gap-3">
          <Link
            href="/leaderboard"
            className="flex items-center justify-center px-4 py-2 rounded-lg bg-slate-800/50 border border-green-500/30 hover:border-green-400/50 transition-colors text-sm font-medium text-white font-orbitron uppercase tracking-wide"
            onClick={() => setIsMenuOpen(false)}
          >
            Leaderboard
          </Link>
          {isConnected && (
            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-green-500/30 text-sm font-courier">
              <span className="text-gray-400">Balance:</span>
              <span className="text-green-400 font-medium">
                {usdcBalance.toFixed(2)} USDC
              </span>
            </div>
          )}
          <div className="flex justify-center">
            <ChainSwitcher />
          </div>
          <div className="flex justify-center">{renderWalletControls()}</div>
        </div>
      )}
    </header>
  );
};

export default Nav;
