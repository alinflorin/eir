export interface NotificationDto {
    id: string;
    title: string;
    body: string;
    link?: string;
    date: string;
    isRead: boolean;
    readDate?: string;
}

/** Reply to NotificationListRequested, sent back to the requesting user. */
export class NotificationListFetched {
    notifications: NotificationDto[];
    page: number;
    pageSize: number;
    totalCount: number;
    unreadCount: number;

    constructor(notifications: NotificationDto[], page: number, pageSize: number, totalCount: number, unreadCount: number) {
        this.notifications = notifications;
        this.page = page;
        this.pageSize = pageSize;
        this.totalCount = totalCount;
        this.unreadCount = unreadCount;
    }
}
