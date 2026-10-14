import type { Access } from "payload";

export const authenticated: Access = ({ req }) => Boolean(req.user);

export const createFirstAdmin: Access = async ({ req }) => {
  if (req.user) {
    return true;
  }

  const { totalDocs } = await req.payload.count({
    collection: "users",
    overrideAccess: true,
  });

  return totalDocs === 0;
};
