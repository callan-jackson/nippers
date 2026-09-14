import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { User } from "@shared/types";

export function useAuth() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<{ user: User | null }>("/auth/me"),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return {
    user: q.data?.user ?? null,
    loading: q.isLoading,
    isAdmin: q.data?.user?.role === "admin",
    setUser: (user: User | null) => qc.setQueryData(["me"], { user }),
    logout: async () => {
      await api.post("/auth/logout", {});
      qc.setQueryData(["me"], { user: null });
      qc.removeQueries({ predicate: (query) => query.queryKey[0] !== "site" });
    },
  };
}
