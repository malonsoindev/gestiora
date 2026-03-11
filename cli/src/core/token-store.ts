let _accessToken: string | null = null;

export const tokenStore = {
  set(token: string): void {
    _accessToken = token;
  },
  get(): string | null {
    return _accessToken;
  },
  clear(): void {
    _accessToken = null;
  },
  isSet(): boolean {
    return _accessToken !== null;
  },
};
