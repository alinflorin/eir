import type { NotificationDto } from './notification-list-fetched.js';

/**
 * A brand-new notification for a user, pushed live (alongside the delivered
 * email/push, if any) so their bell/list can update immediately instead of
 * waiting for the next NotificationListRequested poll.
 */
export class NotificationAdded {
    notification: NotificationDto;

    constructor(notification: NotificationDto) {
        this.notification = notification;
    }
}
