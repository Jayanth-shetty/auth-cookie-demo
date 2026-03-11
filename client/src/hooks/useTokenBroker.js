import { useState, useEffect } from "react";
import { tokenBroker } from "../services/tokenBrokerService";

/**
 * Custom hook for using Token Broker in React components
 * Provides easy access to token state, auto-refresh, and authentication status
 */
export function useTokenBroker() {
  const [token, setToken] = useState(tokenBroker.getToken());
  const [tokenInfo, setTokenInfo] = useState(tokenBroker.getTokenInfo());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Subscribe to token changes
    const unsubscribe = tokenBroker.subscribe((event) => {
      console.log("Token event:", event.eventType);

      if (
        event.eventType === "TOKEN_SET" ||
        event.eventType === "TOKEN_SYNCED"
      ) {
        setToken(event.token);
        setTokenInfo(tokenBroker.getTokenInfo());
      } else if (
        event.eventType === "TOKEN_CLEARED" ||
        event.eventType === "TOKEN_CLEARED_ELSEWHERE"
      ) {
        setToken(null);
        setTokenInfo(tokenBroker.getTokenInfo());
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Logout user
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      await tokenBroker.logout();
      setToken(null);
      setTokenInfo(tokenBroker.getTokenInfo());
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh token
   */
  const refreshToken = async () => {
    setIsLoading(true);
    try {
      const newToken = await tokenBroker.refreshToken();
      if (newToken) {
        setToken(newToken);
        setTokenInfo(tokenBroker.getTokenInfo());
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = () => {
    return !!token && !tokenBroker.isTokenExpired(token);
  };

  /**
   * Get current user info from token
   */
  const getUserInfo = () => {
    if (!tokenInfo.valid) return null;

    return {
      userId: tokenInfo.userId,
      email: tokenInfo.email,
    };
  };

  /**
   * Get time until token expiration
   */
  const getTimeUntilExpiry = () => {
    return tokenBroker.getTimeUntilExpiry();
  };

  return {
    token,
    tokenInfo,
    isAuthenticated: isAuthenticated(),
    isExpired: tokenBroker.isTokenExpired(token),
    userInfo: getUserInfo(),
    timeUntilExpiry: getTimeUntilExpiry(),
    isLoading,
    logout,
    refreshToken,
    getToken: () => token,
  };
}

/**
 * Custom hook for protected routes
 * Redirects to login if not authenticated
 */
export function useProtectedRoute() {
  const { isAuthenticated, token } = useTokenBroker();
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsValid(false);
    } else {
      setIsValid(true);
    }
  }, [isAuthenticated, token]);

  return { isValid, isAuthenticated };
}

/**
 * Custom hook for token auto-refresh
 * Automatically refreshes token before expiration
 */
export function useTokenAutoRefresh(enabled = true) {
  const broker = tokenBroker;

  useEffect(() => {
    if (enabled) {
      broker.setupAutoRefresh(5 * 60 * 1000); // 5 min buffer
      return () => broker.stopAutoRefresh();
    }
  }, [enabled, broker]);
}

/**
 * Custom hook for cross-tab token sync
 * Keeps token in sync across browser tabs
 */
export function useTokenSync() {
  const [token, setToken] = useState(tokenBroker.getToken());

  useEffect(() => {
    // Listen to storage changes from other tabs
    window.addEventListener("storage", (event) => {
      if (event.key === "app_token") {
        console.log("📱 Token synced from another tab");
        setToken(event.newValue);
      }
    });
  }, []);

  return { token };
}

export default useTokenBroker;
