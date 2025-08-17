import { tool } from "ai";
import { z } from "zod";

export const tavilyTools = ({ apiKey }: { apiKey: string }) => {
  return {
    search: tool({
      description: "Search for information on Tavily",
      parameters: z.object({
        query: z.string(),
      }),
      execute: async ({ query }) => {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: apiKey,
            query,
          }),
        });
        return await response.json();
      },
    }),
    searchContext: tool({
      description: "Search for information on Tavily with context",
      parameters: z.object({
        query: z.string(),
        context: z.string(),
      }),
      execute: async ({ query, context }) => {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            context,
          }),
        });
        return await response.json();
      },
    }),
    searchQNA: tool({
      description: "Search for information on Tavily with Q&A",
      parameters: z.object({
        query: z.string(),
      }),
      execute: async ({ query }) => {
        const response = await fetch("https://api.tavily.com/qna_search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: apiKey,
            query,
          }),
        });
        return await response.json();
      },
    }),
    extract: tool({
      description: "Extract information from a URL",
      parameters: z.object({
        url: z.string(),
      }),
      execute: async ({ url }) => {
        const response = await fetch("https://api.tavily.com/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: apiKey,
            url,
          }),
        });
        return await response.json();
      },
    }),
  };
};
