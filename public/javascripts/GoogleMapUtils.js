GoogleMapUtils = function() {
};

GoogleMapUtils.TILE_SIZE_FACTOR = 0.5;
GoogleMapUtils.TILE_SIZE = 256;

GoogleMapUtils.getTileRect = function(x,y,z) {
	var tilesAtThisZoom = 1 << z;
	var lngWidth = 360.0 / tilesAtThisZoom;
	var lng = -180 + (x * lngWidth);	
	var latHeightMerc = 1.0 / tilesAtThisZoom;
	var topLatMerc = y * latHeightMerc;
	var bottomLatMerc = topLatMerc + latHeightMerc;
	var bottomLat = (180 / Math.PI) * ((2 * Math.atan(Math.exp(Math.PI * (1 - (2 * bottomLatMerc))))) - (Math.PI / 2));
	var topLat = (180 / Math.PI) * ((2 * Math.atan(Math.exp(Math.PI * (1 - (2 * topLatMerc))))) - (Math.PI / 2));
	var latHeight = topLat - bottomLat;
	return new GoogleMapUtils.Boundary(lng, bottomLat, lngWidth, latHeight);
};

GoogleMapUtils.getOffsetPixelCoords = function(lat,lng,zoom, X, Y) {
	pixelCoords = GoogleMapUtils.getPixelCoords(lat, lng, zoom);
	return new GoogleMapUtils.Point(
		pixelCoords.x - X * GoogleMapUtils.TILE_SIZE, 
		pixelCoords.y - Y * GoogleMapUtils.TILE_SIZE
	);
};

GoogleMapUtils._toNormalisedMercatorCoords = function(point) {
	point.x += 0.5;
	point.y = Math.abs(point.y-0.5);
	return point;
};

GoogleMapUtils.deg2rad = function(angle) {
    return (angle / 180) * Math.PI;
};

GoogleMapUtils.asinh = function(arg) {
    return Math.log(arg + Math.sqrt(arg * arg + 1));
};

GoogleMapUtils._toMercatorCoords = function(lat, lng) {
	if (lng > 180) {
		lng -= 360;
	}
	lng /= 360;
	lat = GoogleMapUtils.asinh(Math.tan(GoogleMapUtils.deg2rad(lat)))/Math.PI/2;
	return new GoogleMapUtils.Point(lng, lat);
};

GoogleMapUtils.getPixelCoords = function(lat, lng, zoom) {
		normalised = GoogleMapUtils._toNormalisedMercatorCoords(GoogleMapUtils._toMercatorCoords(lat, lng));
		scale = (1 << (zoom)) * GoogleMapUtils.TILE_SIZE;
		return new GoogleMapUtils.Point(
			(normalised.x * scale), 
			(normalised.y * scale)
		);
};

GoogleMapUtils.Point = function(x,y,v) {
	this.x = x;
	this.y = y;
	this.v = v;
};

GoogleMapUtils.Boundary = function(x, y, width, height) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
};

GoogleMapUtils.calcExtents = function(X,Y,Z,exactsize) {
    
	var rect = GoogleMapUtils.getTileRect(X,Y,Z);
	
    if(!exactsize) {
        extend_X = rect.width * GoogleMapUtils.TILE_SIZE_FACTOR * 5;//in decimal degrees
        extend_Y = rect.height * GoogleMapUtils.TILE_SIZE_FACTOR *  3;//in decimal degrees
    } else {
        extend_X = 0;
        extend_Y = 0;
    }
    
    swlat = rect.y - extend_Y;
    swlng = rect.x - extend_X;
    nelat = swlat + rect.height + 2 * extend_Y;
    nelng = swlng + rect.width + 2 * extend_X;
    
    return {
		swlat:swlat,
		swlng:swlng,
		nelat:nelat,
		nelng:nelng
	};
}

if(typeof exports != "undefined") exports.GoogleMapUtils = GoogleMapUtils;
