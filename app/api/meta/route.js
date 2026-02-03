import { loadMatData } from "@/lib/matData";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const group = Number(searchParams.get("group") || 1);
  if (!Number.isInteger(group) || group < 1 || group > 7) {
    return Response.json({ error: "Invalid group." }, { status: 400 });
  }

  try {
    const data = loadMatData(group);
    const nSubjects = Array.isArray(data.mu) ? data.mu.length : 0;
    return Response.json({
      n_subjects: nSubjects,
      iter: Array.isArray(data.iter) ? data.iter[0] : data.iter,
      converged: Array.isArray(data.converged)
        ? data.converged[0]
        : data.converged
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
