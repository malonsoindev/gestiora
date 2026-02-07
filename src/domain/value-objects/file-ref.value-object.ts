import { InvalidFileRefError } from '../errors/invalid-file-ref.error.js';

export type FileRefProps = {
    storageKey: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
};

export class FileRef {
    private constructor(private readonly props: FileRefProps) {}

    static create(props: FileRefProps): FileRef {
        if (!props.storageKey.trim()) {
            throw new InvalidFileRefError('Invalid storageKey');
        }
        if (!props.filename.trim()) {
            throw new InvalidFileRefError('Invalid filename');
        }
        if (!props.mimeType.trim()) {
            throw new InvalidFileRefError('Invalid mimeType');
        }
        if (!Number.isFinite(props.sizeBytes) || props.sizeBytes < 0) {
            throw new InvalidFileRefError('Invalid sizeBytes');
        }
        if (!props.checksum.trim()) {
            throw new InvalidFileRefError('Invalid checksum');
        }
        return new FileRef({ ...props });
    }

    get storageKey(): string {
        return this.props.storageKey;
    }

    get filename(): string {
        return this.props.filename;
    }

    get mimeType(): string {
        return this.props.mimeType;
    }

    get sizeBytes(): number {
        return this.props.sizeBytes;
    }

    get checksum(): string {
        return this.props.checksum;
    }
}
