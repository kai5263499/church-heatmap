var exports = {};

importScripts('HeatMapUtils.js');
importScripts('GoogleMapUtils.js');

var heatmaputils = new HeatMapUtils();

self.addEventListener('message', function(e) {
	var data = e.data;
	
	switch(data.cmd) {
		case 'colorize':
			imageData = heatmaputils.colorize(data.imageData, data.x,data.y);
			self.postMessage({cmd:data.cmd,x:data.x,y:data.y,z:data.z,imagedata:imageData});
		break;
		case 'getpoint':
			point = new GoogleMapUtils.getOffsetPixelCoords(item.loc.lat,item.loc.lon,obj.z,obj.x,obj.y);
		break;	
	}
}, false);
