export default {
    SUCCESS: 'Request completed successfully.',
    SOMETHING_WENT_WRONG: 'Something went wrong.',
    NOT_FOUND_ENTITY: (entity: string) => `${entity} not found.`,
    NOT_FOUND_ROUTE: (route: string) => `Route ${route} not found.`,
    TOO_MANY_REQUESTS: 'Too many requests, please try again later.',
    METHOD_NOT_ALLOWED: 'Method not allowed for this endpoint.',
    UNAUTHORIZED: 'Unauthorized access.',
    FORBIDDEN: 'Access to this resource is forbidden.',
    VALIDATION_ERROR: 'Validation failed for the request data.',
};
