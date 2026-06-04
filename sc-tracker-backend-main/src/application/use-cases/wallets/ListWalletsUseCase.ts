import type { IWalletRepository, FindWalletsParams } from '../../../domain/repositories/IWalletRepository';
import type { WalletPageDto } from '../../dtos/WalletDto';
import { WalletMapper } from '../../mappers/WalletMapper';
import { buildPaginatedResult } from '../../../shared/types/Pagination';

export class ListWalletsUseCase {
    constructor(private readonly walletRepo: IWalletRepository) {}

    async execute(params: FindWalletsParams): Promise<WalletPageDto> {
        const result = await this.walletRepo.findAll(params);
        return buildPaginatedResult(
            result.items.map(WalletMapper.toDto),
            result.total,
            result.page,
            result.pageSize,
        );
    }
}
