export type NotificationType = 'push' | 'email';

/** A request (from another service) to notify a user through one or more channels. */
export class NotificationRequested {
    /** The target user's name, which doubles as their email address. */
    userName: string;
    title: string;
    body: string;
    link?: string;
    notificationTypes: NotificationType[];

    constructor(userName: string, title: string, body: string, notificationTypes: NotificationType[], link?: string) {
        this.userName = userName;
        this.title = title;
        this.body = body;
        this.notificationTypes = notificationTypes;
        this.link = link;
    }
}
