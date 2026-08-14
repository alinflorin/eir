/** Confirms a push subscription was stored, sent back to the requesting user. */
export class PushSubscriptionAdded {
    endpoint: string;
    expirationTime: number | null;
    keys: { p256dh: string; auth: string };
    createdAt: string;

    constructor(endpoint: string, expirationTime: number | null, keys: { p256dh: string; auth: string }, createdAt: string) {
        this.endpoint = endpoint;
        this.expirationTime = expirationTime;
        this.keys = keys;
        this.createdAt = createdAt;
    }
}
