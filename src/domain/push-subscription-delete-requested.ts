/** A user asking to remove a browser push subscription, keyed by its endpoint. */
export class PushSubscriptionDeleteRequested {
    endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }
}
