// Import your schemas here
import type { Connection, Model, AnyObject } from 'mongoose'
import { Schema } from 'mongoose'
import { COUNTRIES_SEED } from './data/countries.seed'

function getCountryModel(connection: Connection): Model<AnyObject> {
    if (connection.modelNames().includes('Country')) {
        return connection.model<AnyObject>('Country')
    }
    return connection.model<AnyObject>(
        'Country',
        new Schema({ countryId: String, name: String, region: String }, { strict: false }),
    )
}

export async function up(connection: Connection): Promise<void> {
    const Country = getCountryModel(connection)
    const ops = COUNTRIES_SEED.map((country) => ({
        updateOne: {
            filter: { countryId: country.countryId },
            update: { $set: country },
            upsert: true,
        },
    }))
    await Country.bulkWrite(ops, { ordered: false })
    console.log(`Seeded ${ops.length} countries`)
}

export async function down(connection: Connection): Promise<void> {
    const Country = getCountryModel(connection)
    const ids = COUNTRIES_SEED.map((c) => c.countryId)
    const result = await Country.deleteMany({ countryId: { $in: ids } })
    console.log(`Removed ${result.deletedCount} countries`)
}
