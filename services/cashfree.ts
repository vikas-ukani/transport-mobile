import { CFEnvironment, CFSession } from "cashfree-pg-api-contract";

export const createSession = (sessionId: string, orderId: string) => {
    return new CFSession(
        sessionId,
        orderId,
        process.env.NODE_ENV === "production" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
      );
}