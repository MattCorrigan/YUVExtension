This is a chrome browser extension to render YUV files.

# Setup
1. `git clone https://github.com/MattCorrigan/YUVExtension.git`
2. Navigate to `chrome://extensions` (Make sure you have developer tools enabled in settings).
3. Click the 'Load Unpacked' button in the top-left.
4. Select the `yuvext` folder from this project.

# Testing
Running `yuv-server/run.bat` will start a static webserver on port 8000, and you can modify `yuv-server/index.html` to test this extension. 

# Documentation
This extension searches for image tags in every page you visit with the `src` attribute set to a file with one of these extensions (case-insensitive): `.yuv420nv12`, `.yuv`, `.nv12`, `.yuv420nv21`, or `.nv21`. The file with then be rendered onto a canvas element. For example, the following code will render image.yuv onto a canvas:
```
<!DOCTPYE html>
<html>
  <body>
    <img src="http://127.0.0.1:8000/image.yuv">
  </body>
</html>
```

## Attributes
A number of attributes can be added to the `img` tag to provide parameters to the extension. These attributes are listed below, along with their default values.

### 1. `width` and `height`
Width and height of the yuv image.

**Default values:** `width="2304"` and `height="1728"`, however the attribute `data-aspect-ratio` will override these values.

**Example:**
```
<img src="http://127.0.0.1:8000/image.yuv" width="900" height="600">
```

### 2. `data-aspect-ratio`
Aspect ratio of the yuv image, can be used in place of width and height. Width and height will be calculated based on file size and the provided aspect ratio.

**Default value:** No default value, will use `width` and `height` instead.

**Example:**
```
<img src="http://127.0.0.1:8000/image.yuv" data-aspect-ratio="4:3">
```

### 3. `data-nv12`
Boolean value either `true` or `false`, specifies the file type where `false` is nv21. If this attribute is not provided, the filetype will be determined by the file extension.

**Default value:** Will be `true` for .yuv, .yuv420nv12, and .nv12 files, and `false` for .yuv420nv21 and .nv21 files.

**Example:**
```
<img src="http://127.0.0.1:8000/image.yuv" data-nv12="false">
```

### 4. `data-alpha`
Integer value between 0 and 255, determines the alpha of the rendered image.

**Default value:** 255.

**Example:**
```
<img src="http://127.0.0.1:8000/image.yuv" data-alpha="100">
```

### 5. `data-orientation`
Integer value between 1 and 8, determines the exif orientation value of the image.

**Default value:** 5.

**Example:**
```
<img src="http://127.0.0.1:8000/image.yuv" data-orientation="3">
```
