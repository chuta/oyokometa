import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

function client() {
  return new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
  });
}

const bucket = () => process.env.S3_BUCKET ?? "oyokometa-assets";

export async function getObjectBytes(key: string): Promise<Buffer> {
  const out = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const bytes = await out.Body?.transformToByteArray();
  if (!bytes) throw new Error("empty object");
  return Buffer.from(bytes);
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentDisposition: "inline",
    }),
  );
}

export async function deleteObject(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
