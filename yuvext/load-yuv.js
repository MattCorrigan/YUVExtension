
function resolveImage(image, imageUrl, nv12file) {
	
	var width = 0;
	var height = 0;
	var widthAspectRatio;
	var heightAspectRatio;
	var nv12 = nv12file; // by default: determine by extension, can override with 'data-nv12' attribute
	var alpha = 255;
	var orientation = 5;
	
	// required params
	if (image.hasAttribute("width") && image.hasAttribute("height")) {
		width = parseInt(image.getAttribute("width"));
		height = parseInt(image.getAttribute("height"));
	} else if (image.hasAttribute("data-aspect-ratio")) {
		// set aspect ratio variables if width and height aren't defined
		var ratio = image.getAttribute("data-aspect-ratio").split(":");
		if (ratio.length != 2) {
			return console.error("Aspect ratio must be of the form 'x:y'.");
		}
		
		if (isNaN(ratio[0]) || isNaN(ratio[1])) {
			return console.error("Aspect ratio must be two integer values.");
		}
		
		widthAspectRatio = parseInt(ratio[0]);
		heightAspectRatio = parseInt(ratio[1]);
	} else {
		// use 2304 x 1728 width and height as the default
		width = 2304;
		height = 1728;
	}
	
	// optional param
	if (image.hasAttribute("data-nv12")) {
		nv12 = image.getAttribute("data-nv12").toLowerCase() === "true";
	}
	
	// optional param, validate input between 0-255
	if (image.hasAttribute("data-alpha") && !isNaN(image.getAttribute("data-alpha"))) {
		var alpha_input = parseInt(image.getAttribute("data-alpha"));
		
		if (alpha_input >= 0 && alpha_input < 256) {
			alpha = alpha_input;
		}
	}
	
	// optional param, default orientation is 5
	if (image.hasAttribute("data-orientation")) {
		orientation = image.getAttribute("data-orientation");
		
		if (isNaN(orientation)) {
			console.error("Orientation must be an integer 1-8."); // don't return, we'll still render with default rotation
		} else {
			orientation = parseInt(orientation);
			
			// reset to default if orientation is outside of the 1-8 range
			if (orientation < 1 || orientation > 8) {
				console.error("Orientation must be an integer 1-8."); // don't return, we'll still render with default rotation
				orientation = 5;
			}
		}
		
	}
	
	// create canvas variable and replace img tag with it
	const canvas = document.createElement('canvas');
	canvas.setAttribute('data-src', imageUrl);
	image.parentElement.replaceChild(canvas, image);
	
	// request data and render on canvas
	loadYuv(imageUrl, canvas, width, height, widthAspectRatio, heightAspectRatio, orientation, nv12, alpha);
	
}

function loadYuv (url, canvas, width, height, widthAspectRatio, heightAspectRatio, orientation, nv12 = true, alpha = 255) {
	const data = { mode: 'cors' }
	const p = new Promise((resolve, reject) => {
		fetch(url, data)
			.then(response => {
				if (!response.ok) {
					throw Error('Fetch failed: status=' + response.status + ', url=' + url)
				}

				return response.arrayBuffer()
			})
			.then(buffer => {
				// determine width and height from aspect ratio if they aren't specified
				if (width == 0 && height == 0) {
					var byteLength = buffer.byteLength;
					byteLength = byteLength / 1.5;

				    width = Math.floor(Math.sqrt(widthAspectRatio * byteLength / heightAspectRatio));
					height = Math.floor(byteLength / width);
				}
				
				canvas.setAttribute('width', width)
				canvas.setAttribute('height', height)

				const ctx = canvas.getContext('2d')
				const imageData = ctx.createImageData(width, height)
				convertYuvToRgba(buffer, imageData.data, width, height, nv12, alpha)
				ctx.putImageData(imageData, 0, 0)
				
				// correct orientation on a new canvas
				const canvasCopy = document.createElement('canvas');
				canvasCopy.width = canvas.width;
				canvasCopy.height = canvas.height;
				canvasCopy.setAttribute('data-src', url);
				console.log(orientation);
				copyCanvas(canvas, canvasCopy, _orientation=orientation)
				canvas.parentElement.replaceChild(canvasCopy, canvas);

				resolve(canvas)
			})
			.catch(e => {
				drawErrorImage(canvas, width, height, 'ERROR')
				resolve()
			})
	})

	return p
}

