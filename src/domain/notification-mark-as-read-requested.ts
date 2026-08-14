/** A user asking to mark one of their own notifications as read. */
export class NotificationMarkAsReadRequested {
    notificationId: string;

    constructor(notificationId: string) {
        this.notificationId = notificationId;
    }
}
