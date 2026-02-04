import type { NextApiRequest, NextApiResponse } from "next";
import { getGroupData } from "../../lib/data";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const name = String(req.query.name || "");
    const data = getGroupData();
    if (name !== "alpha" && name !== "eta") {
      res.status(400).json({ error: "name must be alpha or eta" });
      return;
    }
    res.status(200).json({ name, values: data[name] });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