function convertYuvToRgba (src, dst, width, height, nv12 = true, alpha = 255) {
	const chromaStart = width * height

	var uuOffset
	var vvOffset
	if (nv12) {
		uuOffset = 0
		vvOffset = 1
	} else {
		uuOffset = 1
		vvOffset = 0
	}

	const srcView = new DataView(src)
	var rgbaOffset = 0

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			// srcView offsets
			const lumaOffset = y * width + x
			const chromaOffset = Math.floor(y / 2) * width + Math.floor(x / 2) * 2 // by 2 since u and v are interleaved

			// read srcView
			const yy = srcView.getUint8(lumaOffset)
			const uu = srcView.getUint8(chromaStart + chromaOffset + uuOffset) - 128
			const vv = srcView.getUint8(chromaStart + chromaOffset + vvOffset) - 128

			// YUV to RGB
			let r = yy + 1.402 * vv
			let g = yy - 0.344 * uu - 0.714 * vv
			let b = yy + 1.772 * uu

			// clamp
			if (r < 0) r = 0; if (g < 0) g = 0
			if (b < 0) b = 0
			if (r > 255) r = 255
			if (g > 255) g = 255
			if (b > 255) b = 255

			// Write dst
			dst[rgbaOffset++] = r
			dst[rgbaOffset++] = g
			dst[rgbaOffset++] = b
			dst[rgbaOffset++] = alpha
		}
	}
}

function drawErrorImage (canvas, width, height, message, textColor = 'black', backgroundColor = 'gray', font = '200px Arial') {
	canvas.setAttribute('width', width)
	canvas.setAttribute('height', height)
	const ctx = canvas.getContext('2d')
	ctx.fillStyle = backgroundColor
	ctx.fillRect(0, 0, width, height)
	ctx.fillStyle = textColor
	ctx.font = font
	ctx.fillText(message, 0, canvas.height / 4, canvas.width)
}

function getExtension(url) {
	var filename_parts = url.split("?")[0].split(".");
	return filename_parts[filename_parts.length - 1].toLowerCase();
}

function process() {
	
	// look for yuv images in the html
	var all_images = Array.from(document.getElementsByTagName("img"));

	for (var i = 0; i < all_images.length; i++) {
		var image = all_images[i];
		if (image.hasAttribute("src") && image.getAttribute("src").length > 0) {
			
			// get file extension (case insensitive)
			var ext = getExtension(image.getAttribute("src"));
			
			var nv12;
			
			// determine default nv12/nv21 setting from file extension
			if (ext === "yuv" || ext === "yuv420nv12" || ext === "nv12") {
				nv12 = true;
			} else if (ext === "yuv420nv21" || ext === "nv21") {
				nv12 = false;
			} else {
				continue; // not a yuv image, skip
			}
				
			
			resolveImage(image, image.getAttribute("src"), nv12);
			
		}
	}
}

///////////////////////////////////////////////////////////////////////////////////
////////////////////////////////// ORIENTATION CODE ///////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

function copyCanvas (src, dst, _orientation = 1, scale = 1) {
  if (src == null || dst == null) {
    return
  }

  scale = Number(scale)

  // The source rectangle is reduced by the scale that should be done by drawImage()
  const sx = 0
  const sy = 0
  const sWidth = src.width
  const sHeight = src.height
  
  console.log(sWidth);

  // Set the dst canvas size using the larger dimension and the source aspect ratio.
  const dstMaxDim = Math.max(dst.width, dst.height)
  if (src.width >= src.height) {
    dst.width = dstMaxDim
    dst.height = dstMaxDim * src.height / src.width
  } else {
    dst.width = dstMaxDim * src.width / src.height
    dst.height = dstMaxDim
  }
  dst.width *= scale
  dst.height *= scale

  var degrees, flipX, flipY
  [degrees, flipX, flipY] = orientationTranslation(_orientation)

  // Remember the original dst size for drawImage()
  const dx = -dst.width / 2
  const dy = -dst.height / 2
  const dWidth = dst.width
  const dHeight = dst.height

  if (degrees % 180 !== 0) {
    // Swap width and height for 90 and 270 degrees.
    const tmp = dst.width
    dst.width = dst.height
    dst.height = tmp
  }

  // console.log(
  //   'src.width=' + src.width + ', src.height=' + src.height +
  //   ', dst.width=' + dst.width + ', dst.height=' + dst.height +
  //   ', orientation=' + _orientation + ', degrees=' + degrees +
  //   ', flipX=' + flipX + ', flipY=' + flipY +
  //    ', sx=' + sx + ', sy=' + sy + ', sWidth=' + sWidth + ', sHeight=' + sHeight +
  //   ', dx=' + dx + ', dy=' + dy + ', dWidth=' + dWidth + ', dHeight=' + dHeight
  // )

  var ctx = dst.getContext('2d')

  ctx.clearRect(0, 0, dst.width, dst.height)
  ctx.translate(dst.width / 2, dst.height / 2)

  // Used for flipping only, scaling done below by drawImage
  ctx.scale(flipX, flipY)

  ctx.rotate(degrees * Math.PI / 180)

  ctx.drawImage(src, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)

  ctx.resetTransform()
}

