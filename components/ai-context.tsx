import type { CoreMessage } from "ai";
import {
  createAI,
  experimental_createMCPClient,
  getMutableAIState,
  streamUI,
} from "ai/rsc";
import "server-only";
import { z } from "zod";

import { anthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from '@ai-sdk/deepseek';
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { mistral } from "@ai-sdk/mistral";
import { openai } from "@ai-sdk/openai";
import {
  SSEClientTransport,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/sdk/client";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { getItem } from "@/lib/async-storage";
import { unstable_headers } from "expo-router/rsc/headers";
import { getPlacesInfo } from "./map/googleapis-maps";
import { MapCard, MapSkeleton } from "./map/map-card";
import MarkdownText from "./markdown-text";
import { MoviesCard, MoviesSkeleton } from "./movies/movie-card";
import { WeatherCard } from "./weather";
import { getWeatherAsync } from "./weather-data";

const PROVIDER_KEY = "ai_provider";
const HTTP_URL_KEY = "mcp_http_url";
const SSE_URL_KEY = "mcp_sse_url";
const getApiKeyStoreKey = (provider: string) => `${provider.toLowerCase()}_api_key`;

const getApiKey = async (providerName: string): Promise<string | null> => {
  // First try to get from AsyncStorage (user settings)
  try {
    const userApiKey = await getItem(getApiKeyStoreKey(providerName));
    if (userApiKey && userApiKey.trim()) {
      return userApiKey.trim();
    }
  } catch (error) {
    console.warn(`Failed to get API key from storage for ${providerName}:`, error);
  }

  // Fallback to environment variables
  const envVarMap: Record<string, string> = {
    OpenAI: "OPENAI_API_KEY",
    Google: "GEMINI_API_KEY",
    Anthropic: "ANTHROPIC_API_KEY",
    Groq: "GROQ_API_KEY",
    Mistral: "MISTRAL_API_KEY",
    OpenRouter: "OPENROUTER_API_KEY",
    DeepSeek: "DEEPSEEK_API_KEY",
  };

  const envVar = envVarMap[providerName];
  if (envVar && process.env[envVar]) {
    return process.env[envVar];
  }

  return null;
};

const getUserProvider = async (): Promise<string | null> => {
  try {
    return await getItem(PROVIDER_KEY);
  } catch (error) {
    console.warn("Failed to get provider from storage:", error);
    return null;
  }
};

const getMcpUrls = async (): Promise<{ httpUrl?: string; sseUrl?: string }> => {
  try {
    const [httpUrl, sseUrl] = await Promise.all([
      getItem(HTTP_URL_KEY),
      getItem(SSE_URL_KEY)
    ]);
    return {
      httpUrl: httpUrl || undefined,
      sseUrl: sseUrl || undefined
    };
  } catch (error) {
    console.warn("Failed to get MCP URLs from storage:", error);
    return {};
  }
};

async function getProvider(modelId?: string, providerName?: string, apiKey?: string) {
  const provider = providerName || "OpenAI";
  const key = apiKey || await getApiKey(provider);

  if (!key) {
    throw new Error(
      `API key for provider ${provider} is required. Please configure it in Settings → AI Provider or set the corresponding environment variable.`
    );
  }

  console.log(`Using provider: ${provider} with model: ${modelId || 'default'}`);

  switch (provider) {
    case "Anthropic":
      return anthropic({
        apiKey: key,
      })(modelId || "claude-3-haiku-20240307");
    case "Google":
      return google({
        apiKey: key,
      })(modelId || "models/gemini-pro");
    case "Groq":
      return groq({
        apiKey: key,
      })(modelId || "llama3-8b-8192");
    case "Mistral":
      return mistral({
        apiKey: key,
      })(modelId || "open-mistral-7b");
    case "OpenRouter":
      const openrouter = createOpenRouter({
        apiKey: key,
        baseURL: "https://openrouter.ai/api/v1"
      });
      return openrouter(modelId || "google/gemini-flash-1.5");
    case "DeepSeek":
      const deepseek = createDeepSeek({
        apiKey: key,
      });
      return deepseek(modelId || "deepseek-chat");
    case "OpenAI":
    default:
      return openai({
        apiKey: key,
      })(modelId || "gpt-4o-mini-2024-07-18");
  }
}

export async function onSubmit(message: string, modelId?: string, providerName?: string, apiKey?: string, httpUrl?: string, sseUrl?: string) {
  "use server";

  const aiState = getMutableAIState();

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: "user",
        content: message,
      },
    ],
  });

  const headers = await unstable_headers();

  // Get user settings if not provided as parameters
  const userProvider = providerName || await getUserProvider();
  const userApiKey = apiKey || (userProvider ? await getApiKey(userProvider) : null);
  const mcpUrls = await getMcpUrls();
  const finalHttpUrl = httpUrl || mcpUrls.httpUrl;
  const finalSseUrl = sseUrl || mcpUrls.sseUrl;

  const model = await getProvider(modelId, userProvider, userApiKey);

  const mcpClients = [];
  let mcpTools = {};

  if (finalHttpUrl) {
    try {
      const httpTransport = new StreamableHTTPClientTransport(new URL(finalHttpUrl));
      const httpClient = await experimental_createMCPClient({
        transport: httpTransport,
      });
      mcpClients.push(httpClient);
      const httpTools = await httpClient.tools();
      mcpTools = { ...mcpTools, ...httpTools };
    } catch (error) {
      console.warn("Failed to connect to HTTP MCP server:", error);
    }
  }

  if (finalSseUrl) {
    try {
      const sseTransport = new SSEClientTransport(new URL(finalSseUrl));
      const sseClient = await experimental_createMCPClient({
        transport: sseTransport,
      });
      mcpClients.push(sseClient);
      const sseTools = await sseClient.tools();
      mcpTools = { ...mcpTools, ...sseTools };
    } catch (error) {
      console.warn("Failed to connect to SSE MCP server:", error);
    }
  }

  const tools: Record<string, any> = { ...mcpTools };

  if (process.env.EXPO_OS !== "web") {
    tools.get_points_of_interest = {
      description: "Get things to do for a point of interest or city",
      parameters: z
        .object({
          poi: z
            .string()
            .describe(
              'query to send to the Google Places API. e.g. "things to do in Amsterdam" or "casinos and hotels in Las Vegas"'
            ),
        })
        .required(),
      async *generate({ poi }) {
        console.log("city", poi);
        yield <MapSkeleton />;
        let pointsOfInterest = await getPlacesInfo(poi);
        return <MapCard city={poi} data={pointsOfInterest} />;
      },
    };
  }

  const result = streamUI({
    model,
    messages: [
      {
        role: "system",
        content: `\
You are a helpful chatbot assistant. You can provide weather info and movie recommendations.
You have the following tools available:
- get_media: Lists or search movies and TV shows from TMDB.
- get_weather: Gets the weather for a city.

User info:
- city: ${headers.get("eas-ip-city") ?? (__DEV__ ? "Austin" : "unknown")}
- country: ${headers.get("eas-ip-country") ?? (__DEV__ ? "US" : "unknown")}
- region: ${headers.get("eas-ip-region") ?? (__DEV__ ? "TX" : "unknown")}
- device platform: ${headers.get("expo-platform") ?? "unknown"}
`,
      },
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name,
      })),
    ],
    text: ({ content, done }) => {
      if (done) {
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: "assistant",
              content,
            },
          ],
        });
      }
      return <MarkdownText done={done}>{content}</MarkdownText>;
    },
    tools: {
      ...tools,
      get_media: {
        description: "List movies or TV shows today or this week from TMDB",
        parameters: z
          .object({
            time_window: z
              .enum(["day", "week"])
              .describe("time window to search for")
              .default("day"),
            media_type: z
              .enum(["tv", "movie"])
              .describe("type of media to search for")
              .default("movie"),
            generated_description: z
              .string()
              .describe("AI-generated description of the tool call"),
            query: z
              .string()
              .describe(
                "The query to use for searching movies or TV shows. Set to undefined if looking for trending, new, or popular media."
              )
              .optional(),
          })
          .required(),
        async *generate({
          generated_description,
          time_window,
          media_type,
          query,
        }) {
          yield <MoviesSkeleton />;
          let url: string;
          if (query) {
            url = `https://api.themoviedb.org/3/search/${media_type}?api_key=${process.env.TMDB_API_KEY
              }&query=${encodeURIComponent(query)}`;
          } else {
            url = `https://api.themoviedb.org/3/trending/${media_type}/${time_window}?api_key=${process.env.TMDB_API_KEY}`;
          }
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error("Failed to fetch trending movies");
          }
          const data = await response.json();
          const movies = data.results.map((media: any) => {
            if (!media.media_type) {
              media.media_type = media_type;
            }
            return media;
          });
          return <MoviesCard data={movies} title={generated_description} />;
        },
      },
      get_weather: {
        description: "Get the current weather for a city",
        parameters: z
          .object({
            city: z.string().describe("the city to get the weather for"),
          })
          .required(),
        async *generate({ city }) {
          yield <WeatherCard city={city} />;
          const weatherInfo = await getWeatherAsync(city);
          console.log("weatherInfo", JSON.stringify(weatherInfo));
          return <WeatherCard city={city} data={weatherInfo} />;
        },
      },
    },
    onFinish: async () => {
      for (const client of mcpClients) {
        await client.close();
      }
    },
    onError: async (error) => {
      for (const client of mcpClients) {
        await client.close();
      }
    },
  });

  return {
    id: nanoid(),
    display: result.value,
  };
}

const nanoid = () => Math.random().toString(36).slice(2);

export type Message = CoreMessage & {
  id: string;
};

export type AIState = {
  chatId: string;
  messages: Message[];
};

export type UIState = {
  id: string;
  display: React.ReactNode;
}[];

const actions = {
  onSubmit,
} as const;

export const AI = createAI<AIState, UIState, typeof actions>({
  actions,
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
});
