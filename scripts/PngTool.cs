using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class PngTool6
{
    public static void KeyMagenta(string src, string dest)
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
                }
            }
            for (int i = 0; i < buf.Length; i += 4)
            {
                if (buf[i + 3] == 0)
                {
                    buf[i] = 0;
                    buf[i + 1] = 0;
                    buf[i + 2] = 0;
                }
            }
            Marshal.Copy(buf, 0, data.Scan0, bytes);
            bmp.UnlockBits(data);
            bmp.Save(dest, ImageFormat.Png);
        }
    }

    public static void CropCircle(string src, string dest, int size)
    {
        using (var original = Image.FromFile(src))
        using (var bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb))
        using (var g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.Clear(Color.Transparent);
            using (var path = new GraphicsPath())
            {
                path.AddEllipse(1, 1, size - 3, size - 3);
                g.SetClip(path);
                float scale = Math.Max((float)size / original.Width, (float)size / original.Height);
                float w = original.Width * scale;
                float h = original.Height * scale;
                float x = (size - w) / 2f;
                float y = (size - h) / 2f;
                g.DrawImage(original, x, y, w, h);
            }
            bmp.Save(dest, ImageFormat.Png);
        }
    }
}
