import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { runPipeline } from "./pipeline.js";

const url = process.env.REDIS_URL;
if (!url) {
  console.log("REDIS_URL unset; worker idle (API may run INLINE_WORKER)");
  setInterval(() => undefined, 60_000);
} else {
  const connection = new IORedis(url, { maxRetriesPerRequest: null });
  const worker = new Worker(
    "analysis",
    async (job) => {
      const id = String(job.data.jobId);
      console.log(JSON.stringify({ msg: "job_start", jobId: id, stage: job.name }));
      await runPipeline(id);
    },
    { connection, concurrency: 4 },
  );
  worker.on("failed", (job, err) => {
    console.error(JSON.stringify({ msg: "job_failed", jobId: job?.id, error: err.message }));
  });
  console.log("worker listening on queue analysis");
}
