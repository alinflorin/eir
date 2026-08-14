/** Confirms a notification was marked as read, sent back to the requesting user. */
export class NotificationMarkedAsRead {
    notificationId: string;

    constructor(notificationId: string) {
        this.notificationId = notificationId;
    }
}
