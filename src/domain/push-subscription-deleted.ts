/** Confirms a push subscription was removed, sent back to the requesting user. */
export class PushSubscriptionDeleted {
    endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }
}
