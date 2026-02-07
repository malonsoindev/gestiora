import { z } from 'zod';
import 'dotenv/config';

const corsSchema = z
    .string()
    .transform((value) => {
        if (value === 'true') {
            return true;
        }

        if (value === 'false') {
            return false;
        }

        const trimmed = value.trim();
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
                    return parsed;
                }
            } catch {
                return value;
            }
        }

        return value;
    })
    .pipe(z.union([z.boolean(), z.string(), z.array(z.string())]));

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z
        .string()
        .transform((value) => Number.parseInt(value, 10))
        .pipe(z.number().min(1).max(65535))
        .default(3000),
    CORS: corsSchema.optional(),
    SWAGGER: z
        .string()
        .transform((value) => value === 'true')
        .pipe(z.boolean())
        .optional(),
    JWT_ACCESS_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),
    DATABASE_TYPE: z.enum(['in-memory', 'postgres']).default('in-memory'),
    DATABASE_URL: z.url().optional(),
    STORAGE_TYPE: z.enum(['in-memory', 'local']).default('in-memory'),
    STORAGE_PATH: z.string().default('storage'),
    AI_AGENT_TYPE: z.enum(['stub', 'stub-error', 'genkit']).default('stub'),
}).refine(
    (data) => data.DATABASE_TYPE !== 'postgres' || Boolean(data.DATABASE_URL),
    {
        message: 'DATABASE_URL is required when DATABASE_TYPE is postgres',
        path: ['DATABASE_URL'],
    },
);

export type Config = z.infer<typeof envSchema>;

const validateConfig = (): Config => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.issues.map((issue) => {
                const path = issue.path.join('.');
                return `${path}: ${issue.message}`;
            });

            console.error('Invalid environment configuration:');
            errorMessages.forEach((message) => console.error(`  - ${message}`));
            process.exit(1);
        }

        throw error;
    }
};

export const config = validateConfig();

export const isDevelopment = (cfg: Config = config): boolean => cfg.NODE_ENV === 'development';
export const isProduction = (cfg: Config = config): boolean => cfg.NODE_ENV === 'production';
export const isTest = (cfg: Config = config): boolean => cfg.NODE_ENV === 'test';
