import { env } from "cloudflare:workers";

type StoredObject = { etag: string; text(): Promise<string> };
type Conditional = { etagMatches?: string; etagDoesNotMatch?: string };
type Bucket = {
  get(key: string): Promise<StoredObject | null>;
  put(key: string, body: string, options: { httpMetadata: { contentType: string }; onlyIf: Conditional }): Promise<{ etag: string } | null>;
};

export function cloudflareBucket(): Bucket | null {
  return (env as unknown as { SMALL_GOALS_BUCKET?: Bucket } | undefined)?.SMALL_GOALS_BUCKET ?? null;
}
