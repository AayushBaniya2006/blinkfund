import { z } from "zod";
import { type CreditsConfig } from ".";

export const creditTypeSchema = z.enum([
  "image_generation",
  "video_generation",
  // Tip: Add more credit types here
]);

export const creditsConfig: CreditsConfig = {
  image_generation: {
    name: "Image Generation Credits",
    currency: "USD",
    minimumAmount: 1,
    slabs: [
      {
        from: 0,
        to: 1000,
        pricePerUnit: 0.0001,
      },
    ],
  },
  video_generation: {
    name: "Video Generation Credits",
    currency: "USD",
    minimumAmount: 1,
    priceCalculator: (amountOfCredits, userPlan) => {
      // If userplan is provided, you can use it to calculate the price
      // For example, if user's plan is
      // enterprise plan and userPlan.quotas.videoCreditsRate is 0.0001,
      // return amountOfCredits * 0.0001
      // Else use default rate of 0.01
      console.log({ userPlan });
      return amountOfCredits * 0.01;
    },
  },
};
