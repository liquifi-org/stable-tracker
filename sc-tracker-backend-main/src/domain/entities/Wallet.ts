export type WalletStatus = 'active' | 'closed';

export interface WalletProps {
    walletId: string;
    countryId: string;
    dateOpened: Date;
    dateClosed?: Date | null;
}

export class Wallet {
    readonly walletId: string;
    readonly countryId: string;
    readonly dateOpened: Date;
    readonly dateClosed: Date | null;

    constructor(props: WalletProps) {
        this.walletId = props.walletId;
        this.countryId = props.countryId;
        this.dateOpened = props.dateOpened;
        this.dateClosed = props.dateClosed ?? null;
    }

    get status(): WalletStatus {
        return this.dateClosed && this.dateClosed <= new Date() ? 'closed' : 'active';
    }
}
