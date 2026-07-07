import { parseErrorResponse } from "./http";

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const subscribeToPush = async (
  subscription: PushSubscriptionJSON,
): Promise<void> => {
  const response = await fetch("/api/notifications/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
  if (!response.ok) return parseErrorResponse(response);
};

export const unsubscribeFromPush = async (endpoint: string): Promise<void> => {
  const response = await fetch("/api/notifications/push", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  if (!response.ok) return parseErrorResponse(response);
};
