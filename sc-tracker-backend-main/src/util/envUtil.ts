import { applicationEnvironment } from '../constant/application';

export function isApplicationEnvironment(value: string): value is applicationEnvironment {
    return Object.values(applicationEnvironment).includes(value as applicationEnvironment);
}
