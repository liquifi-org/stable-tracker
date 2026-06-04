import { red, yellow, green, cyan, magenta, blue, gray, bold } from 'colorette';

export const colorizeLevel = (level: string): string => {
    const upper = level.toUpperCase();
    return (
        {
            ERROR: bold(red(upper)),
            WARN: bold(yellow(upper)),
            INFO: bold(green(upper)),
            HTTP: bold(cyan(upper)),
            VERBOSE: bold(magenta(upper)),
            DEBUG: bold(blue(upper)),
            SILLY: bold(gray(upper)),
        }[upper] || level
    );
};
