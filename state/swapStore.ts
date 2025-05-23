"use client";
import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import {
  Prices,
  SwapActions,
  SwapState,
  Token,
  TokenDetail,
} from "@/lib/types";
import {
  DEFAULT_BUY_TOKEN,
  DEFAULT_SELL_TOKEN,
  defaultChainId,
  MAINNET_TOKENS,
  MAINNET_TOKENS_BY_SYMBOL,
} from "@/lib/constants";
import { fetchTokenBalance } from "@/services/getTokenBalance";
import { formatDigits } from "@/lib/utils";
import {
  getTokenUSDPrice,
  getUSDValue,
  getUSDValueSync,
  updatePrices,
} from "@/services/priceFeed";
import { usePriceState, usePriceStore } from "./priceStore";
import { useAccountStore } from "./accountStore";
import { Provider } from "ethers";

// Unified Zustand Store
export const useSwapStore = create<SwapState & SwapActions>((set, get) => ({
  tokens: MAINNET_TOKENS,
  // Initial State
  TokenB: DEFAULT_BUY_TOKEN(defaultChainId)?.toUpperCase(),
  TokenA: DEFAULT_SELL_TOKEN(defaultChainId)?.toUpperCase(),
  chartActiveToken: DEFAULT_SELL_TOKEN(defaultChainId)?.toUpperCase(),
  tokensWithBalances: [],
  TokenBAmount: "",
  tradeDirection: "sell",
  TokenAAmount: "",
  slippage: 0.5,
  currentSellAsset:
    MAINNET_TOKENS_BY_SYMBOL[DEFAULT_SELL_TOKEN(defaultChainId)?.toLowerCase()],
  currentBuyAsset:
    MAINNET_TOKENS_BY_SYMBOL[DEFAULT_BUY_TOKEN(defaultChainId)?.toLowerCase()],
  selectorOpen: false,
  isWalletConnected: false,
  tokenABalance: "0",
  tokenBBalance: "0",
  loadingBalances: false,
  deadline: 20,
  transactionButtonText: "Swap",
  isSwapping: false,
  quoteLoading: false,
  needsApproval: false,
  isApproving: false,
  minAmountOut: {
    raw: null,
    formatted: null,
  },
  quoteAmount: null,
  estimatedFees: {
    estimatedFee: null,
    formatedEstimatedFee: null,
  },
  exceedsBalanceError: false,
  priceImpact: null,
  fee: null,
  TokenAUsdValue: null,
  TokenBUsdValue: null,
  TokenAUsdPrice: null,
  TokenBUsdPrice: null,
  prices: {},
  chartFlag: false,

  // Actions
  setTokenB: (token) =>
    set((state) => ({
      TokenB: token,
      TokenA: state.TokenA === token ? "" : state.TokenA,
      TokenBUsdPrice: null,
      TokenBUsdValue: null,
    })),
  setTokenA: (token) =>
    set((state) => ({
      TokenA: token,
      TokenB: state.TokenB === token ? "" : state.TokenB,
      TokenAUsdPrice: null,
      TokenAUsdValue: null,
    })),

  setPrices: (prices: Prices) => set({ prices }),

  setTokenBAmount: (amount) => {
    const state = get();
    const token = state.TokenB;
    const pricesStores = usePriceStore.getState();
    const usdValue = amount
      ? pricesStores.getUSDValueSync(amount, token)
      : null;
    set({
      TokenBAmount: formatDigits(amount),
      TokenBUsdValue: usdValue,
    });

    (async () => {
      if (amount) {
        try {
          const freshUsdValue = await pricesStores.getUSDValue(
            amount,
            token,
            true
          );

          if (freshUsdValue !== usdValue) {
            set({ TokenBUsdValue: freshUsdValue });
          }
        } catch (error) {
          console.error("Error updating TokenB USD value:", error);
        }
      }
    })();

    // Also update quote if needed
    if (state.tradeDirection === "sell") {
      // Here you'd typically call your quote service
      // updateQuote(state.TokenB, state.TokenA, state.TokenBAmount);
    }
  },

  setTokenAAmount: (amount) => {
    // Immediate update with sync method
    const state = get();
    const token = state.TokenA;
    const pricesStores = usePriceStore.getState();
    const usdValue = amount
      ? pricesStores.getUSDValueSync(amount, token)
      : null;
    const balanceA = get().tokenABalance;

    if (Number(balanceA) < Number(amount)) {
      state.setExceedsBalanceError(true);
    } else {
      state.setExceedsBalanceError(false);
    }
    // Update state with current value
    set({
      TokenAAmount: formatDigits(amount),
      TokenAUsdValue: usdValue,
    });

    // Then do an async update to get the most accurate value
    (async () => {
      if (amount) {
        try {
          // Get updated USD value with fresh price data
          const freshUsdValue = await pricesStores.getUSDValue(
            amount,
            token,
            true
          );

          // Only update if the value is different
          if (freshUsdValue !== usdValue) {
            set({ TokenAUsdValue: freshUsdValue });
          }
        } catch (error) {
          console.error("Error updating TokenA USD value:", error);
        }
      }
    })();

    // Also update quote if needed
    if (state.tradeDirection === "buy") {
      // Here you'd typically call your quote service
      // updateQuote(state.TokenA, state.TokenB, state.TokenAAmount);
    }
  },
  setChartFlag: (chartFlag: boolean) => set({ chartFlag }),
  setChartActiveToken: (chartActiveToken: string) => set({ chartActiveToken }),
  setTokenBUsdValue: (usdValue: number | null | undefined) =>
    set({
      TokenBUsdValue: usdValue,
    }),
  setTokenAUsdValue: (usdValue: number | null | undefined) =>
    set({
      TokenAUsdValue: usdValue,
    }),
  // setTokenAAmount: (amount) =>
  //   set(() => ({ TokenAAmount: formatDigits(amount) })),
  setTradeDirection: (direction) => () => {
    const balanceA = get().tokenABalance;
    let amount = get().TokenAAmount;

    if (Number(balanceA) < Number(amount)) {
      get().setExceedsBalanceError(true);
    } else {
      get().setExceedsBalanceError(false);
    }

    set({ tradeDirection: direction });
  },
  setSlippage: (slippage) => set(() => ({ slippage })),
  setTokens: (tokens: any) => set({ tokens }),
  setSelectorOpen: (isOpen: Boolean) => set(() => ({ selectorOpen: isOpen })),
  setDeadline: (deadline) => set({ deadline: deadline }),
  setCurrentSellAsset: (asset: Token) => {
    const balanceA = get().tokenABalance;
    let amount = get().TokenAAmount;

    if (Number(balanceA) < Number(amount)) {
      get().setExceedsBalanceError(true);
    } else {
      get().setExceedsBalanceError(false);
    }

    set(() => ({
      currentSellAsset: asset,
    }));
  },
  setCurrentBuyAsset: (asset: Token) =>
    set(() => ({
      currentBuyAsset: asset,
    })),
  setIsWalletConnected: (isConnected: boolean) =>
    set(() => ({
      isWalletConnected: isConnected,
    })),
  setTokenABalance: (balance: string) =>
    set(() => ({
      tokenABalance: balance,
    })),
  setTokenBBalance: (balance: string) =>
    set(() => ({
      tokenBBalance: balance,
    })),
  setLoadingBalances: (loading: boolean) =>
    set(() => ({
      loadingBalances: loading,
    })),
  setTransactionButtonText: (transactionButtonText: string) =>
    set({ transactionButtonText }),
  setIsSwapping: (isSwapping: boolean) => set({ isSwapping }),

  setQuoteLoading: (quoteLoading: boolean) => set({ quoteLoading }),
  setQuoteAmount: (quoteAmount: any) => set({ quoteAmount }),
  setFee: (fee: string | null) => set({ fee }),
  setPriceImpact: (priceImpact: string | null) => set({ priceImpact }),

  setNeedsApproval: (needsApproval: boolean) => set({ needsApproval }),
  setIsApproving: (isApproving: boolean) => set({ isApproving }),
  setMinAmountOut: (minAmountOut: any) => set({ minAmountOut }),
  setEstimatedFees: (estimatedFee: any) => set({ estimatedFees: estimatedFee }),
  setExceedsBalanceError: (exceedsBalanceError: boolean) =>
    set({ exceedsBalanceError }),

  resetSwapState: () =>
    set({
      TokenBAmount: "",
      TokenAAmount: "",

      selectorOpen: false,
      transactionButtonText: "Swap",
      isSwapping: false,
      quoteLoading: false,
      needsApproval: false,
      isApproving: false,
      minAmountOut: {
        raw: null,
        formatted: null,
      },
      quoteAmount: null,
      estimatedFees: {
        estimatedFee: null,
        formatedEstimatedFee: null,
      },

      priceImpact: null,
      fee: null,
      // Don't reset tokens, balances, slippage, etc.
    }),

  fetchAllTokens: async (walletAddress: string, provider: Provider) => {
    const { tokens } = get();
    const chainId = useAccountStore.getState().chainId;
    await updatePrices();
    const updatedTokens = await Promise.all(
      tokens.map(async (token) => {
        if (token.chainId !== chainId) return token;

        const balance = await fetchTokenBalance(
          token.address,
          walletAddress,
          provider,
          token.decimals
        );

        const usdValue = await getUSDValue(balance, token.symbol);
        return { ...token, balance, usdValue };
      })
    );

    set({ tokens: updatedTokens });
    return tokens;
  },
  fetchTokenBalanceFor: async (
    token: Token,
    walletAddress: string,
    provider: Provider
  ) => {
    const balance = await fetchTokenBalance(
      token.address,
      walletAddress,
      provider,
      token.decimals
    );
    const usdValue = await getUSDValue(balance, token.symbol);
    return { ...token, balance, usdValue };
  },

  getTokenBySymbol: (symbol: string) =>
    get().tokens.find(
      (token) => token.symbol.toLowerCase() === symbol.toLowerCase()
    ),

  // Function to update balances when tokens change
  // updateTokenBalances: async (address: string, provider: any) => {
  //   const { fetchTokenBalances } = get();
  //   // Only fetch balances if wallet is connected
  //   if (address) {
  //     if (address && provider) {
  //       await fetchTokenBalances(address, provider);
  //     }
  //   }
  // },
  fetchTokenBalances: async (walletAddress: string, provider: Provider) => {
    const {
      currentSellAsset,
      currentBuyAsset,
      setTokenABalance,
      setTokenBBalance,
      setLoadingBalances,
    } = get();

    if (!walletAddress || !provider) return;

    try {
      setLoadingBalances(true);

      const [tokenABalance, tokenBBalance] = await Promise.all([
        fetchTokenBalance(
          currentSellAsset?.address,
          walletAddress,
          provider,
          currentSellAsset?.decimals
        ),
        fetchTokenBalance(
          currentBuyAsset?.address,
          walletAddress,
          provider,
          currentBuyAsset?.decimals
        ),
      ]);

      setTokenABalance(tokenABalance);
      setTokenBBalance(tokenBBalance);
    } catch (error) {
      console.error("Error fetching token balances:", error);
    } finally {
      setLoadingBalances(false);
    }
  },

  updateTokenBalances: async (walletAddress: string, provider: any) => {
    const { currentSellAsset, currentBuyAsset, fetchTokenBalanceFor } = get();

    if (!walletAddress || !provider || !currentSellAsset || !currentBuyAsset)
      return;

    try {
      set({ loadingBalances: true });

      const updatedTokenA = await fetchTokenBalanceFor(
        currentSellAsset,
        walletAddress,
        provider
      );
      const updatedTokenB = await fetchTokenBalanceFor(
        currentBuyAsset,
        walletAddress,
        provider
      );

      set({
        tokenABalance: updatedTokenA.balance,
        tokenBBalance: updatedTokenB.balance,
        loadingBalances: false,
      });

      // Optional: update the tokens list if needed
      const updatedTokens = get().tokens.map((token) => {
        if (token.address === updatedTokenA.address) return updatedTokenA;
        if (token.address === updatedTokenB.address) return updatedTokenB;
        return token;
      });

      set({ tokens: updatedTokens });
    } catch (error) {
      console.error("Error updating balances:", error);
      set({
        tokenABalance: "0",
        tokenBBalance: "0",
        loadingBalances: false,
      });
    }
  },
  updateUsdValues: async () => {
    const state = get();

    // Force update the prices first
    await updatePrices();

    // Calculate and update TokenA USD value if there's an amount
    if (state.TokenA && state.TokenAAmount) {
      const tokenAUsdValue = await getUSDValue(
        state.TokenAAmount,
        state.TokenA
      );
      set({ TokenAUsdValue: tokenAUsdValue });
    }

    // Calculate and update TokenB USD value if there's an amount
    if (state.TokenB && state.TokenBAmount) {
      const tokenBUsdValue = await getUSDValue(
        state.TokenBAmount,
        state.TokenB
      );
      set({ TokenBUsdValue: tokenBUsdValue });
    }

    // Also update token prices
    const tokenAPrice = state.TokenA ? getTokenUSDPrice(state.TokenA) : null;
    const tokenBPrice = state.TokenB ? getTokenUSDPrice(state.TokenB) : null;

    set({
      TokenAUsdPrice: tokenAPrice,
      TokenBUsdPrice: tokenBPrice,
    });
  },

  setTokenAUsdPrice: (tokenPriceUsd: number) =>
    set({
      TokenAUsdPrice: tokenPriceUsd,
    }),
  setTokenBUsdPrice: (tokenPriceUsd: number) =>
    set({
      TokenBUsdPrice: tokenPriceUsd,
    }),
}));

