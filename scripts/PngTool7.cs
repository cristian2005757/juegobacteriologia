using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class PngTool7
{
    public static void KeyAndCrop(string src, string dest)
    {
        using (var original = Image.FromFile(src))
        using (var bmp = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb))
        {
            using (var g = Graphics.FromImage(bmp))
            {
                g.DrawImage(original, 0, 0, original.Width, original.Height);
            }
            var rect = new Rectangle(0, 0, bmp.Width, bmp.Height);
            var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int bytes = Math.Abs(data.Stride) * bmp.Height;
            byte[] buf = new byte[bytes];
            Marshal.Copy(data.Scan0, buf, 0, bytes);
            int minX = bmp.Width, minY = bmp.Height, maxX = -1, maxY = -1;
            for (int y = 0; y < bmp.Height; y++)
            {
                int row = y * data.Stride;
                for (int x = 0; x < bmp.Width; x++)
                {
                    int i = row + x * 4;
                    int b = buf[i];
                    int gc = buf[i + 1];
                    int r = buf[i + 2];
                    bool hard = gc < 72 && r > 150 && b > 60 && (r - gc) > 80;
                    bool soft = !hard && gc < 88 && r > 145 && b > 50 && (r - gc) > 70;
                    int alpha = 255;
                    if (hard) alpha = 0;
                    else if (soft) alpha = (gc - 72) * 255 / 16;
                    if (alpha < 0) alpha = 0;
                    if (alpha > 255) alpha = 255;
                    buf[i + 3] = (byte)alpha;
                    if (alpha == 0)
                    {
                        buf[i] = 0;
                        buf[i + 1] = 0;
                        buf[i + 2] = 0;
                    }
                    else if (alpha > 24)
                    {
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            Marshal.Copy(buf, 0, data.Scan0, bytes);
            bmp.UnlockBits(data);
            if (maxX < minX) minX = maxX = minY = maxY = 0;
            int pad = 2;
            minX = Math.Max(0, minX - pad);
            minY = Math.Max(0, minY - pad);
            maxX = Math.Min(bmp.Width - 1, maxX + pad);
            maxY = Math.Min(bmp.Height - 1, maxY + pad);
            var bounds = new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
            using (var crop = bmp.Clone(bounds, PixelFormat.Format32bppArgb))
            {
                crop.Save(dest, ImageFormat.Png);
            }
        }
    }

    public static void CropFraction(string src, string dest, float x, float y, float w, float h)
    {
        using (var original = Image.FromFile(src))
        using (var bmp = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb))
        {
            using (var g = Graphics.FromImage(bmp))
            {
                g.DrawImage(original, 0, 0, original.Width, original.Height);
            }
            int cx = (int)(bmp.Width * x);
            int cy = (int)(bmp.Height * y);
            int cw = Math.Max(1, (int)(bmp.Width * w));
            int ch = Math.Max(1, (int)(bmp.Height * h));
            if (cx + cw > bmp.Width) cw = bmp.Width - cx;
            if (cy + ch > bmp.Height) ch = bmp.Height - cy;
            using (var crop = bmp.Clone(new Rectangle(cx, cy, cw, ch), PixelFormat.Format32bppArgb))
            {
                crop.Save(dest, ImageFormat.Png);
            }
        }
    }
}
