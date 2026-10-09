import { Queue } from "bullmq";
import { runPipeline } from "@oyokometa/worker/pipeline";

let queue: Queue | null = null;

function getQueue() {
  if (!process.env.REDIS_URL) return null;
  if (!queue) queue = new Queue("analysis", { connection: { url: process.env.REDIS_URL } });
  return queue;
}

export async function enqueueAnalysis(jobId: string) {
  if (process.env.INLINE_WORKER === "true" || !process.env.REDIS_URL) {
    setImmediate(() => {
      runPipeline(jobId).catch((err) => console.error("inline pipeline", err));
    });
    return;
  }
  await getQueue()!.add("analyze", { jobId }, { jobId, attempts: 3, removeOnComplete: 1000 });
}