// Helper function to fetch token balance

// Selector for State Only
export const useSwapState = () =>
  useSwapStore(
    useShallow((state: SwapState) => ({
      TokenB: state.TokenB,
      TokenA: state.TokenA,
      tokens: state.tokens,
      TokenBAmount: state.TokenBAmount,
      tradeDirection: state.tradeDirection,
      TokenAAmount: state.TokenAAmount,
      slippage: state.slippage,
      selectorOpen: state.selectorOpen,
      currentSellAsset: state.currentSellAsset,
      currentBuyAsset: state.currentBuyAsset,
      isWalletConnected: state.isWalletConnected,
      tokenABalance: state.tokenABalance,
      tokenBBalance: state.tokenBBalance,
      loadingBalances: state.loadingBalances,
      deadline: state.deadline,
      transactionButtonText: state.transactionButtonText,
      isSwapping: state.isSwapping,
      quoteLoading: state.quoteLoading,
      needsApproval: state.needsApproval,
      isApproving: state.isApproving,
      minAmountOut: state.minAmountOut,
      quoteAmount: state.quoteAmount,
      estimateFees: state.estimatedFees,
      fee: state.fee,
      priceImpact: state.priceImpact,
      TokenAUsdValue: state.TokenAUsdValue,
      TokenBUsdValue: state.TokenBUsdValue,
      TokenAUsdPrice: state.TokenAUsdPrice,
      TokenBUsdPrice: state.TokenBUsdPrice,
      prices: state.prices,
      exceedsBalanceError: state.exceedsBalanceError,
      chartFlag: state.chartFlag,
      chartActiveToken: state.chartActiveToken,
      tokensWithBalances: state.tokensWithBalances,
    }))
  );

