/** Reject oversized numeric indexes in multipart field names (multer GHSA-535w-7cp7-47q4). */
export const MULTER_SECURITY_LIMITS = {
  fieldArrayIndexLimit: 32,
};
