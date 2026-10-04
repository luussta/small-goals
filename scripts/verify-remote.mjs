const base = (process.env.DEPLOYMENT_URL || "").replace(/\/$/, "");
const token = process.env.AGENT_API_TOKEN;
if (!base || !token) throw new Error("Set DEPLOYMENT_URL and AGENT_API_TOKEN before running npm run verify:remote.");
const request = async (path, init = {}) => {
  const response = await fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${init.method || "GET"} ${path} returned ${response.status}: ${body.error || "request failed"}`);
  return body;
};
const homepage = await fetch(base, { redirect: "follow" });
if (!homepage.ok) throw new Error(`Homepage returned ${homepage.status}.`);
const result = await request("/api/agent/state");
const sections = result.workspace?.data?.sections;
if (!Array.isArray(sections)) throw new Error("Agent API returned no sections array.");
console.log(`Deployment responds at ${base}; authenticated workspace read succeeded (${sections.length} sections).`);
if (process.argv.includes("--write")) {
  const today = sections.find((section) => section.id === "today") || sections[0];
  let goalId;
  try {
    const created = await request("/api/agent/goals", { method: "POST", body: JSON.stringify({ sectionId: today.id, title: `__verify__ ${crypto.randomUUID()}`, items: ["Remote verification item"] }) });
    goalId = created.goal?.id;
    if (!goalId) throw new Error("Create goal response did not include an ID.");
    const itemId = created.goal.items?.[0]?.id;
    await request(`/api/agent/items/${encodeURIComponent(itemId)}`, { method: "PATCH", body: JSON.stringify({ completed: true }) });
    console.log("Temporary goal and checklist item were created, then completion was verified.");
  } finally {
    if (goalId) await request(`/api/agent/goals/${encodeURIComponent(goalId)}`, { method: "DELETE" });
  }
}
