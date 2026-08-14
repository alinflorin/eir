/** A user's request for a page of their own notifications. */
export class NotificationListRequested {
    page: number;
    pageSize: number;

    constructor(page: number, pageSize: number) {
        this.page = page;
        this.pageSize = pageSize;
    }
}
