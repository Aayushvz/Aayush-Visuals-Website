import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, offlineAnswer } from "@/lib/shotsu/profile";

/*
  Shotsu's brain. POST { messages: [{ role, content }] } and the reply
  streams back as plain text.

  Runs on Claude when ANTHROPIC_API_KEY is set in the environment (Vercel:
  Project Settings -> Environment Variables). Without a key, or if the API
  is unreachable, it answers from the offline replies in lib/shotsu so the
  orb never shows an error.

  Guard rails, because this is a public endpoint on a portfolio:
  - each question is capped in length and only the recent turns are sent;
  - a visitor can ask RATE_MAX questions per RATE_WINDOW_MS (per instance,
    in memory - enough to stop a runaway loop, not a determined abuser);
  - the profile is in a cached system prompt, so repeat questions are cheap.
*/

export const runtime = "nodejs";

const MODEL = "claude-opus-5";
const MAX_QUESTION = 600;
const MAX_TURNS = 12;
const RATE_MAX = 25;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_MAX;
}

type Turn = { role: "user" | "assistant"; content: string };

function textStream(text: string) {
  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  let turns: Turn[];
  try {
    const body = (await req.json()) as { messages?: Turn[] };
    turns = (body.messages ?? [])
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim(),
      )
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_QUESTION) }))
      .slice(-MAX_TURNS);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  /* the conversation must open and end on the visitor */
  while (turns.length && turns[0].role !== "user") turns.shift();
  const last = turns[turns.length - 1];
  if (!last || last.role !== "user") {
    return new Response("Bad request", { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) {
    return textStream(
      "You have asked a lot of questions in a short time, so I'm taking a breather. For anything more, email aayushvisuals@gmail.com or use the [contact page](/contact).",
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return textStream(offlineAnswer(last.content));
  }

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let wrote = false;
      try {
        const stream = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          /* a short, grounded chat answer: low effort keeps it quick */
          output_config: { effort: "low" },
          /* a declined request is retried on Anthropic's recommended
             fallback model instead of coming back empty */
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: [
            { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          ],
          messages: turns,
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            wrote = true;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal" && !wrote) {
          controller.enqueue(encoder.encode(offlineAnswer(last.content)));
        }
      } catch (err) {
        /* rate limits, outages, a bad key: answer offline rather than fail */
        if (err instanceof Anthropic.APIError) {
          console.error("shotsu: API error", err.status, err.message);
        } else {
          console.error("shotsu: unexpected error", err);
        }
        if (!wrote) controller.enqueue(encoder.encode(offlineAnswer(last.content)));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
