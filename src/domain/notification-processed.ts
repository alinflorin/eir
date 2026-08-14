import type { NotificationType } from './notification-requested.js';

export interface NotificationResult {
    type: NotificationType;
    success: boolean;
    error?: string;
}

/** Reply to NotificationRequested, published back to the requesting caller. */
export class NotificationProcessed {
    userName: string;
    title: string;
    results: NotificationResult[];

    constructor(userName: string, title: string, results: NotificationResult[]) {
        this.userName = userName;
        this.title = title;
        this.results = results;
    }
}
