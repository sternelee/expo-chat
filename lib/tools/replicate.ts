import { tool } from "ai";
import { z } from "zod";

export const replicateTools = ({ apiKey }: { apiKey: string }) => {
  return {
    createImage: tool({
      description: "Create an image based on a prompt",
      parameters: z.object({
        prompt: z.string(),
      }),
      execute: async ({ prompt }) => {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${apiKey}`,
          },
          body: JSON.stringify({
            version: "8a87425c05053733140268571477134316d3f2730623630386454d6342a35339",
            input: {
              prompt,
            },
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Replicate API error: ${error.detail}`);
        }

        let prediction = await response.json();

        while (
          prediction.status !== "succeeded" &&
          prediction.status !== "failed"
        ) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          const statusResponse = await fetch(prediction.urls.get, {
            headers: {
              Authorization: `Token ${apiKey}`,
            },
          });
          prediction = await statusResponse.json();
        }

        if (prediction.status === "failed") {
          throw new Error(`Replicate prediction failed: ${prediction.error}`);
        }

        return prediction.output;
      },
    }),
  };
};
