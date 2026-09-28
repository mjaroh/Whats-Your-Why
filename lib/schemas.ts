import { z } from "zod";
import { MAX_ANSWER_CHARS } from "./constants";

/** A why as the client sends it: the statement plus the question/answer pairs. */
export const WhyBody = z.object({
  statement: z.string().trim().min(1).max(1000),
  answers: z
    .array(
      z.object({
        question: z.string().max(MAX_ANSWER_CHARS),
        answer: z.string().max(MAX_ANSWER_CHARS),
      }),
    )
    .max(20),
});
