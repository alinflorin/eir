/** A user asking to register (or re-register) a browser push subscription. */
export class PushSubscriptionAddRequested {
    endpoint: string;
    expirationTime: number | null;
    keys: { p256dh: string; auth: string };

    constructor(endpoint: string, expirationTime: number | null, keys: { p256dh: string; auth: string }) {
        this.endpoint = endpoint;
        this.expirationTime = expirationTime;
        this.keys = keys;
    }
}
