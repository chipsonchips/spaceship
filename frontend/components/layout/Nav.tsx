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
import { Menu, X, Settings } from "lucide-react";
import { useGameContext } from "@/context/GameContext";
import ChainSwitcher from "@/components/common/ChainSwitcher";
import useChainInfo from "@/hooks/useChainInfo";
import useUSDC from "@/hooks/useUSDC";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useUsername } from "@/hooks/useUsername";
import SettingsModal from "@/components/game/SettingsModal";

const formatAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const Nav = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { roundData } = useGameContext();
  const { address, isConnected } = useAccount();
  const { chainLabel } = useChainInfo();
  const { walletBalance } = useUSDC();
  const env = useEnvironment();
  const { connect } = useConnect();
  const { username } = useUsername(address);

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

  const renderWalletControls = () => {
    if (env === "minipay") {
      if (!isConnected || !address) {
        return (
          <div className="px-3 py-1.5 rounded-md bg-slate-800/80 border border-emerald-500/30 text-xs font-medium text-emerald-400">
            Connecting...
          </div>
        );
      }
      const displayName = username || formatAddress(address);
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/80 border border-emerald-500/30 text-xs font-medium text-white shadow-[0_0_10px_rgba(16,185,129,0.1)]">
          <div className="h-4 w-4 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <span>{displayName}</span>
        </div>
      );
    }

    if (!isConnected) {
      return (
        <Wallet>
          <ConnectWallet className="flex items-center justify-center gap-2 px-4 py-2 min-h-[36px] rounded-lg bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all text-xs font-bold font-orbitron tracking-wider text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            CONNECT
          </ConnectWallet>
        </Wallet>
      );
    }

    return (
      <Wallet>
        <ConnectWallet className="flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-lg bg-slate-800/80 border border-emerald-500/30 hover:border-emerald-400/60 transition-all text-xs font-medium text-white shadow-inner">
          <Avatar className="h-5 w-5 rounded-full border border-emerald-500/50" />
          <span
            className="onchainkit_name font-orbitron text-xs tracking-wider"
            style={{ display: username ? "none" : "inline" }}
          >
            <Name />
          </span>
          {username && (
            <span className="font-orbitron tracking-wider">{username}</span>
          )}
        </ConnectWallet>
        <WalletDropdown className="bg-slate-900 border border-emerald-500/30 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <Identity className="px-4 pt-3 pb-2 font-inter" hasCopyAddressOnClick>
            <Avatar className="border border-emerald-500/50" />
            <Name className="text-white font-medium" />
            <Address className="text-slate-400 text-xs" />
            <EthBalance className="text-emerald-400 text-xs font-courier" />
          </Identity>
          <WalletDropdownDisconnect className="hover:bg-red-500/10 text-red-400 font-medium text-sm transition-colors" />
        </WalletDropdown>
      </Wallet>
    );
  };

  if (!mounted) return <header className="h-[60px]"></header>;

  return (
    <header
      className={`relative z-50 transition-all duration-500 ease-out bg-transparent ${
        shouldHide
          ? "-translate-y-full opacity-0 absolute w-full"
          : "translate-y-0 opacity-100 px-3 sm:px-6 py-2.5"
      }`}
    >
      <div className="flex items-center justify-between pointer-events-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 transition-transform group-hover:scale-110">
            <Image
              src="/logo.png"
              alt="Aviator Logo"
              fill
              className="object-contain drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]"
            />
          </div>
          <span className="font-black text-lg sm:text-xl text-white font-orbitron uppercase tracking-widest flex flex-col leading-none hidden sm:block">
            <span>
              AVIA<span className="text-emerald-500">TOR</span>
            </span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-800/50 border border-slate-600/50 hover:border-emerald-500/50 hover:text-emerald-400 transition-all text-xs font-bold text-slate-300 font-orbitron uppercase tracking-wide"
          >
            Leaderboard
          </Link>
          {isConnected && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-600/50 text-xs font-courier">
              <span className="text-slate-400 font-bold uppercase">
                Balance:
              </span>
              <span className="text-emerald-400 font-bold drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]">
                {(walletBalance || 0).toFixed(2)} USDC
              </span>
            </div>
          )}
          <ChainSwitcher />
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center p-2 rounded-lg bg-slate-800/50 border border-slate-600/50 hover:border-emerald-500/50 hover:bg-slate-700/50 transition-all text-slate-300 hover:text-emerald-400"
            title="Game Settings"
          >
            <Settings size={20} />
          </button>
          {renderWalletControls()}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          {!isConnected && renderWalletControls()}

          <button
            className="p-1.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X size={20} className="text-emerald-400" />
            ) : (
              <Menu size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-[calc(100%+1px)] left-0 w-full bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 p-4 flex flex-col gap-3 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] z-50 animate-[slideDown_0.2s_ease-out]">
          <Link
            href="/leaderboard"
            className="flex items-center justify-center px-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-600/50 hover:border-emerald-500/60 transition-all text-sm font-bold text-emerald-100 font-orbitron uppercase tracking-widest"
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="mr-2">🏆</span> Leaderboard
          </Link>

          {isConnected && (
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-900/10 border border-emerald-500/20 text-sm font-courier shadow-inner">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                Balance
              </span>
              <span className="text-emerald-400 font-black text-sm drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                {(walletBalance || 0).toFixed(2)} USDC
              </span>
            </div>
          )}

          <button
            onClick={() => {
              setIsSettingsOpen(true);
              setIsMenuOpen(false);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-600/50 hover:border-emerald-500/60 transition-all text-sm font-bold text-emerald-100 font-orbitron uppercase tracking-widest w-full"
          >
            <Settings size={18} />
            Settings
          </button>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="flex justify-center bg-slate-800/40 rounded-lg p-1.5 border border-slate-700/50">
              <ChainSwitcher />
            </div>
            <div className="flex justify-center bg-slate-800/40 rounded-lg p-1.5 border border-slate-700/50 h-[46px] items-center">
              {isConnected && renderWalletControls()}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </header>
  );
};

export default Nav;
