import { tool } from "ai";
import { z } from "zod";

export const calculatorTools = () => {
  return {
    add: tool({
      description: "Add two numbers",
      parameters: z.object({
        a: z.number(),
        b: z.number(),
      }),
      execute: async ({ a, b }) => a + b,
    }),
    subtract: tool({
      description: "Subtract two numbers",
      parameters: z.object({
        a: z.number(),
        b: z.number(),
      }),
      execute: async ({ a, b }) => a - b,
    }),
    multiply: tool({
      description: "Multiply two numbers",
      parameters: z.object({
        a: z.number(),
        b: z.number(),
      }),
      execute: async ({ a, b }) => a * b,
    }),
    divide: tool({
      description: "Divide two numbers",
      parameters: z.object({
        a: z.number(),
        b: z.number(),
      }),
      execute: async ({ a, b }) => a / b,
    }),
    exponentiate: tool({
      description: "Exponentiate a number",
      parameters: z.object({
        base: z.number(),
        exponent: z.number(),
      }),
      execute: async ({ base, exponent }) => Math.pow(base, exponent),
    }),
    factorial: tool({
        description: "Calculate the factorial of a number",
        parameters: z.object({
            n: z.number(),
        }),
        execute: async ({ n }) => {
            if (n === 0) return 1;
            let result = 1;
            for (let i = 1; i <= n; i++) {
                result *= i;
            }
            return result;
        },
    }),
    isPrime: tool({
        description: "Check if a number is prime",
        parameters: z.object({
            n: z.number(),
        }),
        execute: async ({ n }) => {
            if (n <= 1) return false;
            for (let i = 2; i <= Math.sqrt(n); i++) {
                if (n % i === 0) return false;
            }
            return true;
        },
    }),
    squareRoot: tool({
        description: "Calculate the square root of a number",
        parameters: z.object({
            n: z.number(),
        }),
        execute: async ({ n }) => Math.sqrt(n),
    }),
    sin: tool({
        description: "Calculate the sine of a number",
        parameters: z.object({
            n: z.number(),
        }),
        execute: async ({ n }) => Math.sin(n),
    }),
    cos: tool({
        description: "Calculate the cosine of a number",
        parameters: z.object({
            n: z.number(),
        }),
        execute: async ({ n }) => Math.cos(n),
    }),
    tan: tool({
        description: "Calculate the tangent of a number",
        parameters: z.object({
            n: z.number(),
        }),
        execute: async ({ n }) => Math.tan(n),
    }),
    log: tool({
        description: "Calculate the logarithm of a number",
        parameters: z.object({
            n: z.number(),
        }),
        execute: async ({ n }) => Math.log(n),
    }),
    exp: tool({
        description: "Calculate the exponential of a number",
        parameters: z.object({
            n: z.number(),
        }),
        execute: async ({ n }) => Math.exp(n),
    }),
  };
};
