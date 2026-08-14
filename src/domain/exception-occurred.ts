export class ExceptionOccurred {
    message: string;
    title?: string;

    constructor(message: string, title?: string) {
        this.message = message;
        this.title = title;
    }
}