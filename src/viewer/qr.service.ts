import QRCode from 'qrcode';

/**
 * Generates a real scannable QR code SVG string from the given URL.
 * The QR dots are colored with the tenant's primary color for branding.
 *
 * @param url          - Full URL to encode (e.g. https://reports.lab.com/view/<token>)
 * @param primaryColor - Tenant hex color for QR dot color (e.g. "#1A73E8")
 * @param size         - Width/height in pixels (default 90 for back page, 58 for cover)
 */
export async function generateViewerQrSvg(
    url: string,
    primaryColor: string,
    size = 90,
): Promise<string> {
    const svg = await QRCode.toString(url, {
        type: 'svg',
        width: size,
        margin: 0,
        color: {
            dark: primaryColor,
            light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
    });
    return svg;
}
