import type { ITransactionRepository, FindTransactionsParams } from '../../../domain/repositories/ITransactionRepository';
import type { TransactionPageDto } from '../../dtos/TransactionDto';
import { TransactionMapper } from '../../mappers/TransactionMapper';
import { buildPaginatedResult } from '../../../shared/types/Pagination';

export class ListTransactionsUseCase {
    constructor(private readonly transactionRepo: ITransactionRepository) {}

    async execute(params: FindTransactionsParams): Promise<TransactionPageDto> {
        const result = await this.transactionRepo.findAll(params);
        return buildPaginatedResult(
            result.items.map(TransactionMapper.toDto),
            result.total,
            result.page,
            result.pageSize,
        );
    }
}
