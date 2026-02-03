import { loadMatData } from "@/lib/matData";

const ALLOWED = new Set(["mu", "beta"]);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const group = Number(searchParams.get("group") || 1);

  if (!Number.isInteger(group) || group < 1 || group > 7) {
    return Response.json({ error: "Invalid group." }, { status: 400 });
  }

  if (!ALLOWED.has(name)) {
    return Response.json({ error: "Invalid subjects name." }, { status: 400 });
  }

  try {
    const data = loadMatData(group);
    return Response.json({ name, values: data[name] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