function copyCanvasViewport (src, dst, _orientation = 1, scale = 1, sx = 0, sy = 0) {
  if (src == null || dst == null) {
    return
  }

  scale = Number(scale)

  var degrees, flipX, flipY
  [degrees, flipX, flipY] = orientationTranslation(_orientation)

  if (degrees % 180 !== 0) {
    // Swap width and height for 90 and 270 degrees.
    const tmp = dst.width
    dst.width = dst.height
    dst.height = tmp
  }

  // The source rectangle is reduced by the scale that should be done by drawImage()
  sx = Number(sx) / scale
  sy = Number(sy) / scale
  const sWidth = dst.width / scale
  const sHeight = dst.height / scale

  // Remember the original dst size for drawImage()
  const dx = -dst.width / 2
  const dy = -dst.height / 2
  const dWidth = dst.width
  const dHeight = dst.height

   console.log(
     'src.width=' + src.width + ', src.height=' + src.height +
     ', dst.width=' + dst.width + ', dst.height=' + dst.height +
     ', orientation=' + _orientation + ', degrees=' + degrees +
     ', flipX=' + flipX + ', flipY=' + flipY +
     ', sx=' + sx + ', sy=' + sy + ', sWidth=' + sWidth + ', sHeight=' + sHeight +
     ', dx=' + dx + ', dy=' + dy + ', dWidth=' + dWidth + ', dHeight=' + dHeight
   )

  var ctx = dst.getContext('2d')

  ctx.clearRect(0, 0, dst.width, dst.height)
  ctx.translate(dst.width / 2, dst.height / 2)

  // Used for flipping only, scaling done below by drawImage
  ctx.scale(flipX, flipY)

  ctx.rotate(degrees * Math.PI / 180)

  ctx.drawImage(src, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)

  ctx.resetTransform()
}

// Read orientation EXIF tag from .jpg
function getOrientation (blob, callback) {
  const fileReader = new FileReader()
  fileReader.onload = function (event) {
    const view = new DataView(event.target.result)

    if (view.getUint16(0, false) !== 0xFFD8) {
      return callback(-2)
    }

    var length = view.byteLength
    var offset = 2
    while (offset < length) {
      if (view.getUint16(offset + 2, false) <= 8) {
        return callback(-1)
      }

      const marker = view.getUint16(offset, false)
      offset += 2
      if (marker === 0xFFE1) {
        if (view.getUint32(offset += 2, false) !== 0x45786966) {
          return callback(-1)
        }

        const little = view.getUint16(offset += 6, false) === 0x4949
        offset += view.getUint32(offset + 4, little)
        const tags = view.getUint16(offset, little)
        offset += 2
        for (var i = 0; i < tags; i++) {
          if (view.getUint16(offset + (i * 12), little) === 0x0112) {
            return callback(view.getUint16(offset + (i * 12) + 8, little))
          }
        }
      } else if ((marker & 0xFF00) !== 0xFF00) {
        break
      } else {
        offset += view.getUint16(offset, false)
      }
    }

    return callback(-1)
  }

  fileReader.readAsArrayBuffer(blob)
}

function orientationTranslation (_orientation) {
  _orientation = Number(_orientation)

  switch (_orientation) {
    case 1: return [0, 1, 1]
    case 2: return [0, -1, 1]

    case 3: return [180, 1, 1]
    case 4: return [0, 1, -1]

    case 5: return [90, -1, 1]
    case 6: return [90, 1, 1]

    case 7: return [270, -1, 1]
    case 8: return [270, 1, 1]

    default: throw Error('Invalid orientation=' + _orientation)
  }
}

// Given an orientation, determine the inverse-orientation that will 'undo' any rotation
function reverseOrientation (_orientation) {
  switch (_orientation) {
    case 1:
    case 2:
    case 3:
    case 4:
      return _orientation
    case 5: return 7
    case 6: return 8
    case 7: return 5
    case 8: return 6
  }
}

// start processing on page load
process();


// TODO:
/**
- *DONE* test nv21 files, test nv12 attribute true/false
- *DONE* test alpha attribute
- *DONE* add aspect ratio attribute that will be used if width and height aren't specified
- *DONE* automatically determine file type from extension, 12 for .yuv, but allow overriding with the nv12 attribute
- *DONE* make file extensions case-insensitive
- *DONE* implement rotation, might have to create a hidden canvas first and copy the rotated image onto a new canvas
- *DONE* default rotation value is 5
- *DONE* set default width x height to 2304 x 1728 if width, height, and aspect ratio are not specified
- run this process on any url that matches a yuv file, use same process as checking the src attribute
**/