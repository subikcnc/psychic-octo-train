"use client";
import { QueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useState } from "react";

interface QueryClientContextType {
  queryClient: QueryClient;
}

const QueryClientContext = createContext<QueryClientContextType | null>(null);

export const QueryClientProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientContext.Provider value={{ queryClient }}>
      {children}
    </QueryClientContext.Provider>
  );
};

export const useQueryClient = () => {
  const context = useContext(QueryClientContext);

  if (!context) {
    throw new Error(
      "query context must be used within a query context provider",
    );
  }

  return context;
};
