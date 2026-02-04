import type { NextApiRequest, NextApiResponse } from "next";
import { getGroupData } from "../../lib/data";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = getGroupData();
    res.status(200).json({
      n_subjects: data.mu.length,
      iter: data.iter,
      converged: data.converged
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
