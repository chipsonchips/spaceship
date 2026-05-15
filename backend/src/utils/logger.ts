import winston from 'winston'

const { combine, timestamp, printf, colorize } = winston.format

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0
        ? ` ${JSON.stringify(meta, (key, value) => {
            if (typeof value === 'bigint') return value.toString()
            if (value instanceof Date) return value.toISOString()
            return value
        })}`
        : ''
    return `${timestamp} [${level}]: ${message}${metaStr}`
})

export const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        new winston.transports.Console({
            format: combine(colorize(), logFormat),
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }),
        new winston.transports.File({
            filename: 'logs/app.log',
        }),
    ],
})
