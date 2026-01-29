export type RefreshAccessTokenResponse = {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
};
