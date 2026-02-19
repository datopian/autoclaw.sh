import { useEffect, useState } from "react";
import { getAuthMe } from "../api/control";

export function useAuthStatus() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthMe()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  return { authenticated, loading };
}
