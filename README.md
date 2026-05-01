# 🚀 Pixel2Code (GIF → C for ESP32 OLED | SSD1306 / SSD1106)

Convert GIF animations into optimized C arrays for ESP32 OLED displays.  
Perfect for smooth frame-based animation on 128x64 OLED.

## 🔗 Quick Navigation

- [How It Works](#-how-it-works)
- [Features](#-features)
- [Output Example](#-output-example)
- [Usage](#-usage)
- [Live Tool](#-live-tool)
- [Notes](#-notes)

---

## ⚙️ How It Works

1. Upload a GIF  
2. Frames are extracted automatically  
3. Converted into monochrome bitmap  
4. Generates optimized C array code  
5. Ready to use in ESP32 / Arduino  

---

## ⚡ Features

- 🎞️ GIF → frame-by-frame C conversion  
- ⚡ Optimized for OLED performance  
- 📏 Auto scaling for 128x64 displays  
- 🌐 Works fully in browser (no install)  
- 🧠 Efficient memory-friendly output  

---

## 📦 Output Example

```c
const unsigned char frames[][1024] = {
  {0x00, 0xFF, 0xA5, ...},
  {0x00, 0xAA, 0x55, ...},
};
```
---

## 🌟 Support & Contribution

If you found this project useful:

- ⭐ Star the repository  
- 🍴 Fork and improve it  
- 🐛 Report issues or suggest features  

Contributions are always welcome!

---

## 🔗 Connect With Me

<p align="center">
  <a href="https://github.com/sparky390">GitHub</a> •
  <a href="https://instagram.com/sparky.fpv">Instagram</a>
</p>

---

## 💬 Feedback

Have ideas or improvements?  
Feel free to open an issue or reach out — would love to see what you build with Pixel2Code 🚀

---

<p align="center">
  Made with ❤️ by <b>Surya.S</b><br>
  ⚡ Turning pixels into code
</p>
