function HeatMapUtils() {

}

HeatMapUtils.EMPTYPNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII%3D';

HeatMapUtils.WIDTH = 256;
HeatMapUtils.HEIGHT = 256;

HeatMapUtils.RADIUS1 = 20;
HeatMapUtils.RADIUS2 = 40;

HeatMapUtils.colorize = function(ctx,x,y,x2){
	// initial check if x and y is outside the app
	// -> resetting values
	if(x+x2>HeatMapUtils.WIDTH) x=HeatMapUtils.WIDTH-x2;
	if(x<0) x=0;
	if(y<0) y=0;
	if(y+x2>HeatMapUtils.HEIGHT) y=HeatMapUtils.HEIGHT-x2;
	// get the image data for the mouse movement area
	var image = ctx.getImageData(x,y,x2,x2),
	// some performance tweaks
	imageData = image.data,
	length = imageData.length;
	// loop thru the area
	for(var i=3; i < length; i+=4){
		var r = 0,
			g = 0,
			b = 0,
			tmp = 0,
			// [0] -> r, [1] -> g, [2] -> b, [3] -> alpha
			alpha = imageData[i];
			
		// coloring depending on the current alpha value
		if(alpha<=255 && alpha >= 235){
			tmp=255-alpha;
			r=255-tmp;
			g=tmp*12;
		}else if(alpha<=234 && alpha >= 200){
			tmp=234-alpha;
			r=255-(tmp*8);
			g=255;
		}else if(alpha<= 199 && alpha >= 150){
			tmp=199-alpha;
			g=255;
			b=tmp*5;
		}else if(alpha<= 149 && alpha >= 100){
			tmp=149-alpha;
			g=255-(tmp*5);
			b=255;
		}else
			b=255;
		// we ve started with i=3
		// set the new r, g and b values
		imageData[i-3]=r;
		imageData[i-2]=g;
		imageData[i-1]=b;
	}
	// the rgb data manipulation didn't affect the ImageData object(defined on the top)
	// after the manipulation process we have to set the manipulated data to the ImageData object
	image.data = imageData;
	ctx.putImageData(image,x,y);
};

HeatMapUtils.addHeatPointData = function(ctx, point, cbk) {
	if(!ctx) return;
	
	var x = point.x;
	var y = point.y;
	
	var rgr = ctx.createRadialGradient(x,y,HeatMapUtils.RADIUS1,x,y,HeatMapUtils.RADIUS2);
	rgr.addColorStop(0, 'rgba(0,0,0,0.1)');  
	rgr.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = rgr;  
	ctx.fillRect(x-HeatMapUtils.RADIUS2,y-HeatMapUtils.RADIUS2,2*HeatMapUtils.RADIUS2,2*HeatMapUtils.RADIUS2);
	
	HeatMapUtils.colorize(ctx, x-HeatMapUtils.RADIUS2,y-HeatMapUtils.RADIUS2,2*HeatMapUtils.RADIUS2);
};

if(typeof exports != "undefined") exports.HeatMapUtils = HeatMapUtils;
