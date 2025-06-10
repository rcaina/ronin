// import { NextApiRequest, NextApiResponse } from "next";

// import { authOptions } from "@/pages/api/auth/[...nextauth]";
// import { getServerSession } from "next-auth";

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<{ error: string }>
// ) {
//   const session = await getServerSession(req, res, authOptions);

//   if (!session) {
//     return res.status(401).json({ error: "Please sign in." });
//   }

//   return res.status(404).json({
//     error: "Path Not found - Catch all route",
//   });
// }
