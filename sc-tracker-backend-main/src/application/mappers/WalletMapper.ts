import type { Wallet } from '../../domain/entities/Wallet';
import type { WalletDto } from '../dtos/WalletDto';

export class WalletMapper {
    static toDto(wallet: Wallet): WalletDto {
        return {
            walletId: wallet.walletId,
            countryId: wallet.countryId,
            dateOpened: wallet.dateOpened.toISOString().split('T')[0],
            dateClosed: wallet.dateClosed
                ? wallet.dateClosed.toISOString().split('T')[0]
                : null,
        };
    }
}