// Selector for Actions Only
export const useSwapActions = () =>
  useSwapStore(
    useShallow((state: SwapActions) => ({
      setTokenB: state.setTokenB,
      setTokenA: state.setTokenA,
      setTokens: state.setTokens,
      setTokenBAmount: state.setTokenBAmount,
      setTokenAAmount: state.setTokenAAmount,
      setTradeDirection: state.setTradeDirection,
      setSlippage: state.setSlippage,
      setSelectorOpen: state.setSelectorOpen,
      setCurrentSellAsset: state.setCurrentSellAsset,
      setCurrentBuyAsset: state.setCurrentBuyAsset,
      setIsWalletConnected: state.setIsWalletConnected,
      updateTokenBalances: state.updateTokenBalances,
      setDeadline: state.setDeadline,
      setTransactionButtonText: state.setTransactionButtonText,
      setTokenABalance: state.setTokenABalance,
      setTokenBBalance: state.setTokenBBalance,
      setIsSwapping: state.setIsSwapping,
      setQuoteLoading: state.setQuoteLoading,
      setNeedsApproval: state.setNeedsApproval,
      setIsApproving: state.setIsApproving,
      setMinAmountOut: state.setMinAmountOut,
      setQuoteAmount: state.setQuoteAmount,
      setEstimatedFees: state.setEstimatedFees,
      setPriceImpact: state.setPriceImpact,
      setFee: state.setFee,
      updateUsdValues: state.updateUsdValues,
      resetSwapState: state.resetSwapState,
      setTokenBUsdValue: state.setTokenBUsdValue,
      setTokenAUsdValue: state.setTokenAUsdValue,
      setTokenAUsdPrice: state.setTokenAUsdPrice,
      setTokenBUsdPrice: state.setTokenBUsdPrice,
      setPrices: state.setPrices,
      setExceedsBalanceError: state.setExceedsBalanceError,
      setChartFlag: state.setChartFlag,
      setChartActiveToken: state.setChartActiveToken,
      fetchAllTokens: state.fetchAllTokens,
    }))
  );
