# ESP-32 Pixel Matrix
![20220120_125157](https://user-images.githubusercontent.com/3353071/167358525-23218d44-c39b-4bd0-a9f9-8234161531a9.jpeg)


![2022-05-09_09-10](https://user-images.githubusercontent.com/3353071/167358409-bda87fc2-24e8-4b76-ae95-3840c33580ec.png)


## setup

### web app
- install dependencies with `npm i`
- rename `config.example.ts` file to `config.ts`
- `npm run debug` for local development
- `npm run build` to build the project

Update esp32 ip adress in `webpack.config.dev.js` to point to your esp32

You should now be able to navigate to `localhost:8080` in your browser. If the ESP32 is already setup and running you should be able to control the matrix now.

### ESP-32

The esp32 code uses [platformIO](https://platformio.org/)

- install dependencies
- wire up the esp
- take contents of `browser/dist` folder and copy into `esp32/data` directory. 
- copy data onto esp32 via platformIO `build file system image` and `upload file system image`. 

Once power is connected, the ESP32 creates a WIFI hotspot and displays the connection settings on the matrix. Connect to this network and use the WIFI portal to configure your WIFI settings. The ESP32 then reboots and trys to connect to the configured WIFI. On subsequent reboots, the matrix will show its IP address for 10 seconds before switching to its regular mode.

### wire up 

This project uses the excellent https://github.com/mrfaptastic/ESP32-HUB75-MatrixPanel-I2S-DMA library. If you are unsure how to connect, there is a nice connection guide there. 
In short: 

```
  HUB 75 PANEL         ESP 32 PIN
+----------+
|  R1  G1  |    R1  -> IO25    G1 -> IO26
|  B1  GND |    B1  -> IO27
|  R2  G2  |    R2  -> IO14    G2 -> IO12
|  B2  E   |    B2  -> IO13     E -> N/A (required for 1/32 scan panels, like 64x64. Any available pin would do, i.e. IO32 )
|   A  B   |    A   -> IO23     B -> IO19
|   C  D   |    C   -> IO05     D -> IO17
| CLK  LAT |    CLK -> IO16   LAT -> IO 4
|  OE  GND |    OE  -> IO15   GND -> ESP32 GND
+----------+
```

There is also a Gerber file located in the `hardware` folder for a simple PCB to simplify the connection.

### print the case

You can find `STL` and `STEP` files for the case inside the `hardware` folder.
The case should fit a standard 64x32 pixel p3 led matrix.
I've designed the case to use M3 threaded inserts for all screw holes. 
For power I've used a micro usb breakout board like this one: https://www.amazon.de/WayinTop-Breakout-Konverter-Netzteil-Steckbrett/dp/B07W13X3TD/ref=sr_1_3?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=3BRR55R6O73B7&keywords=usb+power+breakout&qid=1652083140&sprefix=usb+power+breakout%2Caps%2C88&sr=8-3
